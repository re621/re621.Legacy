import { RE6Module, Settings } from "../../components/RE6Module";
import { Form } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Util } from "../../components/utility/Util";

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
        const openCustomizerButton = Util.DOM.addSettingsButton({
            id: "header-button-theme",
            name: `<i class="fas fa-paint-brush"></i> <span>Themes</span>`,
            title: "Change Theme",
            tabClass: "nav-re6-themecus",
        });

        // === Establish the settings window contents
        const form = new Form({ name: "theme-customizer" }, [
            Form.select(
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
                    ThemeCustomizer.trigger("switch.theme", data);
                }
            ),
            Form.select(
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
                    ThemeCustomizer.trigger("switch.extras", data);
                }
            ),
            Form.select(
                { label: "Post Navbar", value: Util.LS.getItem("re621-theme-nav") || Util.LS.getItem("theme-nav") || "top", },
                {
                    "top": "Top",
                    "bottom": "Bottom",
                    "both": "Both",
                    "left": "Sidebar",
                    "none": "None",
                },
                (data) => {
                    if (data == "left") Util.LS.setItem("theme-nav", "top");
                    else Util.LS.setItem("theme-nav", data);
                    Util.LS.setItem("re621-theme-nav", data);

                    $("body").attr("data-th-nav", data);
                    $("body").attr("re621-data-th-nav", data == "left" ? "true" : "false");

                    ThemeCustomizer.trigger("switch.navbar", data);
                }
            ),
            Form.div({ value: "<center><a href='/static/theme'>More theme options</a></center>", width: 1 }),
        ]);

        // === Create the modal
        new Modal({
            title: "Themes",
            triggers: [{ element: openCustomizerButton }],
            content: Form.placeholder(),
            structure: form,
            position: { my: "right top", at: "right top" }
        });
    }
}
