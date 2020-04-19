/* Theme Customizer
 * Creates and manages a more customizable theme manager
 */

import { Modal } from "../../components/structure/Modal";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Form } from "../../components/structure/Form";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { XM } from "../../components/api/XM";

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

            // Don't forget to update DomUtilities.createThemes()
            // It'll break without the correct settings names
            main: window.localStorage.getItem("theme") || "hexagon",
            extra: window.localStorage.getItem("theme-extra") || "hexagons",
            nav: window.localStorage.getItem("theme-nav") || "top",
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        // === Set the saved themes
        $("body").attr("data-th-main", this.fetchSettings("main"));
        $("body").attr("data-th-extra", this.fetchSettings("extra"));
        $("body").attr("data-th-nav", this.fetchSettings("nav"));

        // === Create a button in the header
        const openCustomizerButton = DomUtilities.addSettingsButton({
            name: `<i class="fas fa-paint-brush"></i>`,
        });

        // === Establish the settings window contents
        this.themeCustomizerForm = new Form({ "id": "theme-customizer", "parent": "div#modal-container" }, [
            Form.select(
                "main", this.fetchSettings("main"), "Theme",
                [
                    { value: "hexagon", name: "Hexagon" },
                    { value: "pony", name: "Pony" },
                    { value: "bloodlust", name: "Bloodlust" },
                    { value: "serpent", name: "Serpent" },
                    { value: "hotdog", name: "Hotdog" },
                ],
                undefined,
                async (event, data) => {
                    await this.pushSettings("main", data);
                    window.localStorage.setItem("theme", data);
                    $("body").attr("data-th-main", data);
                }
            ),
            Form.select(
                "extra", this.fetchSettings("extra"), "Extras",
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
                    await this.pushSettings("extra", data);
                    window.localStorage.setItem("theme-extra", data);
                    $("body").attr("data-th-extra", data);
                }
            ),
            Form.select(
                "nav", this.fetchSettings("nav"), "Post Navbar",
                [
                    { value: "top", name: "Top" },
                    { value: "bottom", name: "Bottom" },
                    { value: "none", name: "None" },
                ],
                undefined,
                async (event, data) => {
                    await this.pushSettings("nav", data);
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
