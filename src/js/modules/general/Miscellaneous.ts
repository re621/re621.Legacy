import { RE6Module } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { ApiForumPost } from "../../components/api/responses/ApiForum";

declare var GM_addStyle;
declare var GM_getResourceText;

/**
 * Miscellaneous functionality that does not require a separate module
 */
export class Miscellaneous extends RE6Module {

    private static instance: Miscellaneous;

    private redesignStylesheet: JQuery<HTMLElement>;

    private constructor() {
        super();
        this.registerHotkeys(
            { keys: "hotkey_focussearch", fnct: this.focusSearchbar },
            { keys: "hotkey_randompost", fnct: this.randomPost },
            { keys: "hotkey_newcomment", fnct: this.openNewComment },
            { keys: "hotkey_editpost", fnct: this.openEditTab },
        );
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
            enabled: true,
            hotkey_focussearch: "q",
            hotkey_randompost: "r",
            hotkey_newcomment: "n",
            hotkey_editpost: "e",
            removeSearchQueryString: true,
            loadRedesignFixes: true,
            improveTagCount: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();

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
            this.autoFocusSearchBar();
        }

        if (Page.matches([PageDefintion.post, PageDefintion.forum])) {
            this.handleQuoteButton();
        }

        this.registerHotkeys();
    }

    /** Emulates the clicking on "New Comment" link */
    private openNewComment() {
        if (Page.matches(PageDefintion.post)) {
            $("menu#post-sections > li > a[href$=comments]")[0].click();
            $("a.expand-comment-response")[0].click();
        } else if (Page.matches(PageDefintion.forum)) { $("a#new-response-link")[0].click(); }
    }

    /** Emulated clicking on "Edit" tab */
    private openEditTab() {
        if (Page.matches(PageDefintion.post)) {
            $("menu#post-sections > li > a[href$=edit]")[0].click();
        }
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
        const $tags = $(".post-count");
        $("#tag-box > ul > li span.post-count, #tag-list > ul > li span.post-count").each(function (index, element) {
            const $container = $(element);
            const tagCount = $container.attr("data-count");
            if (tagCount) { $container.text(tagCount); }
        });
    }

    /** If the searchbar is empty, focuses on it. */
    private autoFocusSearchBar() {
        let searchbox = $("section#search-box input");
        if (searchbox.val() == "") searchbox.focus();
    }

    /** Sets the focus on the search bar */
    private focusSearchbar(event) {
        event.preventDefault();
        $("section#search-box input").focus();
    }

    /** Triggers a random post with the current tags */
    private randomPost() {
        $("a#random-post")[0].click();
    }

    /**
     * Handles the "Reply" button functionality
     */
    private handleQuoteButton() {
        if (Page.matches(PageDefintion.forum)) {
            $(".forum-post-reply-link").each(function (index, element) {
                let $newLink = $("<a>")
                    .attr("href", "#")
                    .addClass("re621-forum-post-reply")
                    .html("Respond");
                $(element).after($newLink).remove();
            });

            $(".re621-forum-post-reply").on('click', (event) => {
                event.preventDefault();
                let $parent = $(event.target).parents("article.forum-post");
                this.quote($parent, "/forum_posts/" + $parent.data("forum-post-id") + ".json", $("#forum_post_body"), $("a#new-response-link"));
            });
        } else if (Page.matches(PageDefintion.post)) {
            $(".comment-reply-link").each(function (index, element) {
                let $newLink = $("<a>")
                    .attr("href", "#")
                    .addClass("re621-comment-reply")
                    .html("Respond");
                $(element).after($newLink).remove();
            });

            $(".re621-comment-reply").on('click', (event) => {
                event.preventDefault();
                let $parent = $(event.target).parents("article.comment");
                this.quote($parent, "/comments/" + $parent.data("comment-id") + ".json", $("#comment_body_for_"), $("a.expand-comment-response"));
            });
        }
    }

    private async quote($parent: JQuery<HTMLElement>, request_url: string, $textarea: JQuery<HTMLElement>, $responseButton: JQuery<HTMLElement>) {
        let stripped_body = "",
            selection = window.getSelection().toString();
        console.log(request_url);

        if (selection === "") {
            let jsonData: ApiForumPost = await Api.getJson(request_url);
            stripped_body = jsonData.body.replace(/\[quote\](?:.|\n|\r)+?\[\/quote\][\n\r]*/gm, "");
            stripped_body = `[quote]"` + $parent.data('creator') + `":/user/show/` + $parent.data('creator-id') + `said:\n` + stripped_body + `\n[/quote]`;
        } else {
            stripped_body = `[quote]"` + $parent.data('creator') + `":/user/show/` + $parent.data('creator-id') + `said:\n` + selection + `\n[/quote]`;
        }

        if (($textarea.val() + "").length > 0) { stripped_body = "\n\n" + stripped_body; }

        $responseButton[0].click();
        $textarea.scrollTop($textarea[0].scrollHeight);

        let newVal = $textarea.val() + stripped_body;
        $textarea.focus().val("").val(newVal);
    }

}
