/* Theme Customizer
 * Creates and manages a more customizable theme manager
 */

import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../../components/structure/Modal";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Form } from "../../components/structure/Form";

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

    private themeCustomizerForm: Form;

    private constructor() {
        super();
    }

    /**
     * Returns a singleton instance of the SettingsController
     * @returns ThemeCustomizer instance
     */
    public static getInstance(): ThemeCustomizer {
        if (this.instance == undefined) this.instance = new ThemeCustomizer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            main: "hexagon",
            extra: "hexagons",
            unscaling: false,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        if (!this.canInitialize()) return;
        super.create();

        // === Create a button in the header
        const addTabButton = HeaderCustomizer.getInstance().createTabElement({
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
                    id: "main",
                    type: "select",
                    label: "Theme",
                    data: THEME_MAIN,
                    value: this.fetchSettings("main"),
                },
                {
                    id: "extra",
                    type: "select",
                    label: "Extras",
                    data: THEME_EXTRA,
                    value: this.fetchSettings("extra"),
                },
                {
                    id: "unscaling",
                    type: "checkbox",
                    label: "Disable Scaling",
                    value: this.fetchSettings("unscaling")
                }
            ]
        );

        // === Create the modal
        new Modal({
            title: "Themes",
            triggers: [{ element: addTabButton.link }],
            content: this.themeCustomizerForm.get(),
            position: { my: "right top", at: "right top" }
        });

        // === Establish Listeners
        this.handleThemeSwitcher("main");
        this.handleThemeSwitcher("extra");
        this.handleScalingToggle();
    }

    /** Listens to the theme selectors and sets the appropriate theming */
    private handleThemeSwitcher(selector: string): void {
        const theme = this.fetchSettings(selector),
            input = this.themeCustomizerForm.getInputList().get(selector);

        $("body").attr("data-th-" + selector, theme);
        input.val(theme);

        input.change(element => {
            const theme = $(element.target).val() + "";
            this.pushSettings(selector, theme);
            $("body").attr("data-th-" + selector, theme);
        });
    }

    /** Disables page's min-width scaling */
    private handleScalingToggle(): void {
        const unscaling = this.fetchSettings("unscaling");

        if (unscaling) { $("body").css("max-width", "unset"); }
        $("#theme-scaling").prop("checked", unscaling);

        this.themeCustomizerForm.getInputList().get("unscaling").change(element => {
            const disableScaling = $(element.target).is(":checked");
            this.pushSettings("unscaling", disableScaling);
            if (disableScaling) { $("body").css("max-width", "unset"); }
            else { $("body").css("max-width", ""); }
        });
    }
}
