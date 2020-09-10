import { Danbooru } from "../../components/api/Danbooru";
import { E621 } from "../../components/api/E621";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Form } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Prompt } from "../../components/structure/Prompt";

// Avaliable icons for formatting buttons
const iconDefinitions = {
    "spacer": "&nbsp;",

    "bold": "&#x" + "f032",
    "italic": "&#x" + "f033",
    "strikethrough": "&#x" + "f0cc",
    "underscore": "&#x" + "f0cd",
    "superscript": "&#x" + "f12b",
    "subscript": "&#x" + "f12c",
    "spoiler": "&#x" + "f29e",
    "color": "&#x" + "f53f",
    "code": "&#x" + "f121",
    "heading": "&#x" + "f1dc",
    "quote": "&#x" + "f10e",
    "section": "&#x" + "f103",
    "tag": "&#x" + "f02b",

    "wiki": "&#x" + "f002",
    "keyboard": "&#x" + "f11c",
    "link": "&#x" + "f0c1",
    "unlink": "&#x" + "f127",
    "link_prompt": "&#x" + "f35d",
    "lemon": "&#x" + "f094",
    "pepper": "&#x" + "f816",
    "drumstick": "&#x" + "f6d7",
    "magic": "&#x" + "f0d0",
    "clipboard": "&#x" + "f328",
    "paperclip": "&#x" + "f0c6",
    "fountainpen": "&#x" + "f5ad",
    "comment": "&#x" + "f27a",
    "bell": "&#x" + "f0f3",

    "bullhorn": "&#x" + "f0a1",
    "heart": "&#x" + "f004",
    "plus-square": "&#x" + "f0fe",
    "minus-square": "&#x" + "f146",
    "baby": "&#x" + "f77c",
    "scales": "&#x" + "f24e",
    "chart-pie": "&#x" + "f200",
    "dice": "&#x" + "f522",
    "hotdog": "&#x" + "f80f",
    "leaf": "&#x" + "f06c",
    "paper-plane": "&#x" + "f1d8",
    "anchor": "&#x" + "f13d",
    "crown": "&#x" + "f521",
    "crow": "&#x" + "f520",
};

export class FormattingManager extends RE6Module {

    private formatters: FormattingHelper[] = [];
    private index = 0;

    public constructor() {
        super([], true);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            buttonsActive: [
                { name: "Bold", icon: "bold", text: "[b]%selection%[/b]" },
                { name: "Italic", icon: "italic", text: "[i]%selection%[/i]" },
                { name: "Strikethrough", icon: "strikethrough", text: "[s]%selection%[/s]" },
                { name: "Underscore", icon: "underscore", text: "[u]%selection%[/u]" },

                { name: "Spacer", icon: "spacer", text: "" },

                { name: "Heading", icon: "heading", text: "h2.%selection%" },
                { name: "Spoiler", icon: "spoiler", text: "[spoiler]%selection%[/spoiler]" },
                { name: "Code", icon: "code", text: "`%selection%`" },
                { name: "Quote", icon: "quote", text: "[quote]%selection%[/quote]" },
                { name: "Section", icon: "section", text: "[section=Title]%selection%[/section]" },
                { name: "Tag", icon: "tag", text: "{{%selection%}}" },
                { name: "Link", icon: "link", text: "\"%selection%\":" },
            ],
            buttonInactive: [
                { name: "Superscript", icon: "superscript", text: "[sup]%selection%[/sup]" },
                { name: "Color", icon: "color", text: "[color=]%selection%[/color]" },
                { name: "Wiki", icon: "wiki", text: "[[%selection%]]" },
                { name: "Link (Prompted)", icon: "link_prompt", text: "\"%selection%\":%prompt:Address%" },
            ],
        };
    }

    /** Creates the Formatting Helpers for appropriate textareas */
    public create(): void {
        super.create();

        $("div.dtext-previewable:has(textarea)").each((i, element) => {
            const $container = $(element);
            const newFormatter = new FormattingHelper($container, this, this.index);
            this.formatters.push(newFormatter);

            $container.on("re621:formatter:update", () => {
                this.formatters.forEach((element) => {
                    if (!element.getContainer().is(newFormatter.getContainer())) {
                        element.loadButtons();
                    }
                });
            });

            this.index++;
        });
    }

    /** Removes the module's structure */
    public destroy(): void {
        this.formatters.forEach((entry) => {
            entry.destroy();
        });
        this.formatters = [];
    }

}


