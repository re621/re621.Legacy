import { Danbooru, DTextButton } from "../../components/api/Danbooru";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Form } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Prompt } from "../../components/structure/Prompt";
import { Util } from "../../components/utility/Util";

// Available icons for formatting buttons
const iconDefinitions = {
    "spacer": null,

    "bold": "f032",
    "italic": "f033",
    "strikethrough": "f0cc",
    "underscore": "f0cd",
    "superscript": "f12b",
    "subscript": "f12c",
    "spoiler": "f070",
    "color": "f53f",
    "code": "f121",
    "heading": "f1dc",
    "quote": "f10e",
    "section": "f103",
    "tag": "f02b",

    "wiki": "f002",
    "keyboard": "f11c",
    "link": "f0c1",
    "unlink": "f127",
    "link_prompt": "f35d",
    "lemon": "f094",
    "pepper": "f816",
    "drumstick": "f6d7",
    "magic": "f0d0",
    "clipboard": "f328",
    "paperclip": "f0c6",
    "fountainpen": "f5ad",
    "comment": "f27a",
    "bell": "f0f3",

    "bullhorn": "f0a1",
    "heart": "f004",
    "plus-square": "f0fe",
    "minus-square": "f146",
    "baby": "f77c",
    "scales": "f24e",
    "chart-pie": "f200",
    "dice": "f522",
    "hotdog": "f80f",
    "leaf": "f06c",
    "paper-plane": "f1d8",
    "anchor": "f13d",
    "crown": "f521",
    "crow": "f520",
};

export class FormattingExtender extends RE6Module {

    public constructor() {
        super([], true, false, [], "FormattingHelper");
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

                { name: "Spacer", icon: "spacer", text: "" },

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

        Danbooru.DText.override_formatting(this.processFormattingTag);

        for (const wrapper of $(".dtext-formatter").get())
            new Formatter(this, $(wrapper));
        this.regenerateButtons();
    }

    public regenerateButtons(): void {
        const dtextButtons: DTextButton[] = [];
        for (const button of this.fetchSettings<ButtonDefinition[]>("buttonsActive"))
            dtextButtons.push(ButtonDefinition.toEsixButton(button));
        Danbooru.DText.buttons = dtextButtons;
        this.reloadButtonToolbar();
    }

    public reloadButtonToolbar(): void {
        const e = document.createEvent('HTMLEvents');
        e.initEvent("e621:reload", true, true);
        for (const element of $(".dtext-formatter").get())
            element.dispatchEvent(e);
    }

    /**
     * Adds the provided tag text to the textarea
     * @param content Tag text (i.e. "[b]%selection%[/b]")
     * @param input Textarea
     */
    private processFormattingTag(content: string, input: JQuery<HTMLInputElement>): void {

        // Prevent formatting tag insertion when the drawer is open
        if (input.attr("paused") == "true") return;

        const promises = [];

        const lookup = content.match(/%prompt[:]?[^%]*?(%|$)/g);
        const replacedTags = [];

        if (lookup !== null) {
            // Has to be reversed first, in order to present prompts
            // in the correct order. This way, the LAST prompt is
            // layered at the bottom, and FIRST is at the very top.
            lookup.reverse().forEach((element) => {
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
            const currentText = input.val() + "";
            const position = {
                start: input.prop('selectionStart'),
                end: input.prop('selectionEnd')
            };

            const offset = {
                start: content.indexOf("%selection%"),
                end: content.length - (content.indexOf("%selection%") + 11),
            };

            content = content.replace(/%selection%/g, currentText.substring(position.start, position.end));

            input.trigger("focus");

            // This is a workaround for a Firefox bug (prior to version 89)
            // Check https://bugzilla.mozilla.org/show_bug.cgi?id=1220696 for more information
            if (!document.execCommand("insertText", false, content)) {
                input.val(currentText.substring(0, position.start) + content + currentText.substring(position.end, currentText.length));
            }

            input.prop("selectionStart", position.start + offset.start);
            input.prop("selectionEnd", position.start + content.length - offset.end);

            input.trigger("focus");
        });
    }
}

class Formatter {

    private module: FormattingExtender;

    private id: string;

    private wrapper: JQuery<HTMLElement>;       // element that contains the formatter UI
    private bdrawer: JQuery<HTMLElement>;       // button drawer with inactive buttons
    private toolbar: JQuery<HTMLElement>;       // toolbar with active buttons

    private editForm: Modal;
    private makeForm: Modal;

