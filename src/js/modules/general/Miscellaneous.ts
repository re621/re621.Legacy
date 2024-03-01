import { E621 } from "../../components/api/E621";
import { APIForumPost } from "../../components/api/responses/APIForumPost";
import { APIPost } from "../../components/api/responses/APIPost";
import { XM } from "../../components/api/XM";
import { Page, PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post } from "../../components/post/Post";
import { PostActions } from "../../components/post/PostActions";
import { PostParts } from "../../components/post/PostParts";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { BetterSearch, ImageClickAction } from "../search/BetterSearch";

/**
 * Miscellaneous functionality that does not require a separate module
 */
export class Miscellaneous extends RE6Module {

    public constructor() {
        super();
        this.registerHotkeys(
            { keys: "hotkeyNewComment", fnct: this.openNewComment },
            { keys: "hotkeyEditPost", fnct: this.openEditTab },
            { keys: "hotkeyToggleBlacklist", fnct: this.toggleBlacklist },
            { keys: "hotkeySubmit", fnct: this.handleSubmitForm, element: "body", selector: "textarea, input" },
            { keys: "hotkeyRandomSetPost", fnct: this.randomSetPost },
            { keys: "hotkeyScrollUp", fnct: this.scrollUp, holdable: true },
            { keys: "hotkeyScrollDown", fnct: this.scrollDown, holdable: true },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            hotkeyNewComment: "n",
            hotkeyEditPost: "e",
            hotkeyToggleBlacklist: "",
            hotkeySubmit: "alt+return",

            hotkeyRandomSetPost: "",

            hotkeyScrollUp: "",
            hotkeyScrollDown: "",

            stickySearchbox: true,      // `div#re621-search`
            stickyHeader: false,        // `header#top`
            stickyEditBox: true,        // `form#re621-quick-tags`
            hideBlacklist: false,       // remove the "blacklisted" section entirely

            avatarClick: true,
            commitWikiLinks: false,     // change the post search links on the comit pages to wiki links
            disableCommentRules: true,  // Disable the "read the how to comment guide" warning

            fixForumTitle: true,

            profileEnhancements: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        // Enhanced quoting button and copy ID button
        if (Page.matches([PageDefinition.post, PageDefinition.forum])) {
            $(() => {
                this.handleQuoteButton();
                this.handleIDButton();
            });
        }

        // Sticky elements
        if (Page.matches([PageDefinition.search, PageDefinition.post, PageDefinition.favorites])) {
            this.createStickySearchbox(this.fetchSettings("stickySearchbox"));
        }

        this.createStickyHeader(this.fetchSettings("stickyHeader"));

        if (Page.matches([PageDefinition.search, PageDefinition.favorites])) {
            this.createStickyEditBox(this.fetchSettings("stickyEditBox"));
        }

        // Hide the blacklist
        this.hideBlacklist(this.fetchSettings("hideBlacklist"));

        // Double-clicking avatars
        this.handleAvatarClick(this.fetchSettings("avatarClick"));

        // How to comment guide
        $(() => { this.handleCommentRules(this.fetchSettings("disableCommentRules")); });

        // Fix the forum title
        if (this.fetchSettings("fixForumTitle") && Page.matches(PageDefinition.forum)) {
            const title = /^(?:Forum - )(.+)(?: - (e621|e926))$/g.exec(document.title);
            if (title) document.title = `${title[1]} - Forum - ${title[2]}`;
        }

        // Add a character counter to the blacklist input in the settings
        if (Page.matches(PageDefinition.settings)) {
            this.modifyBlacklistForm();
        }

        // Minor changes to the set cover page
        if (Page.matches(PageDefinition.set)) {
            this.tweakSetPage();
        }

        if (Page.matches(PageDefinition.changes) && this.fetchSettings("commitWikiLinks")) {
            $(() => {
                for (const link of $(".diff-list a").get()) {
                    const $link = $(link);
                    const text = $link.text().replace(/^[+-]/, "");
                    $link.attr("href", "/wiki_pages/show_or_new?title=" + encodeURIComponent(text));
                }
            });
        }

        // Add "Upload Superior" button
        $(async () => {
            if (Page.matches(PageDefinition.post)) {
                const post = Post.getViewingPost();

                // This should trim tags that might not be appropriate in the new version
                // Image ratio tags should also be here... but there are just too many of them
                const tags = post.tags.all;
                for (const trimmedTag of ["better_version_at_source", "thumbnail", "low_res", "hi_res", "absurd_res", "superabsurd_res", "invalid_tag"])
                    tags.delete(trimmedTag);
                const attributes = [];

                if (post.sources.length > 0) attributes.push("sources=" + uriEncodeArray(post.sources));

                attributes.push("tags=" + encodeURIComponent(Array.from(tags).join(" ")));
                attributes.push("simple-form=true");
                attributes.push("rating=" + post.rating);

                if (post.description.length > 0) {
                    if ((post.description.length + attributes.join("&").length) > 8000)
                        attributes.push("description=" + encodeURIComponent("Copy Description Manually"));
                    else attributes.push("description=" + encodeURIComponent(post.description));
                }

                $("<a>")
                    .attr("href", "/uploads/new?" + attributes.join("&"))
                    .html("Reupload")
                    .appendTo($("<li>").appendTo("#post-history ul"));
            }

            if (Page.matches(PageDefinition.upload)) {

                // Add a space after the tags, or autocomplete triggers
                const tags = Page.getQueryParameter("tags");
                if (tags) {
                    const tagsEl = $("#post_tags").val(tags + " ");
                    Util.Events.triggerVueEvent(tagsEl, "input");
                }

                // Fill in the post rating
                const rating = Page.getQueryParameter("rating");
                if (rating && rating !== "undefined") $("button.toggle-button.rating-" + rating)[0].click();

            }
        });

        // Move the ad leaderboard
        $("#ad-leaderboard").prependTo("#content");

        // Reset the content headers
        this.resetContentHeaders();

        // Add a mail button
        Util.DOM.addSettingsButton({
            id: "header-button-dmail",
            name: `<i class="fas fa-envelope"></i>`,
            href: "/dmails",
            title: "DMail",
        });

        // Add a "remove from set" button
        if (Page.matches(PageDefinition.post)) {
            this.addRemoveFromSetButton();
        }

        function uriEncodeArray(array: string[], delimiter = ","): string {
            const result = [];
            for (const el of array) result.push(encodeURIComponent(el));
            return result.join(delimiter);
        }
    }

    /** Reset the content headers */
    public resetContentHeaders(): void {
        const config = this.fetchSettings(["profileEnhancements"]);

        if (Page.matches(PageDefinition.profile) && config.profileEnhancements) $("#page").attr("enhancements", "true");
        else $("#c-users").removeAttr("enhancements");
    }

    /** Emulates the clicking on "New Comment" link */
    private openNewComment(): void {
        if (Page.matches(PageDefinition.post)) {
            $("menu#post-sections > li > a[href$=comments]")[0].click();
            $("a.expand-comment-response")[0].click();
        } else if (Page.matches(PageDefinition.forum)) { $("a#new-response-link")[0].click(); }
    }

    /** Emulated clicking on "Edit" tab */
    private openEditTab(): void {
        if (Page.matches(PageDefinition.post)) {
            window.setTimeout(() => { $("#post-edit-link")[0].click(); }, 100);
        }
    }

    /**
     * Makes the searchbox stick to the page when scrolling down
     * @param state True to stick, false to unstick
     */
    public createStickySearchbox(state = true): void {
        $("body").attr("data-sticky", state + "");
    }

    /**
     * Makes the header navbar stick to the page when scrolling down
     * @param state True to stick, false to unstick
     */
    public createStickyHeader(state = true): void {
        $("body").attr("data-sticky-header", state + "");
    }

    /**
     * Makes the quick tags form stick to the page when scrolling down
     * @param state True to stick, false to unstick
     */
    public createStickyEditBox(state = true): void {
        $("body").attr("data-sticky-editbox", state + "");
    }

    /** If true, completely removes the blacklisted section */
    public hideBlacklist(state = true): void {
        $("body").attr("data-hide-blacklist", state + "");
    }

    /**
     * Handles the "Reply" button functionality
     */
    private handleQuoteButton(): void {
        if (Page.matches(PageDefinition.forum)) {
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
                this.quote($parent, "forum", $parent.data("forum-post-id"), $("#forum_post_body_for_"), $("a#new-response-link"));
            });
        } else if (Page.matches(PageDefinition.post)) {
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
                this.quote($parent, "comment", $parent.data("comment-id"), $("#comment_body_for_"), $("a.expand-comment-response"));
            });
        }
    }

    /**
     * Generates the "Copy ID" button on comments and forum posts 
     */
    private handleIDButton(): void {
        if (Page.matches(PageDefinition.forum)) {
            // Using li:last-of-type to put the button before the vote menu
            $(".content-menu > menu > li:last-of-type").each(function (index, element) {
                const $copyElement = $("<a>")
                    .addClass("re621-forum-post-copy-id")
                    .html("Copy ID");
                $(element).after($copyElement);
                $($copyElement).wrap("<li>");
            });

            $(".re621-forum-post-copy-id").on('click', (event) => {
                event.preventDefault();
                const $post = $(event.target).parents("article.forum-post");
                XM.Util.setClipboard($post.data("forum-post-id"));
            });
        } else if (Page.matches(PageDefinition.post)) {
            $(".content-menu > menu").each(function (index, element) {
                const $element = $(element);

                $("<li>")
                    .text("|")
                    .appendTo($element);

                const $copyElement = $("<a>")
                    .addClass("re621-comment-copy-id")
                    .text("Copy ID");

                $("<li>")
                    .appendTo($element)
                    .append($copyElement);
            });

            $(".re621-comment-copy-id").on('click', (event) => {
                event.preventDefault();
                const $comment = $(event.target).parents("article.comment");
                XM.Util.setClipboard($comment.data("comment-id"));
            });

            $(".show-all-comments-for-post-link").on("click", async () => {
                await Util.sleep(500);
                this.handleIDButton();
            })
        }
    }

    private async quote($parent: JQuery<HTMLElement>, endpoint: "forum" | "comment", id: number, $textarea: JQuery<HTMLElement>, $responseButton: JQuery<HTMLElement>): Promise<void> {
        let strippedBody = "";
        const selection = window.getSelection().toString();

        if (selection === "") {
            const jsonData: APIForumPost = endpoint === "forum" ? await E621.ForumPost.id(id).first() : await E621.Comment.id(id).first();
            strippedBody = jsonData.body.replace(/\[quote\](?:.|\n|\r)+?\[\/quote\][\n\r]*/gm, "");
            strippedBody = `[quote]"` + $parent.data('creator') + `":/users/` + $parent.data('creator-id') + ` said:\n` + strippedBody + `\n[/quote]`;
        } else {
            strippedBody = `[quote]"` + $parent.data('creator') + `":/users/` + $parent.data('creator-id') + ` said:\n` + selection + `\n[/quote]`;
        }

        if (($textarea.val() + "").length > 0) { strippedBody = "\n\n" + strippedBody; }

        $responseButton[0].click();
        $textarea.scrollTop($textarea[0].scrollHeight);

        const newVal = $textarea.val() + strippedBody + "\n\n";
        $textarea.trigger("focus").val("").val(newVal);
    }

    /**
     * Handles the double-clicking actions on the avatars
     * @param state True to enable, false to disable
     */
    private handleAvatarClick(state = true): void {

        PostParts.unstrapDoubleClick("div.avatar > div.active > a");

        if (!state) return;

        /* Handle double-click */
        PostParts.bootstrapDoubleClick(
            "div.avatar > div > a",
            ($link) => { XM.Util.openInTab(window.location.origin + $link.attr("href"), false); },
            () => ModuleController.get(BetterSearch).fetchSettings<ImageClickAction>("clickAction") !== ImageClickAction.NewTab
        );
    }

    /*
     * Submits the form on hotkey press
     * @param event Keydown event
     */
    private handleSubmitForm(event: Event): void {
        $(event.target).parents("form").trigger("submit");
    }

    /**
     * Adds a character counter to the blacklist input in the settings
     */
    private modifyBlacklistForm(): void {
        const $textarea = $("textarea#user_blacklisted_tags"),
            $container = $("div.user_blacklisted_tags");
        const charCounter = $("<span>")
            .addClass("char-counter")
            .html(($textarea.val() + "").length + " / 50000");
        $("<div>")
            .addClass("blacklist-character-counter-box")
            .append(charCounter)
            .appendTo($container);

        $textarea.on("keyup", () => {
            charCounter.html(($textarea.val() + "").length + " / 50000");
        });
    }

    private toggleBlacklist(): void {
        $("a#disable-all-blacklists:visible, a#re-enable-all-blacklists:visible").first()[0].click();
    }

    /** Add a "random post" button to set cover page */
    private tweakSetPage(): void {
        const wrapper = $("span.set-viewposts").first();
        wrapper.find("a").addClass("button btn-success");

        $("<a>")
            .addClass("button btn-neutral")
            .html("Random Post")
            .attr({ "id": "set-random-post" })
            .on("click", async () => {
                const shortname = $("div.set-shortname a").first().text();

                const result = await E621.Posts.get<APIPost>({ tags: ["set:" + shortname, "order:random"], limit: 1 });
                if (result.length == 0) return;

                location.href = "/posts/" + result[0].id + "?q=set:" + shortname;
            })
            .appendTo(wrapper);
    }

    private randomSetPost(): void {
        if (!Page.matches(PageDefinition.set)) return;
        $("#set-random-post")[0].click();
    }

    /** Disables the "read the how to comment guide" warning */
    public handleCommentRules(disable = true): void {
        $("div.new-comment > h2 > a[href='/wiki_pages?search%5Btitle%5D=howto%3Acomment']").parent("h2").toggleClass("display-none", disable);
    }

    private scrollUp(): void {
        window.scrollBy(0, $(window).height() * -0.15);
    }

    private scrollDown(): void {
        window.scrollBy(0, $(window).height() * 0.15);
    }

    private addRemoveFromSetButton(): void {
        const post = Post.getViewingPost();
        for (const link of $("div.set-nav span.set-name a").get()) {
            const $link = $(link),
                id = parseInt($link.attr("href").replace("/post_sets/", ""));

            if (!id) continue;

            $("<a>")
                .addClass("remove-from-set-button")
                .html(`<i class="fas fa-times"></i>`)
                .insertAfter($link)
                .on("click", (event) => {
                    event.preventDefault();
                    PostActions.removeSet(id, post.id);
                });
        }
    }

}
