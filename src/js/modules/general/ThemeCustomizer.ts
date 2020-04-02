/* Theme Customizer
 * Creates and manages a more customizable theme manager
 */

import { Modal } from "../../components/structure/Modal";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Form } from "../../components/structure/Form";
import { DomUtilities } from "../../components/structure/DomUtilities";

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
const NAVBAR_POS = [
    { value: "top", name: "Top" },
    { value: "bottom", name: "Bottom" },
    { value: "none", name: "None" },
];

/**
 * ThemeCustomizer  
 * Built upon e621 Redesign Fixes, this module adds the ability to change and adjust themes
 */
export class ThemeCustomizer extends RE6Module {

    private themeCustomizerForm: Form;

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
            nav: "top",
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
        const openCustomizerButton = DomUtilities.addSettingsButton({
            name: `<i class="fas fa-paint-brush"></i>`,
        });

        // === Establish the settings window contents
        this.themeCustomizerForm = new Form(
            {
                "id": "theme-customizer",
                "parent": "div#modal-container"
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
                    value: this.fetchSettings("unscaling"),
                },
                {
                    id: "nav",
                    type: "select",
                    label: "Post Navbar",
                    data: NAVBAR_POS,
                    value: this.fetchSettings("nav"),
                }
            ]
        );

        // === Create the modal
        new Modal({
            title: "Themes",
            triggers: [{ element: openCustomizerButton }],
            content: this.themeCustomizerForm.get(),
            position: { my: "right top", at: "right top" }
        });

        // === Establish Listeners
        this.handleThemeSwitcher("main");
        this.handleThemeSwitcher("extra");
        this.handleScalingToggle();
        this.handleThemeSwitcher("nav");
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
