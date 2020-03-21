/* Theme Customizer
 * Creates and manages a more customizable theme manager
 */

import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../components/Modal";
import { RE6Module } from "../components/RE6Module";
import { Form } from "../utilities/Form";

declare var Cookies;

const THEME_MAIN = [
    { value: "hexagon", name: "Hexagon" },
    { value: "pony", name: "Pony" },
    { value: "bloodlust", name: "Bloodlust" },
    { value: "serpent", name: "Serpent" },
    { value: "hotdog", name: "Hotdog" },
];
const THEME_EXTRA = [
    { value: "none", name: "None" },
    { value: "autumn", name: "Autumn" },
    { value: "winter", name: "Winter" },
    { value: "spring", name: "Spring" },
    { value: "aurora", name: "Aurora" },
    { value: "hexagons", name: "Hexagons" },
    { value: "space", name: "Space" },
    { value: "stars", name: "Stars" },
];

/**
 * ThemeCustomizer  
 * Built upon e621 Redesign Fixes, this module adds the ability to change and adjust themes
 */
export class ThemeCustomizer extends RE6Module {

    private static instance: ThemeCustomizer;

    private themeCustomizerModal: Modal;
    private themeCustomizerForm: Form;

    private constructor() {
        super();

        this.createDOM();

        this.handleThemeSwitcher("th-main");
        this.handleThemeSwitcher("th-extra");
        this.handleScalingToggle();
    }

    /**
     * Returns a singleton instance of the SettingsController
     * @returns ThemeCustomizer instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new ThemeCustomizer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "th-main": "hexagon",
            "th-extra": "hexagons",
            "unscaling": false,
        };
    }

    /**
     * Builds basic structure for the module
     */
    private createDOM() {
        // === Create a button in the header
        let addTabButton = HeaderCustomizer.getInstance().createTabElement({
            name: `<i class="fas fa-paint-brush"></i>`,
            parent: "menu.extra",
            controls: false,
        });

        // === Establish the settings window contents
        this.themeCustomizerForm = new Form(
            {
                "id": "theme-customizer",
                "parent": "re-modal-container"
            },
            [
                {
                    "id": "th-main",
                    "type": "select",
                    "label": "Theme",
                    "select": THEME_MAIN,
                    "value": this.fetchSettings("th-main"),
                },
                {
                    "id": "th-extra",
                    "type": "select",
                    "label": "Extras",
                    "select": THEME_EXTRA,
                    "value": this.fetchSettings("th-extra"),
                },
                {
                    "id": "unscaling",
                    "type": "checkbox",
                    "label": "Disable Scaling",
                    "value": this.fetchSettings("unscaling")
                }
            ]
        );

        // === Create the modal
        this.themeCustomizerModal = new Modal({
            uid: "theme-customizer-modal",
            title: "Themes",
            width: "15rem",
            height: "auto",
            position: {
                right: "0",
                top: "4.5rem",
            },
            triggers: [{ element: addTabButton.link }],
            content: [{ name: "re621", page: this.themeCustomizerForm.get() }],
        });
    }

    private handleThemeSwitcher(selector: string) {
        let _self = this;
        let theme = this.fetchSettings(selector);

        $("body").attr("data-" + selector, theme);
        $("#" + selector + "-selector").val(theme);

        this.themeCustomizerForm.getInputList().get(selector).change(function (event) {
            let theme = $(this).val() + "";
            _self.pushSettings(selector, theme);
            $("body").attr("data-" + selector, theme);
        });
    }

    private handleScalingToggle() {
        let _self = this;
        let unscaling = this.fetchSettings("unscaling");

        if (unscaling) { $("body").css("max-width", "unset"); }
        $("#theme-scaling").prop("checked", unscaling);

        this.themeCustomizerForm.getInputList().get("unscaling").change(function (event) {
            let disable_scaling = $(this).is(":checked");
            _self.pushSettings("unscaling", disable_scaling);
            if (disable_scaling) { $("body").css("max-width", "unset"); }
            else { $("body").css("max-width", ""); }
        });
    }
}