class FormattingHelper {

    private parent: FormattingManager;
    private id: number;

    private $form: JQuery<HTMLElement>;
    private $container: JQuery<HTMLElement>;

    private $toggleTabs: JQuery<HTMLElement>;
    private $formatButtons: JQuery<HTMLElement>;
    private $editButtonsModal: Modal;

    private $textarea: JQuery<HTMLElement>;
    private $preview: JQuery<HTMLElement>;

    private $formatButtonsDrawer: JQuery<HTMLElement>;

    public constructor($targetContainer: JQuery<HTMLElement>, parent: FormattingManager, id: number) {
        this.parent = parent;
        this.id = id;

        this.$container = $targetContainer;

        this.createDOM();
    }

    /** Returns the formatter's container element */
    public getContainer(): JQuery<HTMLElement> {
        return this.$container;
    }

    /**
     * Builds basic structure for the module
     */
    private createDOM(): void {
        /* === Basic Structure === */
        this.$container.attr("data-editing", "true");
        this.$container.attr("data-drawer", "false");

        this.$form = this.$container.parents("form.simple_form").first();
        this.$textarea = this.$container.find("textarea");
        this.$preview = this.$container.find<HTMLElement>("div.dtext-preview");

        this.createToolbar();
        this.createButtonDrawer();
        this.createCharacterCounter();

        this.$form.find("input.dtext-preview-button").css("display", "none");
        this.$form.find("input[type=submit]").addClass("dtext-submit");

        // Add Styling
        this.$form.addClass("formatting-helper");
        this.$textarea.attr({ "rows": "0", "cols": "0" }).addClass("border-foreground");
        this.$preview.addClass("border-foreground color-text");

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
        const $editButtonsForm = new Form(
            { name: "dtext-edit-button-" + this.id, columns: 2, width: 2 },
            [
                Form.input({ name: "name", label: "Name", width: 2 }),
                Form.icon({ name: "icon", label: "Icon", width: 2 }, iconDefinitions),
                Form.input({ name: "text", label: "Content", width: 2 }),

                Form.button(
                    { name: "delete", value: "Delete" },
                    async () => {
                        this.deleteButton(this.$editButtonsModal.getActiveTrigger().parent());
                        this.$editButtonsModal.close();
                    }
                ),
                Form.button({ name: "update", value: "Update", type: "submit" }),

                Form.hr(2),

                Form.div({ value: "Available variables:", width: 2 }),
                Form.copy({ label: "Selection", value: "%selection%", width: 2 }),
                Form.copy({ label: "Prompt", value: "%prompt%", width: 2 }),
            ],
            async (values) => {
                this.updateButton(
                    this.$editButtonsModal.getActiveTrigger().parent(),
                    {
                        name: values["name"],
                        icon: values["icon"],
                        text: values["text"],
                    }
                );
                this.$editButtonsModal.close();
            });

        this.$editButtonsModal = new Modal({
            title: "Edit Button",
            content: Form.placeholder(),
            structure: $editButtonsForm,
            triggers: [],
            triggerMulti: true,
            fixed: true,
            disabled: true,
        });

        this.$editButtonsModal.getElement().on("dialogopen", () => {
            const $button = this.$editButtonsModal.getActiveTrigger().parent();
            const $updateTabInputs = $editButtonsForm.getInputList();

            $updateTabInputs.get("name").val($button.attr("data-name"));
            $updateTabInputs.get("icon").val($button.attr("data-icon")).trigger("re621:form:update");
            $updateTabInputs.get("text").val($button.attr("data-text"));
        });

        // Fill the Toolbar Buttons
        this.loadButtons();
    }

    /** Makes an effort to reset the interface to default */
    public destroy(): void {
        this.$container
            .find(".comment-header, .dtext-button-drawer-title, .dtext-button-drawer, .dtext-character-counter-box")
            .remove();
        this.$form.find("input.dtext-preview-button").css("display", "");
    }

