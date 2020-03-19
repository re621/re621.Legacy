import { RE6Module } from "../components/RE6Module";
import { Url } from "../components/Url";


/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class MiscFunctionality extends RE6Module {

    private static instance: MiscFunctionality = new MiscFunctionality();

    private constructor() {
        super();
        if (this.fetchSettings("removeSearchQueryString") === true && Url.matches("/posts/")) {
            this.removeSearchQueryString();
        }
    }

    private removeSearchQueryString() {
        history.replaceState({}, "", location.href.split("?")[0]);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "removeSearchQueryString": true
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
