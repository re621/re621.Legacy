import { RE6Module } from "../components/RE6Module";
import { Url } from "../components/Url";

declare var GM_addStyle;
declare var GM_getResourceText;

/**
 * Miscellaneous functionality that does not require a separate module
 */
export class Miscellaneous extends RE6Module {

    private static instance: Miscellaneous = new Miscellaneous();

    private redesignStylesheet: JQuery<HTMLElement>;

    private constructor() {
        super();

        // Remove the query string on posts
        if (this.fetchSettings("removeSearchQueryString") === true && Url.matches("/posts/")) {
            this.removeSearchQueryString();
        }

        // Load the Redesign Fixes stylesheet
        this.loadRedesignFixes(this.fetchSettings("loadRedesignFixes"));

        // Auto-focus on the searchbar
        this.focusSearchBar();
    }

    /**
     * Removes the search query from the address bar
     */
    private removeSearchQueryString() {
        history.replaceState({}, "", location.href.split("?")[0]);
    }

    /**
     * Loads the Redesign Fixes stylesheet
     * @param enabled Should the stylesheet be enabled
     */
    private loadRedesignFixes(enabled: boolean = true) {
        this.redesignStylesheet = $(GM_addStyle(GM_getResourceText("redesignFixes")));
        if (!enabled) { this.disableRedesignFixes(); }
    }

    /** Enable the redesign stylesheet */
    public enableRedesignFixes() {
        this.redesignStylesheet.removeAttr("media");
    }

    /** Disable the redesign stylesheet */
    public disableRedesignFixes() {
        this.redesignStylesheet.attr("media", "max-width: 1px");
    }

    /**
     * Set focus on the search bar
     */
    private focusSearchBar() {
        $("section#search-box input").focus();
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "removeSearchQueryString": true,
            "loadRedesignFixes": true,
        };
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new Miscellaneous();
        return this.instance;
    }
}
