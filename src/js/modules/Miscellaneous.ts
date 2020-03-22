import { RE6Module } from "../components/RE6Module";
import { Url } from "../components/Url";
import { ApiTag } from "../components/apiresponses/ApiTag";
import { Api } from "../components/Api";

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

        // Replaces the tag count estimate with the real number
        if (this.fetchSettings("improveTagCount") === true && Url.matches("/posts")) {
            this.improveTagCount();
        }

        // Auto-focus on the searchbar
        this.focusSearchBar();
    }

    /**
     * Removes the search query from the address bar
     */
    private removeSearchQueryString() {
        Url.removeQueryParameter("q");
    }

    /**
     * Loads the Redesign Fixes stylesheet
     * @param enabled Should the stylesheet be enabled
     */
    private loadRedesignFixes(enabled: boolean = true) {
        this.redesignStylesheet = $(GM_addStyle(GM_getResourceText("redesignFixes")));
        if (!enabled) { this.disableRedesignFixes(); }
    }

    /**
     * Replaces the tag estimates with the real count
     */
    private async improveTagCount() {
        const tagElements: Map<string, { tagEscaped: string, element: JQuery<HTMLElement> }> = new Map<string, { tagEscaped: string, element: JQuery<HTMLElement> }>();
        const $tags = $("#tag-box > ul > li, #tag-list > ul > li");
        $tags.each(function () {
            const $this = $(this);
            //only use the first 320 tags. This should't happen to many posts anyways
            //only add tags which end in k, meaning they have a ~ count
            if (tagElements.size !== 320 && $this.find(".post-count").text().endsWith("k")) {
                //grab the child with the tagname in it, replace spaces with _ and make it url save
                const tag = $this.find(".search-tag").text();
                const tagNormal = tag.replace(/ /g, "_");
                const tagEscaped = encodeURIComponent(tagNormal);
                tagElements.set(tagNormal, {
                    tagEscaped: tagEscaped,
                    element: $this
                });
            }
        });
        const tagString = Array.from(tagElements.values()).map(e => e.tagEscaped).join(",");
        const tagJson: ApiTag[] = await Api.getJson("/tags.json?limit=320&search[name]=" + tagString);

        for (const tag of tagJson) {
            const entry = tagElements.get(tag.name);
            entry.element.find(".post-count").text(tag.post_count);
        }
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
            "improveTagCount": true
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
