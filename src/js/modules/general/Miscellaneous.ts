import { RE6Module } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
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
        this.registerHotkeys(
            { keys: ["hotkey_newcomment"], fnct: this.openNewComment }
        );

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

    /** Emulates the clicking on "New Comment" link */
    private openNewComment() {
        if (Page.matches(PageDefintion.post)) $("a.expand-comment-response").click();
        else if (Page.matches(PageDefintion.forum)) $("a#new-response-link").click();
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

    /** Enable the redesign stylesheet */
    public enableRedesignFixes() {
        this.redesignStylesheet.removeAttr("media");
    }

    /** Disable the redesign stylesheet */
    public disableRedesignFixes() {
        this.redesignStylesheet.attr("media", "max-width: 1px");
    }

    /**
     * Replaces the tag estimates with the real count
     */
    private async improveTagCount() {
        const $tags = $("#tag-box > ul > li, #tag-list > ul > li");
        $tags.each(function (index, element) {
            const $element = $(element);
            $element.find(".post-count").each(function (index, tagElement) {
                const $tagElement = $(tagElement);
                const tagCount = $tagElement.attr("data-count");
                if (tagCount) {
                    $tagElement.text(tagCount);
                }
            });
        });
    }

    /**
     * Set focus on the search bar
     */
    private focusSearchBar() {
        let searchbox = $("section#search-box input");
        if (searchbox.val() == "") searchbox.focus();
    }
}