    constructor(module: FormattingExtender, element: JQuery<HTMLElement>) {

        this.module = module;
        this.wrapper = element;

        // Ensure that the wrapper has a unique ID
        this.id = this.wrapper.attr("id");
        if (!this.id) {
            this.id = "formatter-" + Util.ID.make();
            this.wrapper.attr("id", this.id);
        }

        // Set up the drawer state attribute
        this.wrapper.attr("data-drawer", "false");

        // Create the DOM structure
        this.bootstrapEditForm();
        this.bootstrapCreateForm();

        this.extendButtonToolbar();
        this.createButtonDrawer();

        this.setupSorting();
    }

    private extendButtonToolbar(): void {
        this.toolbar = this.wrapper.find("div.dtext-formatter-buttons").first();

        this.wrapper.on("e621:reload", () => {

            // Re-index the active button toolbar
            const settings = this.module.fetchSettings<ButtonDefinition[]>("buttonsActive"),
                children = this.toolbar.children().get();
            for (let index = 0; index < settings.length; index++) {
                const element = $(children[index]);
                this.editForm.registerTrigger({ element: element });
                element.data("button", settings[index]);
            }
        });
    }

    /** Creates the button drawer structure */
    private createButtonDrawer(): void {
        // - Drawer Header
        const header = $("<div>")
            .addClass("dtext-formatter-customizer color-text")
            .appendTo(this.wrapper);

        $("<a>")
            .html("&#x" + "f0c9")
            .addClass("dtext-formatter-opendrawer")
            .attr({ "title": "Customize Buttons" })
            .appendTo(header)
            .on("click", (event) => {
                event.preventDefault();
                this.wrapper.trigger("re621:formatter.toggle");
            });

        const addButton = $("<a>")
            .html("&#x" + "f067")
            .addClass("dtext-formatter-addbutton")
            .attr({ "title": "Add Custom Button" })
            .appendTo(header);
        this.makeForm.registerTrigger({ element: addButton });

        // Set up the button drawer;
        this.bdrawer = $("<div>")
            .addClass("dtext-formatter-drawer color-text")
            .appendTo(this.wrapper);

        // Bootstrap modals
        this.bootstrapEditForm();

        // Regenerate the structure on reload
        this.wrapper.on("e621:reload", () => {

            // Redraw the inactive button drawer
            this.bdrawer.html("");
            for (const button of this.module.fetchSettings<ButtonDefinition[]>("buttonInactive")) {
                const icon = ButtonDefinition.getIcon(button.icon);
                if (!icon) {
                    $("<span>")
                        .appendTo(this.bdrawer)
                        .data("button", button);
                    continue;
                }
                const element = $("<a>")
                    .html("&#x" + icon)
                    .attr({
                        "title": button.name,
                        "role": "button",
                    })
                    .data("button", button)
                    .appendTo(this.bdrawer);

                this.editForm.registerTrigger({ element: element });
            }
        });

        // Create toggling events
        const input = this.wrapper.find("textarea").first();

        this.wrapper.on("re621:formatter.disable", () => {
            this.wrapper.attr("data-drawer", "false");
            input.attr("paused", "false");

            this.bdrawer.sortable("disable");
            this.toolbar.sortable("disable");

            this.editForm.disable();
        });

        this.wrapper.on("re621:formatter.toggle", () => {
            const enable = this.wrapper.attr("data-drawer") == "false";
            $(".dtext-formatter").trigger("re621:formatter.disable");

            if (enable) {
                this.wrapper.attr("data-drawer", "true");
                input.attr("paused", "true");

                this.bdrawer.sortable("enable");
                this.toolbar.sortable("enable");

                this.editForm.enable();
            }
        });
    }

    private bootstrapEditForm(): any {

        this.editForm = null;

        // Create the Button Editing Modal
        const $editButtonsForm = new Form(
            { name: "dtext-edit-button-" + this.id, columns: 2, width: 2 },
            [
                Form.input({ name: "name", label: "Name", width: 2 }),
                Form.icon({ name: "icon", label: "Icon", width: 2 }, iconDefinitions),
                Form.textarea({ name: "text", label: "Content", width: 2 }),

                Form.button(
                    { name: "delete", value: "Delete" },
                    async () => {
                        this.deleteButton(this.editForm.getActiveTrigger());
                        this.editForm.close();
                    }
                ),
                Form.button({ name: "update", value: "Update", type: "submit" }),

                Form.hr(2),

                Form.div({ value: "Available variables:", width: 2 }),
                Form.copy({ label: "Selection", value: "%selection%", width: 2 }),
                Form.copy({ label: "Prompt", value: "%prompt:Input Name%", width: 2 }),
            ],
            async (values) => {
                console.log("updating button", values);
                this.updateButton(
                    this.editForm.getActiveTrigger(),
                    {
                        name: values["name"],
                        icon: values["icon"],
                        text: values["text"],
                    }
                );
                this.editForm.close();
            });

        this.editForm = new Modal({
            title: "Edit Button",
            content: Form.placeholder(),
            structure: $editButtonsForm,
            triggers: [],
            triggerMulti: true,
            fixed: true,
            disabled: true,
        });

        this.editForm.getElement().on("dialogopen", () => {
            const $button = this.editForm.getActiveTrigger(),
                buttonData = $button.data("button") as ButtonDefinition;
            const $updateTabInputs = $editButtonsForm.getInputList();

            $updateTabInputs.get("name").val(buttonData.name);
            $updateTabInputs.get("icon").val(buttonData.icon).trigger("re621:form:update");
            $updateTabInputs.get("text").val(buttonData.text);
        });
    }

