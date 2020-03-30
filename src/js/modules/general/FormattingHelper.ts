import { RE6Module, Settings } from "../../components/RE6Module";
import { Prompt } from "../../components/structure/Prompt";
import { Modal } from "../../components/structure/Modal";
import { Form } from "../../components/structure/Form";
import { Hotkeys } from "../../components/data/Hotkeys";
import { Api } from "../../components/api/Api";

// Avaliable icons for formatting buttons
const iconDefinitions = [
    { value: "spacer", name: "&nbsp;" },

    { value: "bold", name: "&#x" + "f032" },
    { value: "italic", name: "&#x" + "f033" },
    { value: "strikethrough", name: "&#x" + "f0cc" },
    { value: "underscore", name: "&#x" + "f0cd" },
    { value: "superscript", name: "&#x" + "f12b" },
    { value: "subscript", name: "&#x" + "f12c" },
    { value: "spoiler", name: "&#x" + "f29e" },

    { value: "color", name: "&#x" + "f53f" },
    { value: "code", name: "&#x" + "f121" },
    { value: "heading", name: "&#x" + "f1dc" },
    { value: "quote", name: "&#x" + "f10e" },
    { value: "section", name: "&#x" + "f103" },
    { value: "tag", name: "&#x" + "f02b" },
    { value: "wiki", name: "&#x" + "f002" },
    { value: "keyboard", name: "&#x" + "f11c" },

    { value: "link", name: "&#x" + "f0c1" },
    { value: "unlink", name: "&#x" + "f127" },
    { value: "link_prompt", name: "&#x" + "f35d" },
    { value: "lemon", name: "&#x" + "f094" },
    { value: "pepper", name: "&#x" + "f816" },
    { value: "drumstick", name: "&#x" + "f6d7" },
    { value: "magic", name: "&#x" + "f0d0" },
    { value: "clipboard", name: "&#x" + "f328" },

    { value: "paperclip", name: "&#x" + "f0c6" },
    { value: "fountainpen", name: "&#x" + "f5ad" },
    { value: "comment", name: "&#x" + "f27a" },
    { value: "bell", name: "&#x" + "f0f3" },
    { value: "bullhorn", name: "&#x" + "f0a1" },
    { value: "heart", name: "&#x" + "f004" },
    { value: "plus-square", name: "&#x" + "f0fe" },
    { value: "minus-square", name: "&#x" + "f146" },
];

export class FormattingManager extends RE6Module {

    private formatters: FormattingHelper[] = [];

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

