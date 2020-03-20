import { RE6Module } from "../components/RE6Module";
import { Prompt } from "../components/Prompt";

const button_definitions = {
    bold: { icon: "&#xf032", title: "Bold", content: "[b]%selection%[/b]" },
    italic: { icon: "&#xf033", title: `Italic`, content: "[i]%selection%[/i]" },
    strikethrough: { icon: "&#xf0cc", title: `Strikethrough`, content: "[s]%selection%[/s]" },
    underscore: { icon: "&#x" + "f0cd", title: "Underscore", content: "[u]%selection%[/u]" },

    spacer: { icon: "&nbsp;", title: "Spacer", content: "%spacer%" },

    superscript: { icon: "&#x" + "f12b", title: "Superscript", content: "[sup]%selection%[/sup]" },
    spoiler: { icon: "&#x" + "f20a", title: "Spoiler", content: "[spoiler]%selection%[/spoiler]" },
    color: { icon: "&#x" + "f53f", title: "Color", content: "[color=]%selection%[/color]" },
    code: { icon: "&#x" + "f121", title: "Code", content: "`%selection%`" },
    heading: { icon: "&#x" + "f1dc", title: "Heading", content: "h2.%selection%" },
    quote: { icon: "&#x" + "f10e", title: "Quote", content: "[quote]%selection%[/quote]" },
    section: { icon: "&#x" + "f103", title: "Section", content: "[section=Title]%selection%[/section]" },
    tag: { icon: "&#x" + "f02b", title: "Tag", content: "{{%selection%}}" },
    wiki: { icon: "&#x" + "f002", title: "Wiki", content: "[[%selection%]]" },
    link: { icon: "&#x" + "f0c1", title: "Link", content: "\"%selection%\":" },
    link_prompt: { icon: "&#x" + "f35d", title: "Link (Prompted)", content: "\"%selection%\":%prompt:Address%" },
}

export class FormattingHelper extends RE6Module {

    private $container: JQuery<HTMLElement>;

    private $toggleTabs: JQuery<HTMLElement>;
    private $toggleEditing: JQuery<HTMLElement>;
    private $togglePreview: JQuery<HTMLElement>;

    private $formatButtons: JQuery<HTMLElement>;
    private $settingsButton: JQuery<HTMLElement>;

    private $textarea: JQuery<HTMLElement>;
    private $preview: JQuery<HTMLElement>;

    private $formatButtonsDrawer: JQuery<HTMLElement>;

    private constructor($targetContainer) {
        super();
        let _self = this;

        this.$container = $targetContainer;

        this.createDOM();

        this.$toggleTabs.find("a").click(function (e) {
            e.preventDefault();
            _self.toggleEditing();
        });

        this.$settingsButton.click(function (e) {
            e.preventDefault();
            _self.toggleButtonDrawer();
        });
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings() {
        return {
            "buttons": [
                "bold",
                "italic",
                "strikethrough",
                "underscore",

                "spacer",

                "code",
                "quote",
                "heading",
                "section",
                "spoiler",
                "link",
            ]
        };
    }

    public static init() {
        let instances = [];
        $("div.dtext-previewable:has(textarea)").each(function (index, element) {
            let $container = $(element);
            instances.push(new FormattingHelper($container));

            $container.on("formatting-helper:update", function (event, subject) {
                instances.forEach(function (value) {
                    value.updateButtons();
                })
            });
        });

        $("input.dtext-preview-button").remove();   // TODO Remove only buttons corresponding to the elements
    }

    /**
     * Builds basic structure for the module
     */
    private createDOM() {
        let _self = this;

        this.$container.attr("data-editing", "true");
        this.$container.attr("data-drawer", "false");

        this.$textarea = this.$container.find("textarea");
        this.$preview = this.$container.find("div.dtext-preview");

        let $bar = $("<div>").addClass("comment-header").prependTo(this.$container);

        this.$toggleTabs = $("<div>")
            .addClass("comment-tabs")
            .appendTo($bar);
        this.$toggleEditing = $(`<a href="">`)
            .html("Write")
            .addClass("toggle-editing")
            .addClass("active")
            .appendTo(this.$toggleTabs);
        this.$togglePreview = $(`<a href="">`)
            .html("Preview")
            .addClass("toggle-preview")
            .appendTo(this.$toggleTabs);

        this.$formatButtons = $("<div>").addClass("comment-buttons").appendTo($bar);

        this.updateButtons();

        let $settingsButtonBox = $("<div>").addClass("settings-buttons").appendTo($bar);

        let $settingsButtonLi = $("<li>").appendTo($settingsButtonBox);
        this.$settingsButton = $(`<a href="">`)
            .html("&#x" + "f1de")
            .attr("title", "Settings")
            .appendTo($settingsButtonLi);

        $("<div>")
            .html(`<i class="fas fa-angle-double-left"></i> Drag to the toolbar`)
            .addClass("dtext-button-drawer-title")
            .appendTo(this.$container);

        this.$formatButtonsDrawer = $("<div>").addClass("dtext-button-drawer").appendTo(this.$container);

        this.$formatButtons.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: this.$container,
            connectWith: this.$formatButtonsDrawer,

            disabled: true,

            update: function () { _self.handleToolbarUpdate(); },
        });

