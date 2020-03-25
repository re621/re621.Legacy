import { RE6Module } from "../../components/RE6Module";
import { Prompt } from "../../components/structure/Prompt";
import { Modal } from "../../components/structure/Modal";
import { Form } from "../../components/structure/Form";

const icon_definitions = {
    bold: "&#x" + "f032",
    italic: "&#x" + "f033",
    strikethrough: "&#x" + "f0cc",
    underscore: "&#x" + "f0cd",

    spacer: "&nbsp;",

    superscript: "&#x" + "f12b",
    spoiler: "&#x" + "f20a",
    color: "&#x" + "f53f",
    code: "&#x" + "f121",
    heading: "&#x" + "f1dc",
    quote: "&#x" + "f10e",
    section: "&#x" + "f103",
    tag: "&#x" + "f02b",
    wiki: "&#x" + "f002",
    link: "&#x" + "f0c1",
    link_prompt: "&#x" + "f35d",
}

export class FormattingHelper extends RE6Module {

    private $container: JQuery<HTMLElement>;

    private $toggleTabs: JQuery<HTMLElement>;
    private $formatButtons: JQuery<HTMLElement>;
    private $editButtonsModal: Modal;

    private $textarea: JQuery<HTMLElement>;
    private $preview: JQuery<HTMLElement>;

    private $formatButtonsDrawer: JQuery<HTMLElement>;

    private constructor($targetContainer) {
        super();

        this.$container = $targetContainer;

        this.createDOM();
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings() {
        return {
            "btn_active": [
                { name: "Bold", icon: "bold", text: "[b]%selection%[/b]" },
                { name: "Italic", icon: "italic", text: "[i]%selection%[/i]" },
                { name: "Strikethrough", icon: "strikethrough", text: "[s]%selection%[/s]" },
                { name: "Underscore", icon: "underscore", text: "[u]%selection%[/u]" },

                { name: "Spacer", icon: "spacer", text: "%spacer%" },

                { name: "Heading", icon: "heading", text: "h2.%selection%" },
                { name: "Spoiler", icon: "spoiler", text: "[spoiler]%selection%[/spoiler]" },
                { name: "Code", icon: "code", text: "`%selection%`" },
                { name: "Quote", icon: "quote", text: "[quote]%selection%[/quote]" },
                { name: "Section", icon: "section", text: "[section=Title]%selection%[/section]" },
                { name: "Tag", icon: "tag", text: "{{%selection%}}" },
                { name: "Link", icon: "link", text: "\"%selection%\":" },
            ],
            "btn_inactive": [
                { name: "Superscript", icon: "superscript", text: "[sup]%selection%[/sup]" },
                { name: "Color", icon: "color", text: "[color=]%selection%[/color]" },
                { name: "Wiki", icon: "wiki", text: "[[%selection%]]" },
                { name: "Link (Prompted)", icon: "link_prompt", text: "\"%selection%\":%prompt:Address%" },
            ],
        };
    }

    public static init() {
        let instances: FormattingHelper[] = [];
        $("div.dtext-previewable:has(textarea)").each(function (i, element) {
            let $container = $(element);
            let thisInstance = new FormattingHelper($container);
            instances.push(thisInstance);

            $container.on("re621:formatter:update", () => {
                instances.forEach(formatter => {
                    if (!formatter.$container.is(thisInstance.$container)) {
                        formatter.loadButtons();
                    }
                })
            });
        });

        $("input.dtext-preview-button").remove();
    }

    /**
     * Builds basic structure for the module
     */
    private createDOM() {
        /* === Basic Structure === */
        this.$container.attr("data-editing", "true");
        this.$container.attr("data-drawer", "false");

        this.$textarea = this.$container.find("textarea");
        this.$preview = this.$container.find("div.dtext-preview");

        this.createToolbar();
        this.createButtonDrawer();
        this.createCharacterCounter();

        // Establish Sorting
        this.$formatButtons.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: this.$container,
            connectWith: this.$formatButtonsDrawer,

            disabled: true,

            update: () => { this.saveButtons(); },
        });

        this.$formatButtonsDrawer.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: this.$container,
            connectWith: this.$formatButtons,

