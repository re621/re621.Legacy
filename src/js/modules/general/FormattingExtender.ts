import { Danbooru, DTextButton } from "../../components/api/Danbooru";
import { RE6Module, Settings } from "../../components/RE6Module";
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
            this.extendFormatter($(wrapper));
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

    private extendFormatter(wrapper: JQuery<HTMLElement>): void {
        let id = wrapper.attr("id");
        if (!id) {
            id = "formatter-" + Util.ID.make();
            wrapper.attr("id", id);
        }

        wrapper.attr("data-drawer", "false");
        this.createButtonDrawer(wrapper);
    }

    /** Creates the button drawer structure */
    private createButtonDrawer(wrapper: JQuery<HTMLElement>): void {
        // - Drawer Header
        const header = $("<div>")
            .addClass("dtext-formatter-customizer color-text")
            .appendTo(wrapper);

        $("<a>")
            .html("&#x" + "f0c9")
            .appendTo(header)
            .on("click", (event) => {
                event.preventDefault();
                console.log("toggling 1");
                wrapper.trigger("re621:formatter.toggle");
            });

        // Set up the button drawer
        const formatDrawer = $("<div>")
            .addClass("dtext-formatter-drawer color-text")
            .html("placeholder text")
            .appendTo(wrapper);

        wrapper.on("e621:reload", () => {
            console.log("reloading");

            // Reindex the active button toolbar
            const settings = this.fetchSettings<ButtonDefinition[]>("buttonsActive"),
                children = formatButtons.children().get();
            console.log("found", children.length, "children");
            for (let index = 0; index < settings.length; index++) {
                $(children[index]).data("button", settings[index]);
            }

            // Redraw the inactive button drawer
            formatDrawer.html("");
            for (const button of this.fetchSettings<ButtonDefinition[]>("buttonInactive")) {
                const icon = ButtonDefinition.getIcon(button.icon);
                if (!icon) {
                    $("<span>")
                        .appendTo(formatDrawer)
                        .data("button", button);
                    continue;
                }
                $("<a>")
                    .html("&#x" + icon)
                    .attr({
                        "title": button.name,
                        "role": "button",
                    })
                    .data("button", button)
                    .appendTo(formatDrawer);
            }
        });

        // Establish Sorting
        const formatButtons = wrapper.find("div.dtext-formatter-buttons").first();
        formatButtons.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: wrapper,
            connectWith: formatDrawer,

            disabled: true,

            update: () => {
                this.saveButtons(formatButtons, formatDrawer);
            },
        });

        formatDrawer.sortable({
            helper: "clone",
            forceHelperSize: true,
            cursor: "grabbing",
            containment: wrapper,
            connectWith: formatButtons,

            disabled: true,
        });

        // Create toggling events
        wrapper.on("re621:formatter.disable", () => {
            wrapper.attr("data-drawer", "false");

            formatButtons.sortable("disable");
            formatDrawer.sortable("disable");
        });

        wrapper.on("re621:formatter.toggle", () => {
            const enable = wrapper.attr("data-drawer") == "false";
            $(".dtext-formatter").trigger("re621:formatter.disable");

            console.log("toggling", enable, wrapper.attr("data-drawer"));

            if (enable) {
                wrapper.attr("data-drawer", "true");

                formatButtons.sortable("enable");
                formatDrawer.sortable("enable");
            }
        });

        // Prevent formatting button clicks when the drawer is open
        wrapper.on("click", ".dtext-formatter-buttons a", (event) => {
            console.log("click", wrapper.attr("data-drawer"));
            if (wrapper.attr("data-drawer")) {
                event.preventDefault();
                return false;
            }
        })
    }

    private async saveButtons(buttons: JQuery<HTMLElement>, drawer: JQuery<HTMLElement>): Promise<void> {
        const active = buttons.children().get(),
            inactive = drawer.children().get();

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

        console.log(activeData, inactiveData);
        await this.pushSettings({
            "buttonsActive": activeData,
            "buttonInactive": inactiveData,
        });

        this.regenerateButtons();
    }

    /**
     * Adds the provided tag text to the textarea
     * @param content Tag text (i.e. "[b]%selection%[/b]")
     * @param input Textarea
     */
    private processFormattingTag(content: string, input: JQuery<HTMLInputElement>): void {
        const promises = [];

        const lookup = content.match(/%prompt[:]?[^%]*?(%|$)/g);
        const replacedTags = [];

        if (lookup !== null) {
            // Has to be reversed first, in order to present prompts
            // in the correct order. This way, the LAST prompt is
            // layered at the bottom, and FIRST is at the very top.
            lookup.reverse().forEach((element) => {
                const title = element.replace(/(%$)|(^%prompt[:]?)/g, "");
                console.log("running", title);
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
}
