import { RE6Module, Settings } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { APIForumPost } from "../../components/api/responses/APIForumPost";
import { ModuleController } from "../../components/ModuleController";
import { ThumbnailEnhancer, ThumbnailClickAction } from "../search/ThumbnailsEnhancer";
import { XM } from "../../components/api/XM";

/**
 * Miscellaneous functionality that does not require a separate module
 */
export class Miscellaneous extends RE6Module {

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
            stickySearchbox: true,
            stickyHeader: false,

            improveTagCount: true,
            collapseCategories: true,
            categoryData: [],

            avatarClick: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        // Remove the query string on posts
        if (this.fetchSettings("removeSearchQueryString") === true && Page.matches(PageDefintion.post)) {
            this.removeSearchQueryString();
        }

        // Replaces the tag count estimate with the real number
        if (this.fetchSettings("improveTagCount") === true && Page.matches([PageDefintion.search, PageDefintion.post])) {
            this.improveTagCount();
        }

        // Restore the collapsed categories
        if (this.fetchSettings("collapseCategories") === true && Page.matches(PageDefintion.post)) {
            this.collapseTagCategories();
        }

        // Auto-focus on the searchbar
        if (Page.matches(PageDefintion.search)) {
            this.autoFocusSearchBar();
        }

        // Enhanced quoting button
        if (Page.matches([PageDefintion.post, PageDefintion.forum])) {
            this.handleQuoteButton();
        }

        // Sticky elements
        if (Page.matches([PageDefintion.search, PageDefintion.post, PageDefintion.favorites])) {
            this.createStickySearchbox(this.fetchSettings("stickySearchbox"));
        }

        this.createStickyHeader(this.fetchSettings("stickyHeader"));

        // Double-clicking avatars
        this.handleAvatarClick(this.fetchSettings("avatarClick"));

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
     * Records which tag categories the user has collapsed.
     */
    private async collapseTagCategories(): Promise<void> {
        let storedCats: string[] = await this.fetchSettings("categoryData", true);
        $("section#tag-list .tag-list-header").each((index, element) => {
            const $header = $(element),
                cat = $header.attr("data-category");
            if (storedCats.indexOf(cat) !== -1) $header.get(0).click();

            $header.on("click.danbooru", async () => {
                storedCats = await this.fetchSettings("categoryData", true);
                if ($header.hasClass("hidden-category")) {
                    storedCats.push(cat);
                } else {
                    const index = storedCats.indexOf(cat);
                    if (index !== -1) storedCats.splice(index, 1);
                }
                await this.pushSettings("categoryData", storedCats);
            });
        });

    }

    /**
     * Makes the searchbox stick to the page when scrolling down
     * @param state True to stick, false to unstick
     */
    public createStickySearchbox(state = true): void {
        $("div#re621-search").attr("data-sticky", state + "");
    }

    /**
     * Makes the header navbar stick to the page when scrolling down
     * @param state True to stick, false to unstick
     */
    public createStickyHeader(state = true): void {
        $("body").attr("data-sticky-header", state + "");
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
            const jsonData: APIForumPost = await Api.getJson(requestURL);
            strippedBody = jsonData.body.replace(/\[quote\](?:.|\n|\r)+?\[\/quote\][\n\r]*/gm, "");
            strippedBody = `[quote]"` + $parent.data('creator') + `":/user/show/` + $parent.data('creator-id') + ` said:\n` + strippedBody + `\n[/quote]`;
        } else {
            strippedBody = `[quote]"` + $parent.data('creator') + `":/user/show/` + $parent.data('creator-id') + ` said:\n` + selection + `\n[/quote]`;
        }

        if (($textarea.val() + "").length > 0) { strippedBody = "\n\n" + strippedBody; }

        $responseButton[0].click();
        $textarea.scrollTop($textarea[0].scrollHeight);

        const newVal = $textarea.val() + strippedBody;
        $textarea.focus().val("").val(newVal);
    }

    /**
     * Handles the double-clicking actions on the avatars
     * @param state True to enable, false to disable
     */
    private handleAvatarClick(state = true): void {
        $("div.avatar > div.active > a")
            .off("click.re621.thumbnail")
            .off("dblclick.re621.thumbnail");

        if (!state) return;

        /* Handle double-click */
        const clickAction = ModuleController.getWithType<ThumbnailEnhancer>(ThumbnailEnhancer).fetchSettings("clickAction");

        $("div.avatar > div > a").each((index, element) => {
            const $link = $(element);
            let dbclickTimer: number;
            let prevent = false;

            $link.on("click.re621.thumbnail", (event) => {
                if (event.button !== 0) { return; }
                event.preventDefault();

                dbclickTimer = window.setTimeout(() => {
                    if (!prevent) {
                        $link.off("click.re621.thumbnail");
                        $link[0].click();
                    }
                    prevent = false;
                }, 200);
            }).on("dblclick.re621.thumbnail", (event) => {
                if (event.button !== 0) { return; }

                event.preventDefault();
                window.clearTimeout(dbclickTimer);
                prevent = true;

                if (clickAction === ThumbnailClickAction.NewTab) XM.openInTab(window.location.origin + $link.attr("href"));
                else {
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
            });
        });
    }

}
