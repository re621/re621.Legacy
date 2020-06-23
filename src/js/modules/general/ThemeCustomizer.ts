import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Form } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";

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
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        // === Set the saved themes
        // Done by the site itself, as well as in the DomUtilities

        // === Create a button in the header
        const openCustomizerButton = DomUtilities.addSettingsButton({
            id: "header-button-theme",
            name: `<i class="fas fa-paint-brush"></i>`,
            title: "Change Theme",
        });

        // === Establish the settings window contents
        this.themeCustomizerForm = new Form({ "id": "theme-customizer", "parent": "div#modal-container" }, [
            Form.select(
                "main", window.localStorage.getItem("theme") || "hexagon", "Theme",
                [
                    { value: "hexagon", name: "Hexagon" },
                    { value: "pony", name: "Pony" },
                    { value: "bloodlust", name: "Bloodlust" },
                    { value: "serpent", name: "Serpent" },
                    { value: "hotdog", name: "Hotdog" },
                ],
                undefined,
                async (event, data) => {
                    window.localStorage.setItem("theme", data);
                    $("body").attr("data-th-main", data);
                }
            ),
            Form.select(
                "extra", window.localStorage.getItem("theme-extra") || "hexagons", "Extras",
                [
                    { value: "none", name: "None" },
                    { value: "autumn", name: "Autumn" },
                    { value: "winter", name: "Winter" },
                    { value: "spring", name: "Spring" },
                    { value: "aurora", name: "Aurora" },
                    { value: "hexagons", name: "Hexagons" },
                    { value: "space", name: "Space" },
                    { value: "stars", name: "Stars" },
                ],
                undefined,
                async (event, data) => {
                    window.localStorage.setItem("theme-extra", data);
                    $("body").attr("data-th-extra", data);
                }
            ),
            Form.select(
                "nav", window.localStorage.getItem("theme-nav") || "top", "Post Navbar",
                [
                    { value: "top", name: "Top" },
                    { value: "bottom", name: "Bottom" },
                    { value: "none", name: "None" },
                ],
                undefined,
                async (event, data) => {
                    window.localStorage.setItem("theme-nav", data);
                    $("body").attr("data-th-nav", data);
                }
            ),
        ]);

        // === Create the modal
        new Modal({
            title: "Themes",
            triggers: [{ element: openCustomizerButton }],
            content: this.themeCustomizerForm.get(),
            position: { my: "right top", at: "right top" }
        });
    }
}