                { name: "Spacer", icon: "spacer", text: "%spacer%" },

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
            hotkeySubmit: "alt+return",
            hotkeySubmitActive: true,
        };
    }

    /** Creates the Formatting Helpers for appropriate textareas */
    public create(): void {
        $("div.dtext-previewable:has(textarea)").each((i, element) => {
            const $container = $(element);
            const newFormatter = new FormattingHelper($container, this);
            this.formatters.push(newFormatter);

            $container.on("re621:formatter:update", () => {
                this.formatters.forEach((element) => {
                    if (!element.getContainer().is(newFormatter.getContainer())) {
                        element.loadButtons();
                    }
                });
            });
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

    private $form: JQuery<HTMLElement>;
    private $container: JQuery<HTMLElement>;

    private $toggleTabs: JQuery<HTMLElement>;
    private $formatButtons: JQuery<HTMLElement>;
    private $editButtonsModal: Modal;

    private $textarea: JQuery<HTMLElement>;
    private $preview: JQuery<HTMLElement>;

    private $formatButtonsDrawer: JQuery<HTMLElement>;

    public constructor($targetContainer: JQuery<HTMLElement>, parent: FormattingManager) {
        this.parent = parent;
        this.$container = $targetContainer;

        this.createDOM();

        this.$form.submit((event) => {
            if (this.$textarea.val() === "") {
                event.preventDefault();
                this.$container.addClass("invalid");
            }
        });

        this.registerHotkeys();
    }

    /** Registers the module's hotkeys */
    public registerHotkeys(): void {
        Hotkeys.registerInput(this.parent.fetchSettings("hotkeySubmit"), this.$textarea, () => {
            if (!this.parent.fetchSettings("hotkeySubmitActive")) return;
            this.$form.submit();
        });
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

        this.$form = this.$container.parent().parent();
        this.$textarea = this.$container.find("textarea");
        this.$preview = this.$container.find("div.dtext-preview");

        this.createToolbar();
        this.createButtonDrawer();
        this.createCharacterCounter();

        this.$form.find("input.dtext-preview-button").css("display", "none");

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
            { id: "dtext-edit-button", parent: "re-modal-container", },
            [
                { id: "name", type: "input", label: "Name", },
                { id: "icon", type: "icon", label: "Icon", data: iconDefinitions, },
                { id: "text", type: "input", label: "Content", },
                { id: "delete", type: "button", value: "Delete", },
                { id: "update", type: "submit", value: "Update", },
                { id: "hr", type: "hr" },
                { id: "vartext", type: "div", value: "Available variables:" },
                { id: "var-select", label: "Selected text", value: "%selection%", type: "copy" },
                { id: "var-prompt", label: "Prompt for input", value: "%prompt%", type: "copy" },
            ]);

        this.$editButtonsModal = new Modal({
            title: "Edit Button",
            content: $editButtonsForm.get(),
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

        $editButtonsForm.get().on("re621:form:submit", (event, data) => {
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
            this.deleteButton(this.$editButtonsModal.getActiveTrigger().parent());
            this.$editButtonsModal.close();
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
        const $bar = $("<div>").addClass("comment-header").prependTo(this.$container);

        // - Editing State Tabs
        this.$toggleTabs = $("<div>")
            .addClass("comment-tabs")
            .appendTo($bar);
        $("<a>")
            .html("Write")
            .addClass("toggle-editing")
            .addClass("active")
            .appendTo(this.$toggleTabs);
        $("<a>")
            .html("Preview")
            .addClass("toggle-preview")
            .appendTo(this.$toggleTabs);

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
            .append($newFormatButton)
            .appendTo(this.$container);

        // - New Button Process
        const newFormatForm = new Form(
            { id: "dtext-custom-button", parent: "re-modal-container", },
            [
                { id: "name", type: "input", label: "Name", },
                { id: "icon", type: "icon", label: "Icon", data: iconDefinitions, },
                { id: "text", type: "input", label: "Content", },
                { id: "create", type: "submit", value: "Create", stretch: "column", },
                { id: "hr", type: "hr" },
                { id: "vartext", type: "div", value: "Available variables:" },
                { id: "var-select", label: "Selected text", value: "%selection%", type: "copy" },
                { id: "var-prompt", label: "Prompt for input", value: "%prompt%", type: "copy" },
            ]);

        const newFormatModal = new Modal({
            title: "New Custom Button",
            content: newFormatForm.get(),
            triggers: [{ element: $newFormatButton }],
            fixed: true,
        });

        newFormatForm.get().on("re621:form:submit", (event, data) => {
            event.preventDefault();
            const buttonData = this.createButton({
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

        this.parent.fetchSettings("buttonsActive", true).forEach((data: ButtonDefinition) => {
            const buttonElement = this.createButton(data);
            buttonElement.box.appendTo(this.$formatButtons);

            if (buttonElement.button.attr("data-text") === "%spacer%") {
                buttonElement.button.addClass("disabled");
                buttonElement.button.removeAttr("title");
            }
        });

        this.$formatButtonsDrawer.empty();
        this.parent.fetchSettings("buttonInactive", true).forEach((data: ButtonDefinition) => {
            const buttonData = this.createButton(data);
            buttonData.box.appendTo(this.$formatButtonsDrawer);
        });
    }

    /** Re-indexes and saves the toolbar configuration */
    private saveButtons(): void {
        let buttonData: ButtonDefinition[] = [];
        this.$formatButtons.find("li").each(function (i, element) {
            buttonData.push(fetchData(element));
        });
        this.parent.pushSettings("buttonsActive", buttonData);

        buttonData = [];
        this.$formatButtonsDrawer.find("li").each(function (i, element) {
            buttonData.push(fetchData(element));
        });
        this.parent.pushSettings("buttonInactive", buttonData);

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
            this.formatDText(this.$textarea.val(), async (data) => {
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
        for (const icon of iconDefinitions) {
            if (icon.value === name) { return icon.name; }
        }
        return "";
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
    private async formatDText(input: string | string[] | number, handleData: (data: any) => void): Promise<void> {
        const response = await Api.postUrl(
            "/dtext_preview",
            { body: input }
        );
        handleData(JSON.parse(response));
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