    /** Creates the toolbar DOM structure */
    private createToolbar(): void {
        const $bar = $("<div>")
            .addClass("comment-header")
            .addClass("border-foreground")
            .prependTo(this.$container);

        // - Editing State Tabs
        this.$toggleTabs = $("<div>")
            .addClass("comment-tabs")
            .html(`
                <a class="toggle-editing active">Write</a>
                <a class="toggle-preview">Preview</a>
            `)
            .appendTo($bar);

        this.$toggleTabs.find("a").click(e => {
            e.preventDefault();
            this.toggleEditing();
        });

        // - Formatting Buttons Bar
        this.$formatButtons = $("<div>").addClass("comment-buttons").appendTo($bar);

        // - Drawer Toggle Button
        const $drawerButtonBox = $("<li>")
            .appendTo($("<div>").addClass("settings-buttons").appendTo($bar));
        $("<a>")
            .html("&#x" + "f1de")
            .attr("title", "Settings")
            .appendTo($drawerButtonBox)
            .click(event => {
                event.preventDefault();
                this.toggleButtonDrawer();
            });
    }

    /** Creates the button drawer structure */
    private createButtonDrawer(): void {
        // - Drawer Header
        const $newFormatButton = $("<a>")
            .html("Add Button");

        $("<div>")
            .addClass("dtext-button-drawer-title")
            .addClass("border-foreground color-text")
            .append($newFormatButton)
            .appendTo(this.$container);

        // - New Button Process
        const newFormatForm = new Form(
            { name: "dtext-custom-button-" + this.id, columns: 2, width: 2 },
            [
                Form.input({ name: "name", label: "Name", width: 2 }),
                Form.icon({ name: "icon", label: "Icon", width: 2 }, iconDefinitions),
                Form.input({ name: "text", label: "Content", width: 2 }),

                Form.spacer(),
                Form.button({ name: "submit", value: "Create", type: "submit" }),

                Form.hr(2),

                Form.div({ value: "Available variables:", width: 2 }),
                Form.copy({ label: "Selection", value: "%selection%", width: 2 }),
                Form.copy({ label: "Prompt", value: "%prompt%", width: 2 }),
            ],
            (values) => {
                const buttonData = this.createButton({
                    name: values["name"],
                    icon: values["icon"],
                    text: values["text"],
                });
                buttonData.box.appendTo(this.$formatButtonsDrawer);

                newFormatForm.reset();
                newFormatModal.close();
                this.saveButtons();
            }
        );

        const newFormatModal = new Modal({
            title: "New Custom Button",
            content: Form.placeholder(),
            structure: newFormatForm,
            triggers: [{ element: $newFormatButton }],
            fixed: true,
        });

        // - Drawer Container Element
        this.$formatButtonsDrawer = $("<div>")
            .addClass("dtext-button-drawer")
            .addClass("border-foreground color-text")
            .appendTo(this.$container);

        // - Elements themselves are added when the user opens the drawer
    }

