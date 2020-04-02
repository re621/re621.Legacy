import { RE6Module, Settings } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { ApiForumPost } from "../../components/api/responses/ApiForum";

declare const GM_addStyle;
declare const GM_getResourceText;

/**
 * Miscellaneous functionality that does not require a separate module
 */
export class Miscellaneous extends RE6Module {

    private redesignStylesheet: JQuery<HTMLElement>;

    public constructor() {
        super();
        this.registerHotkeys(
            { keys: "hotkeyFocusSearch", fnct: this.focusSearchbar },
            { keys: "hotkeyRandomPost", fnct: this.randomPost },
            { keys: "hotkeyNewComment", fnct: this.openNewComment },
            { keys: "hotkeyEditPost", fnct: this.openEditTab },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyFocusSearch: "q",
            hotkeyRandomPost: "r",
            hotkeyNewComment: "n",
            hotkeyEditPost: "e",
            removeSearchQueryString: true,
            loadRedesignFixes: true,
            improveTagCount: true,
            cropThumbnails: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        if (!this.canInitialize()) return;
        super.create();

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

        if (Page.matches(PageDefintion.search)) {
            this.cropThumbnails(this.fetchSettings("cropThumbnails"));
        }

        this.registerHotkeys();
    }

    /** Emulates the clicking on "New Comment" link */
    private openNewComment(): void {
        if (Page.matches(PageDefintion.post)) {
            $("menu#post-sections > li > a[href$=comments]")[0].click();
            $("a.expand-comment-response")[0].click();
        } else if (Page.matches(PageDefintion.forum)) { $("a#new-response-link")[0].click(); }
    }

    /** Emulated clicking on "Edit" tab */
    private openEditTab(): void {
        if (Page.matches(PageDefintion.post)) {
            $("menu#post-sections > li > a[href$=edit]")[0].click();
        }
    }

    /**
     * Removes the search query from the address bar
     */
    private removeSearchQueryString(): void {
        Page.removeQueryParameter("q");
    }

    /**
     * Replaces the tag estimates with the real count
     * @param state True to replace, false to restore
     */
    public async improveTagCount(state = true): Promise<void> {
        const source = state ? "data-count" : "data-count-short";
        $("span.re621-post-count").each(function (index, element) {
            const tag = $(element);
            tag.text(tag.attr(source));
        });
    }

    /**
     * Crops the thumbnails to squares to minimize empty space
     * @param state True to crop, false to restore
     */
    public cropThumbnails(state = true): void {
        if (state) $("div#posts-container").attr("data-cropped-thumbnails", "true");
        else $("div#posts-container").attr("data-cropped-thumbnails", "false");
    }

    /** If the searchbar is empty, focuses on it. */
    private autoFocusSearchBar(): void {
        const searchbox = $("section#search-box input");
        if (searchbox.val() == "") searchbox.focus();
    }

    /** Sets the focus on the search bar */
    private focusSearchbar(event): void {
        event.preventDefault();
        $("section#search-box input").focus();
    }

    /** Switches the location over to a random post */
    private randomPost(): void {
        location.pathname = "/posts/random";
    }

    /**
     * Handles the "Reply" button functionality
     */
    private handleQuoteButton(): void {
        if (Page.matches(PageDefintion.forum)) {
            $(".forum-post-reply-link").each(function (index, element) {
                const $newLink = $("<a>")
                    .attr("href", "#")
                    .addClass("re621-forum-post-reply")
                    .html("Respond");
                $(element).after($newLink).remove();
            });

            $(".re621-forum-post-reply").on('click', (event) => {
                event.preventDefault();
                const $parent = $(event.target).parents("article.forum-post");
                this.quote($parent, "/forum_posts/" + $parent.data("forum-post-id") + ".json", $("#forum_post_body"), $("a#new-response-link"));
            });
        } else if (Page.matches(PageDefintion.post)) {
            $(".comment-reply-link").each(function (index, element) {
                const $newLink = $("<a>")
                    .attr("href", "#")
                    .addClass("re621-comment-reply")
                    .html("Respond");
                $(element).after($newLink).remove();
            });

            $(".re621-comment-reply").on('click', (event) => {
                event.preventDefault();
                const $parent = $(event.target).parents("article.comment");
                this.quote($parent, "/comments/" + $parent.data("comment-id") + ".json", $("#comment_body_for_"), $("a.expand-comment-response"));
            });
        }
    }

    private async quote($parent: JQuery<HTMLElement>, requestURL: string, $textarea: JQuery<HTMLElement>, $responseButton: JQuery<HTMLElement>): Promise<void> {
        let strippedBody = "";
        const selection = window.getSelection().toString();

        if (selection === "") {
            const jsonData: ApiForumPost = await Api.getJson(requestURL);
            strippedBody = jsonData.body.replace(/\[quote\](?:.|\n|\r)+?\[\/quote\][\n\r]*/gm, "");
            strippedBody = `[quote]"` + $parent.data('creator') + `":/user/show/` + $parent.data('creator-id') + `said:\n` + strippedBody + `\n[/quote]`;
        } else {
            strippedBody = `[quote]"` + $parent.data('creator') + `":/user/show/` + $parent.data('creator-id') + `said:\n` + selection + `\n[/quote]`;
        }

        if (($textarea.val() + "").length > 0) { strippedBody = "\n\n" + strippedBody; }

        $responseButton[0].click();
        $textarea.scrollTop($textarea[0].scrollHeight);

        const newVal = $textarea.val() + strippedBody;
        $textarea.focus().val("").val(newVal);
    }

}
