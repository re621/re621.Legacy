import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Form2 } from "../../components/structure/Form2";
import { Modal } from "../../components/structure/Modal";

/**
 * ThemeCustomizer  
 * Built upon e621 Redesign Fixes, this module adds the ability to change and adjust themes
 */
export class ThemeCustomizer extends RE6Module {

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
        const form = new Form2({ name: "theme-customizer" }, [
            Form2.select(
                { label: "Theme", value: window.localStorage.getItem("theme") || "hexagon", },
                {
                    "hexagon": "Hexagon",
                    "pony": "Pony",
                    "bloodlust": "Bloodlust",
                    "serpent": "Serpent",
                    "hotdog": "Hotdog",
                },
                (data) => {
                    window.localStorage.setItem("theme", data);
                    $("body").attr("data-th-main", data);
                }
            ),
            Form2.select(
                { label: "Extras", value: window.localStorage.getItem("theme-extra") || "hexagons", },
                {
                    "none": "None",
                    "autumn": "Autumn",
                    "winter": "Winter",
                    "spring": "Spring",
                    "aurora": "Aurora",
                    "hexagons": "Hexagons",
                    "space": "Space",
                    "stars": "Stars",
                },
                (data) => {
                    window.localStorage.setItem("theme-extra", data);
                    $("body").attr("data-th-extra", data);
                }
            ),
            Form2.select(
                { label: "Post Navbar", value: window.localStorage.getItem("theme-nav") || "top", },
                {
                    "top": "Top",
                    "bottom": "Bottom",
                    "none": "None",
                },
                (data) => {
                    window.localStorage.setItem("theme-nav", data);
                    $("body").attr("data-th-nav", data);
                }
            ),
        ]);

        // === Create the modal
        new Modal({
            title: "Themes",
            triggers: [{ element: openCustomizerButton }],
            content: Form2.placeholder(),
            structure: form,
            position: { my: "right top", at: "right top" }
        });
    }
}