    /** Creates the character counter  */
    private createCharacterCounter(): void {
        const charCounter = $("<span>")
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
    public loadButtons(): void {
        this.$formatButtons.empty();

        this.parent.fetchSettings("buttonsActive", true).then((response) => {
            response.forEach((data: ButtonDefinition) => {
                const buttonElement = this.createButton(data);
                buttonElement.box.appendTo(this.$formatButtons);

                if (buttonElement.box.attr("data-text") === "") {
                    buttonElement.button.addClass("disabled");
                    buttonElement.button.removeAttr("title");
                }
            });
        });

        this.$formatButtonsDrawer.empty();
        this.parent.fetchSettings("buttonInactive", true).then((response) => {
            response.forEach((data: ButtonDefinition) => {
                const buttonData = this.createButton(data);
                buttonData.box.appendTo(this.$formatButtonsDrawer);
            });
        });
    }

    /** Re-indexes and saves the toolbar configuration */
    private async saveButtons(): Promise<void> {
        let buttonData: ButtonDefinition[] = [];
        this.$formatButtons.find("li").each(function (i, element) {
            buttonData.push(fetchData(element));
        });
        await this.parent.pushSettings("buttonsActive", buttonData);

        buttonData = [];
        this.$formatButtonsDrawer.find("li").each(function (i, element) {
            buttonData.push(fetchData(element));
        });
        await this.parent.pushSettings("buttonInactive", buttonData);

        this.$container.trigger("re621:formatter:update", [this]);

        function fetchData(element: HTMLElement): ButtonDefinition {
            const $button = $(element);
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
    private parseButtonConfig(config: ButtonDefinition): ButtonDefinition {
        if (config.name === undefined) config.name = "New Button";
        if (config.icon === undefined) config.icon = "#";
        if (config.text === undefined) config.text = "";

        return config;
    }

    /**
     * Creates a new element based on provided definition
     * @param config Button definition
     */
    private createButton(config: ButtonDefinition): ButtonElement {
        config = this.parseButtonConfig(config);
        const box = $("<li>")
            .attr({
                "data-name": config.name,
                "data-icon": config.icon,
                "data-text": config.text,
            })
            .appendTo(this.$formatButtons);
        const button = $("<a>")
            .html(this.getIcon(config.icon))
            .addClass("format-button")
            .attr("title", config.name)
            .appendTo(box);

        this.$editButtonsModal.registerTrigger({ element: button });
        button.click(event => {
            event.preventDefault();
            if (this.$container.attr("data-drawer") === "false") {
                this.processFormattingTag(box.attr("data-text"));
            }
        });

        return { button: button, box: box };
    }

    /**
     * Update the specified button with the corresponding configuration
     * @param $element LI element of the button to update
     * @param config New configuration
     */
    private updateButton($element: JQuery<HTMLElement>, config: ButtonDefinition): void {
        config = this.parseButtonConfig(config);
        $element
            .attr("data-name", config.name)
            .attr("data-icon", config.icon)
            .attr("data-text", config.text);
        $element.find("a").first()
            .html(this.getIcon(config.icon))
            .attr("title", config.name);
        this.saveButtons();
    }

    /**
     * Remove the specified button
     * @param $element LI element of the tab
     */
    private deleteButton($element: JQuery<HTMLElement>): void {
        $element.remove();
        this.saveButtons();
    }

    /**
     * Toggles the comment form from editing to preview
     */
    private toggleEditing(): void {
        if (this.$container.attr("data-editing") === "true") {
            this.$container.attr("data-editing", "false");
            this.$toggleTabs.find("a").toggleClass("active");

            // format the text
            E621.DTextPreview.post({ "body": this.$textarea.val() }).then((response) => {
                this.$preview.html(response[0].html);
                Danbooru.E621.addDeferredPosts(response[0].posts);
                Danbooru.Thumbnails.initialize();
            });

        } else {
            this.$container.attr("data-editing", "true");
            this.$toggleTabs.find("a").toggleClass("active");
        }
    }

    /**
     * Toggles the settings box
     */
    private toggleButtonDrawer(): void {
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
     * Provided with a valid icon name, returns its character value
     * @param name Icon name
     */
    private getIcon(name: string): string {
        // TODO Fix this
        return iconDefinitions[name] || "";
    }

    /**
     * Adds the provided tag text to the textarea
     * @param content Tag text (i.e. "[b]%selection%[/b]")
     */
    private processFormattingTag(content: string): void {
        const promises = [];

        const lookup = content.match(/%prompt[:]?[^%]*?(%|$)/g);
        const replacedTags = [];

        if (lookup !== null) {
            lookup.forEach(function (element) {
                const title = element.replace(/(%$)|(^%prompt[:]?)/g, "");
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
            const currentText = this.$textarea.val() + "";
            const position = {
                start: this.$textarea.prop('selectionStart'),
                end: this.$textarea.prop('selectionEnd')
            };

            content = content.replace(/%selection%/g, currentText.substring(position.start, position.end));

            this.$textarea.focus();

            // This is a workaround for a Firefox bug, which existed since 2015
            // Check https://bugzilla.mozilla.org/show_bug.cgi?id=1220696 for more information
            // For the time being, we'll just have to nuke the undo history on Firefox.
            if (!document.execCommand("insertText", false, content)) {
                this.$textarea.val(currentText.substring(0, position.start) + content + currentText.substring(position.end, currentText.length));
            }

            this.$textarea.prop("selectionStart", position.start);
            this.$textarea.prop("selectionEnd", position.start + content.length);

            this.$textarea.keyup();
        });
    }

}

interface ButtonElement {
    button: JQuery<HTMLElement>;
    box: JQuery<HTMLElement>;
}

interface ButtonDefinition {
    name: string;
    icon: string;
    text: string;
}