        this.$formatButtonsDrawer.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: this.$container,
            connectWith: this.$formatButtons,

            disabled: true,
        });

    }

    /**
     * Updates the buttons toolbar based on saved settings
     */
    private updateButtons() {
        let _self = this;
        let buttonList = [];
        this.$formatButtons.html("");

        this.fetchSettings("buttons", true).forEach(function (value) {
            let buttonData = _self.createButton(value);
            buttonData.box.appendTo(_self.$formatButtons);

            if (buttonData.button.attr("data-content") === "%spacer%") {
                buttonData.button.addClass("disabled");
                buttonData.button.removeAttr("title");
            }
            buttonList.push(buttonData.button);
        });

        let allButtons = $.map(buttonList, function (el) { return el.get(); });
        $(allButtons).click(function (e) {
            e.preventDefault();
            _self.processFormattingTag($(e.currentTarget).attr("data-name"));
        });
    }

    /**
     * Creates an element for the specified pre-built button
     * @param name Button name
     */
    private createButton(name: string) {
        let button_data = button_definitions[name];

        let box = $("<li>").appendTo(this.$formatButtons);
        let button = $(`<a href="">`)
            .html(button_data.icon)
            .attr("title", button_data.title)
            .attr("data-content", button_data.content)
            .attr("data-name", name)
            .appendTo(box);

        return { button: button, box: box };
    }

    /**
     * Toggles the comment form from editing to preview
     */
    private toggleEditing() {
        let _self = this;
        if (this.$container.attr("data-editing") === "true") {
            this.$container.attr("data-editing", "false");
            this.$toggleEditing.removeClass("active");
            this.$togglePreview.addClass("active");

            // format the text
            this.$textarea.val();
            this.formatDText(this.$textarea.val(), function (data) {
                _self.$preview.html(data.html);
            });
        } else {
            this.$container.attr("data-editing", "true");
            this.$toggleEditing.addClass("active");
            this.$togglePreview.removeClass("active");
        }
    }

    /**
     * Toggles the settings box
     */
    private toggleButtonDrawer() {
        let _self = this;
        if (this.$container.attr("data-drawer") === "true") {
            this.$container.attr("data-drawer", "false");

            this.$formatButtons.sortable("disable");
            this.$formatButtonsDrawer.sortable("disable");
        } else {
            this.$container.attr("data-drawer", "true");

            this.$formatButtonsDrawer.html("");
            var missingButtons = $.grep(Object.keys(button_definitions), function (el) { return $.inArray(el, _self.fetchSettings("buttons")) == -1 });
            missingButtons.forEach(function (value) {
                let buttonData = _self.createButton(value);
                buttonData.box.appendTo(_self.$formatButtonsDrawer);
            });

            this.$formatButtons.sortable("enable");
            this.$formatButtonsDrawer.sortable("enable");
        }
    }

    /**
     * Re-indexes and saves the toolbar configuration
     */
    private handleToolbarUpdate() {
        let buttonData = [];
        this.$formatButtons.find("li > a").each(function (index, element) {
            buttonData.push($(element).attr("data-name"));
        });
        this.pushSettings("buttons", buttonData);
        this.$container.trigger("formatting-helper:update", [this]);
    }

    /**
     * Adds the specified tag to the textarea
     * @param tag Tag to add
     */
    private processFormattingTag(tag: string) {
        let _self = this;

        let tagData = button_definitions[tag];
        let promises = [];

        let lookup = tagData.content.match(/%prompt[:]?[^%]*?(%|$)/g);
        let replacedTags = [];

        if (lookup !== null) {
            lookup.forEach(function (element) {
                let title = element.replace(/(%$)|(^%prompt[:]?)/g, "");
                replacedTags.push(element);
                promises.push(new Prompt(title).getPromise());
            });
        }

        Promise.all(promises).then(function (data) {
            let content = tagData.content;

            // Handle the %prompt% tag
            replacedTags.forEach(function (tag, index) {
                content = content.replace(tag, data[index]);
            });

            // Handle the %selection% tag
            let currentText = _self.$textarea.val() + "";
            let position = {
                start: _self.$textarea.prop('selectionStart'),
                end: _self.$textarea.prop('selectionEnd')
            };

            content = content.replace(/%selection%/g, currentText.substring(position.start, position.end));
            _self.$textarea.val(
                currentText.substring(0, position.start)
                + content
                + currentText.substring(position.end, currentText.length)
            );
        });
    }

    /**
     * Formats the provided DText string into HTML
     * @param input string
     * @param handleData Callback function
     */
    private formatDText(input: string | string[] | number, handleData: any) {
        $.ajax({
            type: "post",
            url: "/dtext_preview",
            dataType: "json",
            data: {
                body: input
            },
            success: function (data) {
                handleData(data);
            }
        });
    }
}