            disabled: true,
        });

        // Create the Button Editing Modal
        let $editButtonsForm = new Form(
            { id: "dtext-edit-button", parent: "re-modal-container", },
            [
                { id: "name", type: "input", label: "Name", },
                { id: "icon", type: "input", label: "Icon", },
                { id: "text", type: "input", label: "Content", },
                { id: "delete", type: "button", value: "Delete", },
                { id: "update", type: "submit", value: "Update", },
            ]);

        this.$editButtonsModal = new Modal({
            title: "Edit Button",
            content: $editButtonsForm.get(),
            triggers: [],
            triggerMulti: true,
            fixed: true,
            disabled: true,
        });

        this.$editButtonsModal.getElement().on("dialogopen", (event, modal) => {
            let $button = this.$editButtonsModal.getActiveTrigger().parent();
            let $updateTabInputs = $editButtonsForm.getInputList();

            $updateTabInputs.get("name").val($button.attr("data-name"));
            $updateTabInputs.get("icon").val($button.attr("data-icon"));
            $updateTabInputs.get("text").val($button.attr("data-text"));
        });

        $editButtonsForm.get().on("re-form:submit", (event, data) => {
            event.preventDefault();
            this.updateButton(
                this.$editButtonsModal.getActiveTrigger().parent(),
                {
                    name: data.get("name"),
                    icon: data.get("icon"),
                    text: data.get("text"),
                }
            );
            this.$editButtonsModal.close();
        });

        $editButtonsForm.getInputList().get("delete").click(event => {
            event.preventDefault();
            this.deleteButton(this.$editButtonsModal.getActiveTrigger().parent())
            this.$editButtonsModal.close();
        });

        // Fill the Toolbar Buttons
        this.loadButtons();
    }

    /** Creates the toolbar DOM structure */
    private createToolbar() {
        let $bar = $("<div>").addClass("comment-header").prependTo(this.$container);

        // - Editing State Tabs
        this.$toggleTabs = $("<div>")
            .addClass("comment-tabs")
            .appendTo($bar);
        $("<a>")
            .html("Write")
            .attr("href", "#")
            .addClass("toggle-editing")
            .addClass("active")
            .appendTo(this.$toggleTabs);
        $("<a>")
            .html("Preview")
            .attr("href", "#")
            .addClass("toggle-preview")
            .appendTo(this.$toggleTabs);

        this.$toggleTabs.find("a").click(e => {
            e.preventDefault();
            this.toggleEditing();
        });

        // - Formatting Buttons Bar
        this.$formatButtons = $("<div>").addClass("comment-buttons").appendTo($bar);

        // - Drawer Toggle Button
        let $drawerButtonBox = $("<li>")
            .appendTo($("<div>").addClass("settings-buttons").appendTo($bar));
        $("<a>")
            .html("&#x" + "f1de")
            .attr("href", "#")
            .attr("title", "Settings")
            .appendTo($drawerButtonBox)
            .click(event => {
                event.preventDefault();
                this.toggleButtonDrawer();
            });
    }

    /** Creates the button drawer structure */
    private createButtonDrawer() {
        // - Drawer Header
        let $newFormatButton = $("<a>")
            .attr("href", "#")
            .html("Add Button");

        $("<div>")
            .addClass("dtext-button-drawer-title")
            .append($newFormatButton)
            .appendTo(this.$container);

        // - New Button Process
        let newFormatForm = new Form(
            { id: "dtext-custom-button", parent: "re-modal-container", },
            [
                { id: "name", type: "input", label: "Name", },
                { id: "icon", type: "input", label: "Icon", },
                { id: "text", type: "input", label: "Content", },
                { id: "create", type: "submit", value: "Create", stretch: "column", }
            ]);

        let newFormatModal = new Modal({
            title: "New Custom Button",
            content: newFormatForm.get(),
            triggers: [{ element: $newFormatButton }],
            fixed: true,
        });

        newFormatForm.get().on("re-form:submit", (event, data) => {
            event.preventDefault();
            let buttonData = this.createButton({
                name: data.get("name"),
                icon: data.get("icon"),
                text: data.get("text"),
            });
            buttonData.box.appendTo(this.$formatButtonsDrawer);

            newFormatForm.reset();
            newFormatModal.close();
            this.saveButtons();
        });

        // - Drawer Container Element
        this.$formatButtonsDrawer = $("<div>").addClass("dtext-button-drawer").appendTo(this.$container);

        // - Elements themselves are added when the user opens the drawer
    }

    /** Creates the character counter  */
    private createCharacterCounter() {
        let charCounter = $("<span>")
            .addClass("char-counter")
            .html((this.$textarea.val() + "").length + " / 50000");
        $("<div>")
            .addClass("dtext-character-counter-box")
            .append(charCounter)
            .appendTo(this.$container);

        this.$textarea.keyup(() => {
            charCounter.html((this.$textarea.val() + "").length + " / 50000");
        });
    }

    /** Updates the buttons toolbar based on saved settings */
    private loadButtons() {
        this.$formatButtons.empty();

        this.fetchSettings("btn_active", true).forEach((data: ButtonDefinition) => {
            let buttonElement = this.createButton(data);
            buttonElement.box.appendTo(this.$formatButtons);

            if (buttonElement.button.attr("data-text") === "%spacer%") {
                buttonElement.button.addClass("disabled");
                buttonElement.button.removeAttr("title");
            }
        });

        this.$formatButtonsDrawer.empty();
        this.fetchSettings("btn_inactive", true).forEach((data: ButtonDefinition) => {
            let buttonData = this.createButton(data);
            buttonData.box.appendTo(this.$formatButtonsDrawer);
        });
    }

    /** Re-indexes and saves the toolbar configuration */
    private saveButtons() {
        let buttonData: ButtonDefinition[] = [];
        this.$formatButtons.find("li").each(function (i, element) {
            buttonData.push(fetchData(element));
        });
        this.pushSettings("btn_active", buttonData);

        buttonData = [];
        this.$formatButtonsDrawer.find("li").each(function (i, element) {
            buttonData.push(fetchData(element));
        })
        this.pushSettings("btn_inactive", buttonData);

        this.$container.trigger("re621:formatter:update", [this]);

        function fetchData(element: HTMLElement): ButtonDefinition {
            let $button = $(element);
            return {
                name: $button.attr("data-name"),
                icon: $button.attr("data-icon"),
                text: $button.attr("data-text"),
            };
        }
    }

    /**
     * Parses the provided configuration file for missing values
     * @param config Configuration to process
     */
    private parseButtonConfig(config: ButtonDefinition) {
        if (config.name === undefined) config.name = "New Button";
        if (config.icon === undefined) config.icon = "#";
        if (config.text === undefined) config.text = "";

        return config;
    }

    /**
     * Creates a new element based on provided definition
     * @param config Button definition
     */
    private createButton(config: ButtonDefinition) {
        config = this.parseButtonConfig(config);
        let box = $("<li>")
            .attr({
                "data-name": config.name,
                "data-icon": config.icon,
                "data-text": config.text,
            })
            .appendTo(this.$formatButtons);
        let button = $(`<a href="">`)
            .html(icon_definitions[config.icon])
            .addClass("format-button")
            .attr("title", config.name)
            .appendTo(box);

        this.$editButtonsModal.registerTrigger({ element: button });
        button.click(event => {
            event.preventDefault();
            if (this.$container.attr("data-drawer") === "false") {
                this.processFormattingTag(config.text);
            }
        });

        return { button: button, box: box };
    }

    /**
     * Update the specified button with the corresponding configuration
     * @param $element LI element of the button to update
     * @param config New configuration
     */
    private updateButton($element: JQuery<HTMLElement>, config: ButtonDefinition) {
        config = this.parseButtonConfig(config);
        $element
            .attr("data-name", config.name)
            .attr("data-icon", config.icon)
            .attr("data-text", config.text);
        $element.find("a").first()
            .html(icon_definitions[config.icon])
            .attr("title", config.name);
        this.saveButtons();
    }

    /**
     * Remove the specified button
     * @param $element LI element of the tab
     */
    private deleteButton($element: JQuery<HTMLElement>) {
        $element.remove();
        this.saveButtons();
    }

    /**
     * Toggles the comment form from editing to preview
     */
    private toggleEditing() {
        if (this.$container.attr("data-editing") === "true") {
            this.$container.attr("data-editing", "false");
            this.$toggleTabs.find("a").toggleClass("active");

            // format the text
            this.formatDText(this.$textarea.val(), data => {
                this.$preview.html(data.html);
            });
        } else {
            this.$container.attr("data-editing", "true");
            this.$toggleTabs.find("a").toggleClass("active");
        }
    }

    /**
     * Toggles the settings box
     */
    private toggleButtonDrawer() {
        if (this.$container.attr("data-drawer") === "true") {
            this.$container.attr("data-drawer", "false");

            this.$formatButtons.sortable("disable");
            this.$formatButtonsDrawer.sortable("disable");

            this.$editButtonsModal.disable();
        } else {
            this.$container.attr("data-drawer", "true");

            this.$formatButtons.sortable("enable");
            this.$formatButtonsDrawer.sortable("enable");

            this.$editButtonsModal.enable();
        }
    }

    /**
     * Adds the provided tag text to the textarea
     * @param content Tag text (i.e. "[b]%selection%[/b]")
     */
    private processFormattingTag(content: string) {
        let promises = [];

        let lookup = content.match(/%prompt[:]?[^%]*?(%|$)/g);
        let replacedTags = [];

        if (lookup !== null) {
            lookup.forEach(function (element) {
                let title = element.replace(/(%$)|(^%prompt[:]?)/g, "");
                replacedTags.push(element);
                promises.push(new Prompt(title).getPromise());
            });
        }

        Promise.all(promises).then(data => {
            // Handle the %prompt% tag
            replacedTags.forEach(function (tag, index) {
                content = content.replace(tag, data[index]);
            });

            // Handle the %selection% tag
            let currentText = this.$textarea.val() + "";
            let position = {
                start: this.$textarea.prop('selectionStart'),
                end: this.$textarea.prop('selectionEnd')
            };

            content = content.replace(/%selection%/g, currentText.substring(position.start, position.end));
            this.$textarea.val(
                currentText.substring(0, position.start)
                + content
                + currentText.substring(position.end, currentText.length)
            );
            this.$textarea.keyup();
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
            success: data => {
                handleData(data);
            }
        });
    }
}

interface ButtonDefinition {
    name: string,
    icon: string,
    text: string,
}