    private bootstrapCreateForm(): void {

        // - New Button Process
        const newFormatForm = new Form(
            { name: "dtext-custom-button-" + this.id, columns: 2, width: 2 },
            [
                Form.input({ name: "name", label: "Name", width: 2 }),
                Form.icon({ name: "icon", label: "Icon", width: 2 }, iconDefinitions),
                Form.textarea({ name: "text", label: "Content", width: 2 }),

                Form.spacer(),
                Form.button({ name: "submit", value: "Create", type: "submit" }),

                Form.hr(2),

                Form.div({ value: "Available variables:", width: 2 }),
                Form.copy({ label: "Selection", value: "%selection%", width: 2 }),
                Form.copy({ label: "Prompt", value: "%prompt:Input Name%", width: 2 }),
            ],
            (values) => {
                console.log(values);
                this.createButton({
                    name: values["name"],
                    icon: values["icon"],
                    text: values["text"],
                });

                newFormatForm.reset();
                this.makeForm.close();
            }
        );

        this.makeForm = new Modal({
            title: "New Custom Button",
            content: Form.placeholder(),
            structure: newFormatForm,
            triggers: [],
            fixed: true,
        });
    }

    private setupSorting(): void {
        this.toolbar.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: this.wrapper,
            connectWith: this.bdrawer,

            disabled: true,

            update: () => {
                this.saveButtons();
            },
        });

        this.bdrawer.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: this.wrapper,
            connectWith: this.toolbar,

            disabled: true,
        });
    }

    private async saveButtons(): Promise<void> {
        const active = this.toolbar.children().get(),
            inactive = this.bdrawer.children().get();

        const activeData: ButtonDefinition[] = [],
            inactiveData: ButtonDefinition[] = [];

        for (const button of active) {
            const data = $(button).data("button");
            if (!data) continue;
            activeData.push(data);
        }

        for (const button of inactive) {
            const data = $(button).data("button");
            if (!data) continue;
            inactiveData.push(data);
        }

        console.log({
            "buttonsActive": activeData,
            "buttonInactive": inactiveData,
        });

        await this.module.pushSettings({
            "buttonsActive": activeData,
            "buttonInactive": inactiveData,
        });

        this.module.regenerateButtons();
    }

    /**
     * Creates a new element based on provided definition
     * @param config Button definition
     */
    private async createButton(config: ButtonDefinition): Promise<void> {
        config = ButtonDefinition.validate(config);
        const inactiveButtons = this.module.fetchSettings<ButtonDefinition[]>("buttonInactive");
        inactiveButtons.push(config);
        await this.module.pushSettings("buttonInactive", inactiveButtons);
        this.module.regenerateButtons();
    }

    private deleteButton($element: JQuery<HTMLElement>): void {
        $element.remove();
        this.saveButtons();
    }

    /**
     * Update the specified button with the corresponding configuration
     * @param $element element of the button to update
     * @param config new configuration
     */
    private updateButton($element: JQuery<HTMLElement>, config: ButtonDefinition): void {
        config = ButtonDefinition.validate(config);
        $element.data("button", config);
        console.log($element, config);
        this.saveButtons();
    }
}


type ButtonDefinition = {
    name: string;
    icon: string;
    text: string;
}

namespace ButtonDefinition {
    export function toEsixButton(value: ButtonDefinition): DTextButton {
        const icon = ButtonDefinition.getIcon(value.icon);
        if (!icon) return null;
        return {
            icon: icon,
            title: value.name,
            content: value.text,
        }
    }

    /**
     * Provided with a valid icon name, returns its character value
     * @param name Icon name
     */
    export function getIcon(name: string): string {
        return iconDefinitions[name] || null;
    }

    export function validate(value: ButtonDefinition): ButtonDefinition {
        if (value.name === undefined) value.name = "New Button";
        if (value.icon === undefined) value.icon = "crow";
        if (value.text === undefined) value.text = "";

        return value;
    }
}
