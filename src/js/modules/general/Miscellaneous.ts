import { RE6Module } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
import { ApiTag } from "../../components/api/responses/ApiTag";
import { Api } from "../../components/api/Api";
import { HotkeyCustomizer } from "./HotkeyCustomizer";

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

        // Load the Redesign Fixes stylesheet
        this.loadRedesignFixes(this.fetchSettings("loadRedesignFixes"));

        // Remove the query string on posts
        if (this.fetchSettings("removeSearchQueryString") === true && Page.matches(PageDefintion.post)) {
            this.removeSearchQueryString();
        }

        // Replaces the tag count estimate with the real number
        if (this.fetchSettings("improveTagCount") === true && Page.matches([PageDefintion.search, PageDefintion.post])) {
            this.improveTagCount();
        }

        // Auto-focus on the searchbar
        if (Page.matches(PageDefintion.search)) {
            this.focusSearchBar();
        }

        this.registerHotkeys();
    }

    /** Registers hotkeys for the module */
    protected registerHotkeys() {
        HotkeyCustomizer.register(this.fetchSettings("hotkey_newcomment"), function () {
            if (Page.matches(PageDefintion.post)) $("a.expand-comment-response").click();
            else if (Page.matches(PageDefintion.forum)) $("a#new-response-link").click();
        });
    }

    /** Reserves hotkeys to prevent them from being re-assigned */
    protected reserveHotkeys() {
        HotkeyCustomizer.register(this.fetchSettings("hotkey_newcomment"), function () { });
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new Miscellaneous();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            hotkey_newcomment: "n",
            removeSearchQueryString: true,
            loadRedesignFixes: true,
            improveTagCount: true,
        };
    }

    /**
     * Removes the search query from the address bar
     */
    private removeSearchQueryString() {
        Page.removeQueryParameter("q");
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
        //Don't make a request if there is nothing to do
        if (tagElements.size === 0) {
            return;
        }

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
        let searchbox = $("section#search-box input");
        if (searchbox.val() == "") searchbox.focus();
    }
}
