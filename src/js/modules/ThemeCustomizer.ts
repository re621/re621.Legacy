/* Theme Customizer
 * Creates and manages a more customizable theme manager
 */

import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../components/Modal";
import { RE6Module } from "../components/RE6Module";

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

    private modal: Modal;

    private constructor() {
        super();

        this.createDOM();

        this.handleThemeSwitcher("th-main", "hexagon");
        this.handleThemeSwitcher("th-extra", "hexagon");
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
        let addTabButton = HeaderCustomizer.getInstance().createTab({
            name: `<i class="fas fa-paint-brush"></i>`,
            parent: "menu.extra",
        });

        // === Establish the settings window contents
        let $themeCustomizerContainer = $("<div>");
        let $themeCustomizer = $("<form>")
            .addClass("grid-form")
            .appendTo($themeCustomizerContainer);

        // Main Theme Selector
        $("<div>")
            .html("Theme:")
            .appendTo($themeCustomizer);

        let $themeSelector = $("<select>")
            .attr("id", "th-main-selector")
            .appendTo($themeCustomizer);
        THEME_MAIN.forEach(function (entry) {
            $("<option>").val(entry.value).text(entry.name).appendTo($themeSelector);
        });

        // Theme Extras
        $("<div>")
            .html("Extras:")
            .appendTo($themeCustomizer);

        let $extraSelector = $("<select>")
            .attr("id", "th-extra-selector")
            .appendTo($themeCustomizer);
        THEME_EXTRA.forEach(function (entry) {
            $("<option>").val(entry.value).text(entry.name).appendTo($extraSelector);
        });

        // Disable Scaling
        let $scalingSelector = $("<div>").addClass("full-width").appendTo($themeCustomizer);
        $("<input>")
            .attr("type", "checkbox")
            .attr("id", "theme-scaling")
            .attr("name", "theme-scaling")
            .css("float", "right")
            .appendTo($scalingSelector);
        $("<label>")
            .attr("for", "theme-scaling")
            .css("font-weight", "500")
            .text("Disable Scaling")
            .appendTo($scalingSelector);

        // === Create the modal
        this.modal = new Modal({
            uid: "theme-customizer-modal",
            title: "Themes",
            width: "15rem",
            height: "auto",
            position: {
                right: "0",
                top: "4.5rem",
            },
            triggers: [{ element: addTabButton.link }],
            content: [{ name: "re621", page: $themeCustomizerContainer }],
        });
    }

    private handleThemeSwitcher(selector: string, default_option: string) {
        let _self = this;
        let theme = this.fetchSettings(selector);

        $("body").attr("data-" + selector, theme);
        $("#" + selector + "-selector").val(theme);

        $("#" + selector + "-selector").change(function (e) {
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

        $("re-modal-container").on("change", "#theme-scaling", function (e) {
            let disable_scaling = $(this).is(":checked");
            _self.pushSettings("unscaling", disable_scaling);
            if (disable_scaling) { $("body").css("max-width", "unset"); }
            else { $("body").css("max-width", ""); }
        });
    }
}
