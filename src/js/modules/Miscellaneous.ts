import { RE6Module } from "../components/RE6Module";
import { Url } from "../components/Url";

declare var GM_getResourceText;

/**
 * Miscellaneous functionality that does not require a separate module
 */
export class MiscFunctionality extends RE6Module {

    private static instance: MiscFunctionality = new MiscFunctionality();

    private constructor() {
        super();

        if (this.fetchSettings("removeSearchQueryString") === true && Url.matches("/posts/")) {
            this.removeSearchQueryString();
        }

        if (this.fetchSettings("loadRedesignFixes")) {
            this.loadRedesignFixes();
        }
    }

    /**
     * Removes the search query from the address bar
     */
    private removeSearchQueryString() {
        history.replaceState({}, "", location.href.split("?")[0]);
    }

    private loadRedesignFixes() {
        $("<style>")
            .attr("id", "redesign-fixes-stylesheet")
            .append(GM_getResourceText("redesignFixes"))
            .appendTo("body");
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
        if (this.instance == undefined) this.instance = new MiscFunctionality();
        return this.instance;
    }
}
