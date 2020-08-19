import { Danbooru } from "../../components/api/Danbooru";
import { E621 } from "../../components/api/E621";
import { APIPost, PostRating } from "../../components/api/responses/APIPost";
import { Page, PageDefintion } from "../../components/data/Page";
import { User } from "../../components/data/User";
import { Post } from "../../components/post/Post";
import { PostActions } from "../../components/post/PostActions";
import { PostData } from "../../components/post/PostData";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Util } from "../../components/utility/Util";
import { BlacklistEnhancer } from "./BlacklistEnhancer";

export class BetterSearch extends RE6Module {

    private static readonly PAGES_PRELOAD = 3;  // Number of pages to pre-load when `loadPrevPages` is true
    private static readonly CLICK_DELAY = 200;  // Timeout for double-click events

    private static paused = false;              // If true, stops several actions that may interfere with other modules

    private $wrapper: JQuery<HTMLElement>;      // Wrapper object containing the loading and content sections
    private $content: JQuery<HTMLElement>;      // Section containing post thumbnails
    private $quickEdit: JQuery<HTMLElement>;    // Quick tags form

    private $zoomBlock: JQuery<HTMLElement>;    // Display area for the hover zoom
    private $zoomImage: JQuery<HTMLElement>;    // Image tag for hover zoom
    private $zoomInfo: JQuery<HTMLElement>;     // Posts's resolution and file size
    private $zoomTags: JQuery<HTMLElement>;     // Post's tags section displayed on hover

    private $paginator: JQuery<HTMLElement>;    // Pagination element

    private observer: IntersectionObserver;     // Handles dynamic post rendering

    private shiftPressed = false;               // Used to block zoom in onshift mode

    private queryTags: string;                  // String containing the current search query
    private queryPage: number;                  // Number of the last page to be loaded
    private queryLimit: number;                 // Maxmimum number of posts per request

    private hasMorePages: boolean;              // If false, there are no more posts to load
    private loadingPosts: boolean;              // True value indicates that infinite scroll is loading posts

    public constructor() {
        super([PageDefintion.search, PageDefintion.favorites]);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            imageLoadMethod: ImageLoadMethod.Disabled,      // Whether the image should be loaded as a preview, as a sample immediately, or on hover
            autoPlayGIFs: true,                             // If false, animated GIFs will use the `hover` load method even if that is set to `always`

            imageSizeChange: true,                          // If true, resizes the image in accordance with `imageWidth`
            imageWidth: "150px",                            // Width if the resized image
            imageRatioChange: true,                         // If true, crops the image to ratio specified in `imageRatio`
            imageRatio: "0.9",                              // Ratio to conform to

            zoomMode: ImageZoomMode.Disabled,               // How should the hover zoom be triggered
            zoomFull: false,                                // Load full-sized (original) image instead of a sampled one
            zoomTags: false,                                // Show a list of tags under the zoomed-in image

            hoverTags: false,                               // If true, adds a hover text to the image containing all of its tags

            ribbonsRel: true,                               // Relations ribbons - parent / child posts
            ribbonsFlag: true,                              // Status ribbons - flagged / pending
            buttonsVote: true,                              // Voting buttons
            buttonsFav: true,                               // Favorite button

            clickAction: ImageClickAction.NewTab,           // Action take when double-clicking the thumbnail

            infiniteScroll: true,                           // Seemlessly load more posts below the current ones
            loadAutomatically: true,                        // Load posts automatically while scrolling down
            loadPrevPages: false,                           // If enabled, will load 3 pages before the current one (if available)
            hidePageBreaks: true,                           // Show a visual separator between different pages
        };
    }

    public async prepare(): Promise<void> {
        await super.prepare();

        if (!this.fetchSettings("enabled") || !this.pageMatchesFilter()) return;

        $("#content")
            .html("")
            .attr("loading", "true");
    }

    public create(): void {
        super.create();

        this.queryPage = parseInt(Page.getQueryParameter("page")) || 1;
        this.queryTags = Page.getQueryParameter("tags") || "";
        this.queryLimit = parseInt(Page.getQueryParameter("limit")) || undefined;
        this.hasMorePages = true;

        if (this.queryPage >= 750) return;

        // Write appropriate settings into the content wrapper
        this.createStructure();
        this.updateContentHeader();

        const preloadEnabled = this.fetchSettings("loadPrevPages") && Page.getQueryParameter("nopreload") !== "true";
        Page.removeQueryParameter("nopreload");

        // Throttled scroll-resize events for other submodules
        let timer: number;
        $(window).on("scroll.re621.gen resize.re621.gen", () => {
            if (timer) return;
            if (timer == undefined) BetterSearch.trigger("scroll");
            timer = window.setTimeout(() => {
                timer = undefined;
                BetterSearch.trigger("scroll");
            }, 250);
        });

        // Event listener for article updates
        this.$content
            .on("re621:render", "post", (event) => { Post.render($(event.currentTarget)); })
            .on("re621:reset", "post", (event) => { Post.reset($(event.currentTarget)); })
            .on("re621:filters", "post", (event) => { Post.updateFilters($(event.currentTarget)); })
            .on("re621:blacklist", "post", (event) => { Post.updateVisibility($(event.currentTarget)); });
        BetterSearch.on("postcount", () => {
            this.updatePostCount();
        });

        const intersecting: Set<number> = new Set();
        let selectedPage = this.queryPage;
        const config = {
            root: null,
            rootMargin: "100% 50% 100% 50%",
            threshold: 0.5,
        };
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((value) => {
                const $article = $(value.target),
                    id = $article.data("id") || 0,
                    has = intersecting.has(id);

                // element left the viewport
                if (has && !value.isIntersecting) {
                    // console.log("object left", id);
                    intersecting.delete(id);
                    $article.trigger("re621:reset");
                }
                // element entered viewport
                if (!has && value.isIntersecting) {
                    // console.log("object entered", id);
                    intersecting.add(id);
                    window.setTimeout(() => {
                        if (!intersecting.has(id)) return;
                        $article.trigger("re621:render");
                        const page = $article.data("page") as number;
                        if (page != selectedPage) {
                            selectedPage = page;
                            Page.setQueryParameter("page", page + "");
                        }
                    }, 100);
                }
            })
        }, config);

        // Initial post load
        new Promise(async (resolve) => {
            const firstPage = preloadEnabled
                ? Math.max((this.queryPage - BetterSearch.PAGES_PRELOAD), 1)
                : this.queryPage;

            const pageResult = await this.fetchPosts();
            if (pageResult.length > 0) {

                const imageRatioChange = this.fetchSettings<boolean>("imageRatioChange");

                // Reload previous pages
                let result: APIPost[] = [];
                for (let i = firstPage; i < this.queryPage; i++) {
                    result = await this.fetchPosts(i);
                    for (const post of result) {
                        const $article = Post.build(post, imageRatioChange, i);
                        this.$content.append($article);
                        this.observer.observe($article[0]);
                    }
                    $("<post-break>")
                        .attr("id", "page-" + (i + 1))
                        .html(`Page&nbsp;${(i + 1)}`)
                        .appendTo(this.$content);
                }

                // Append the current page results
                for (const post of pageResult) {
                    const $article = Post.build(post, imageRatioChange, this.queryPage);
                    this.$content.append($article);
                    this.observer.observe($article[0]);
                }

                // If the loaded page has less than the absolute minimum value of posts per page,
                // then it's most likely the last one, as long as there is no custom query limit.
                if (!this.queryLimit && pageResult.length < 25) this.hasMorePages = false;
            }

            this.$wrapper
                .removeAttr("loading")
                .attr("infscroll", "ready");

            resolve();
        }).then(() => {

            this.reloadPaginator();
            this.reloadEventListeners();
            this.initHoverZoom();

            const scrollTo = $(`[page=${this.queryPage}]:visible:first`);
            if (preloadEnabled && this.queryPage > 1 && scrollTo.length !== 0) {
                $([document.documentElement, document.body])
                    .animate({ scrollTop: scrollTo.offset().top - 30 }, 200);
            }

            BlacklistEnhancer.update();
            this.updatePostCount();
        });
    }

    public static isPaused(): boolean { return BetterSearch.paused; }
    public static setPaused(state: boolean): void { BetterSearch.paused = state; }

    /** Creates the basic module structure */
    private createStructure(): void {

        // Post Container
        this.$wrapper = $("#content")
            .attr("loading", "true");

        $("<search-loading>")
            .html(`<span><div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div></span>`)
            .appendTo(this.$wrapper);

        // Quick Edit Form
        this.$quickEdit = $("<form>")
            .attr({
                "id": "re621-quick-tags",
                "postid": "invalid",
            })
            .addClass("simple_form")
            .html(
                `<input type="hidden" name="_method" value="put">` +
                `<div class="quick-tags-container">` +
                `   <textarea name="post[tag_string]" id="re621_qedit_tags" data-autocomplete="tag-edit" class="ui-autocomplete-input" autocomplete="off"></textarea>` +
                `</div>` +
                `<div class="quick-tags-toolbar">` +
                `   <input type="submit" name="submit" value="Submit">` +
                `   <input type="button" name="cancel" value="Cancel">` +
                `   <select name="post[rating]" id="re621_qedit_rating">
                        <option value="s">Safe</option>
                        <option value="q">Questionable</option>
                        <option value="e">Explicit</option>
                    </select>` +
                `</div>`
            )
            .appendTo(this.$wrapper)
            .hide();
        this.$quickEdit.data({
            "token": $("#re621_qedit_token"),
            "tags": $("#re621_qedit_tags"),
            "rating": $("#re621_qedit_rating"),
        });
        this.$quickEdit.find("input[name=cancel]").on("click", () => {
            console.log("cancelling");
            this.$quickEdit.hide("fast");
        });
        Danbooru.Autocomplete.initialize_all();

        this.$quickEdit.on("submit", (event) => {
            event.preventDefault();
            const postID = parseInt(this.$quickEdit.attr("postid"));

            E621.Post.id(postID).put({
                post: {
                    "tag_string": this.$quickEdit.data("tags").val() + "",
                    "rating": PostRating.fromValue(this.$quickEdit.data("rating").val() + ""),
                }
            }).then(
                (response) => {
                    console.log(response);

                    const $article = $("#entry_" + postID);
                    $article.data(PostData.fromAPI(response[0]["post"]));
                    $article
                        .trigger("re621:filters")
                        .trigger("re621:render");

                    Danbooru.notice(`Post <a href="/posts/${postID}" target="_blank">#${postID}</a> updated`);
                    this.$quickEdit.hide("fast");
                },
                (error) => {
                    Danbooru.error(`An error occurred while updating a post`);
                    console.log(error);
                    this.$quickEdit.hide("fast");
                }
            );
        });

        // Content
        this.$content = $("<search-content>")
            .appendTo(this.$wrapper);

        // Infinite Scroll
        const infscroll = $("<paginator-container>")
            .appendTo(this.$wrapper);
        $("<span>")
            .html(`<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>`)
            .appendTo(infscroll);
        this.$paginator = $("<paginator>")
            .html(``)
            .appendTo(infscroll);

        // Hover Zoom
        this.$zoomBlock = $("<zoom-container>")
            .attr({
                "status": "waiting",
            })
            .appendTo("body");
        this.$zoomInfo = $("<div>")
            .attr("id", "zoom-info")
            .appendTo(this.$zoomBlock);
        this.$zoomImage = $("<img>")
            .attr("src", DomUtilities.getPlaceholderImage())
            .appendTo(this.$zoomBlock);
        this.$zoomTags = $("<div>")
            .attr("id", "zoom-tags")
            .appendTo(this.$zoomBlock);
    }

    /** Refreshes the visible post count attribute */
    public updatePostCount(): void {
        this.$content.attr("posts", $("post:visible").length);
    }

    /** Re-renders the posts that are currently being displayed */
    public reloadRenderedPosts(): void {
        $("post[rendered=true]").trigger("re621:render");
    }

    /** Updates the content wrapper attributes and variables */
    public updateContentHeader(): void {
        const conf = this.fetchSettings([
            "imageSizeChange", "imageWidth", "imageRatioChange", "imageRatio",
            "ribbonsFlag", "ribbonsRel",
            "buttonsVote", "buttonsFav",
            "hidePageBreaks",
        ]);

        // Scaling Settings
        this.$content.removeAttr("style");
        if (conf.imageSizeChange) this.$content.css("--img-width", conf.imageWidth);
        if (conf.imageRatioChange) this.$content.css("--img-ratio", conf.imageRatio);

        // InfScroll separators
        if (conf.hidePageBreaks) this.$content.attr("hide-page-breaks", "true");
        else this.$content.removeAttr("hide-page-breaks");
    }

    /** Restarts various event listenerd used by the module */
    public reloadEventListeners(): void {
        this.reloadModeSwitchListener();
        this.reloadZoomListeners();
        this.reloadInfScrollListeners();
    }

    public reloadModeSwitchListener(): void {
        this.$content.on("click", "post a", (event) => {

            const mode = $("#mode-box-mode").val();
            if (mode == "view") return;
            event.preventDefault();

            const $article = $(event.currentTarget).parent(),
                post = PostData.get($article);

            switch (mode) {
                case "rating-q":
                case "rating-s":
                case "rating-e":
                case "lock-rating":
                case "lock-note":
                case "delete":
                case "undelete":
                case "approve":
                case "remove-parent":
                case "tag-script":

                case "add-to-set": { }
                case "remove-from-set": { }

                case "fake-click": {

                    // To avoid having to duplicate the functionality of every single mode,
                    // a fake article is created with all appropriate data, which is then
                    // used to trigger Danbooru's native functionality.

                    const $farticle = $("<article>")
                        .addClass("post-preview display-none")
                        .attr({
                            "id": "post_" + post.id,
                            "data-id": post.id,
                            "data-tags": post.tagString,
                        })
                        .appendTo("body");
                    $("<a>").appendTo($farticle)
                        .one("click", (event) => {
                            console.log($(event.target).closest("article").data("id"));
                            Danbooru.PostModeMenu.click(event);
                        })[0].click();
                    break;
                }
                case "vote-up": {
                    const firstVote = post.$ref.attr("vote") == undefined;

                    PostActions.vote(post.id, 1, firstVote).then(
                        (response) => {
                            console.log(response);

                            if (response.action == 0) {
                                if (firstVote) post.$ref.attr("vote", "1");
                                else post.$ref.attr("vote", "0");
                            } else post.$ref.attr("vote", response.action);

                            PostData.set(post, "score", response.score);
                            post.$ref.trigger("re621:update");
                        },
                        (error) => {
                            Danbooru.error("An error occurred while recording the vote");
                            console.log(error);
                        }
                    );
                    break;
                }
                case "vote-down": {
                    const firstVote = post.$ref.attr("vote") == undefined;

                    PostActions.vote(post.id, -1, false).then(
                        (response) => {
                            console.log(response);

                            if (response.action == 0) {
                                if (firstVote) post.$ref.attr("vote", "1");
                                else post.$ref.attr("vote", "0");
                            } else post.$ref.attr("vote", response.action);

                            PostData.set(post, "score", response.score);
                            post.$ref.trigger("re621:update");
                        },
                        (error) => {
                            Danbooru.error("An error occurred while recording the vote");
                            console.log(error);
                        }
                    );
                    break;
                }
                case "add-fav": {
                    E621.Favorite.id(post.id).delete();
                    PostData.set(post, "is_favorited", false);
                    post.$ref.removeAttr("fav");
                    break;
                }
                case "remove-fav": {
                    E621.Favorites.post({ "post_id": post.id });
                    PostData.set(post, "is_favorited", false);
                    post.$ref.attr("fav", "true");
                    break;
                }
                case "edit": {
                    this.$quickEdit.show("fast");
                    this.$quickEdit.attr("postid", post.id)
                    this.$quickEdit.data("tags").val(post.tagString).trigger("re621:input");
                    this.$quickEdit.data("rating").val(post.rating);
                    break;
                }
                default: {
                    Danbooru.error("Unknown mode");
                    break;
                }

            }

            console.log(post.id, mode);

        });
    }

    /** Restarts the even listeners used by the hover zoom submodule. */
    private reloadZoomListeners(): void {

        const zoomMode = this.fetchSettings("zoomMode");

        // Hover Zoom - Shift Hold
        $(document)
            .off("keydown.re621.zoom")
            .off("keyup.re621.zoom");
        $("#tags")
            .off("keydown.re621.zoom")
            .off("keyup.re621.zoom");

        if (zoomMode == ImageZoomMode.OnShift) {
            // This is necessary, because by default, the tag input is focused on page load
            // If shift press didn't work when input is focused, this could cause confusion
            $(document)
                .on("keydown.re621.zoom", null, "shift", () => {
                    if (this.shiftPressed) return;
                    this.shiftPressed = true;
                })
                .on("keyup.re621.zoom", null, "shift", () => {
                    this.shiftPressed = false;
                });
            $("#tags")
                .on("keydown.re621.zoom", null, "shift", () => {
                    if (this.shiftPressed) return;
                    this.shiftPressed = true;
                })
                .on("keyup.re621.zoom", null, "shift", () => {
                    this.shiftPressed = false;
                });
        }
    }

    /** Restarts the even listeners used by the infinite scroll submodule. */
    private reloadInfScrollListeners(): void {
        const fullpage = $(document),
            viewport = $(window);

        BetterSearch.off("scroll.infscroll");

        // Disable auto-loading if a post limit is specified
        if (!this.fetchSettings("infiniteScroll") || !this.fetchSettings("loadAutomatically") || this.queryLimit !== undefined) return;

        BetterSearch.on("scroll.infscroll", () => {

            // If there aren't any more posts, there's no need to keep checking this
            if (!this.hasMorePages) {
                BetterSearch.off("scroll.infscroll");
                return;
            }

            // Don't double-queue the loading process
            if (this.loadingPosts) return;

            // The next page should start loading either:
            // - when the user is one screen's height away from the bottom
            // - when the user is 90% though the page
            // The larger of the values (lower on the page) is chosen.
            // The former works best when a lot of pages are loaded, the latter - when there isn't a lot of content

            const pageHeight = fullpage.height(),
                viewHeight = viewport.height();

            //   vv   bottom of the viewport    vv              vv  one screen away  vv    vv    90% through    vv
            if ((viewport.scrollTop() + viewHeight) < Math.max((pageHeight - viewHeight), (fullpage.height() * 0.9))) return;

            // Trigger the loading process by clicking on "Load More" button
            $("#infscroll-next")[0].click();

        });
    }

    /** Initialize the event listeners for the hover zoom functionality */
    private initHoverZoom(): void {

        const viewport = $(window);
        BetterSearch.on("zoom.start", (event, data) => {
            if (BetterSearch.paused || (this.fetchSettings("zoomMode") == ImageZoomMode.OnShift && !this.shiftPressed))
                return;

            const $article = $("#entry_" + data)
                .attr("loading", "true");
            const post = PostData.get($article);

            // Load the image and its basic info
            this.$zoomBlock.attr("status", "loading");
            this.$zoomImage
                .attr("src", this.fetchSettings("zoomFull") ? post.file.original : post.file.sample)
                .one("load", () => {
                    this.$zoomBlock.attr("status", "ready");
                    $article.removeAttr("loading");
                });
            this.$zoomInfo.html(`${post.img.width} x ${post.img.height}, ${Util.formatBytes(post.file.size)}`);

            // Append the tags block
            if (this.fetchSettings("zoomTags"))
                this.$zoomTags.html(post.tagString);

            // Listen for mouse movements to move the preview accordingly
            let throttled = false;
            $(document).on("mousemove.re621.zoom", (event) => {

                // Throttle the mousemove events to 40 frames per second
                // Anything less than 30 feels choppy, but performance is a concern
                if (throttled) return;
                throttled = true;
                window.setTimeout(() => { throttled = false }, 25);

                const imgHeight = this.$zoomBlock.height(),
                    cursorX = event.pageX,
                    cursorY = event.pageY - viewport.scrollTop();

                const left = (cursorX < (viewport.width() / 2))
                    ? cursorX + 100                                 // left side of the screen
                    : cursorX - this.$zoomBlock.width() - 100;      // right side
                const top = Util.Math.clamp(cursorY - (imgHeight / 2), 10, (viewport.height() - imgHeight - 10));

                this.$zoomBlock.css({
                    "left": `${left}px`,
                    "top": `${top}px`,
                });

            });
        });
        BetterSearch.on("zoom.stop", (event, data) => {
            $(document).off("mousemove.re621.zoom");

            // Reset the preview window
            this.$zoomBlock
                .attr("status", "waiting")
                .css({
                    "left": 0,
                    "top": "100vh",
                });
            this.$zoomInfo.html("");
            this.$zoomImage.attr("src", DomUtilities.getPlaceholderImage());
            this.$zoomTags.html("");

            // If the post was loading, remove the spinner
            $("#entry_" + data).removeAttr("loading");
        });
    }

    /** Retrieves post data from an appropriate API endpoint */
    private async fetchPosts(page?: number): Promise<APIPost[]> {
        if (Page.matches(PageDefintion.favorites)) {
            const userID = Page.getQueryParameter("user_id") || User.getUserID();
            return E621.Favorites.get<APIPost>({ user_id: userID, page: page ? page : this.queryPage, limit: this.queryLimit }, 500)
        }
        return E621.Posts.get<APIPost>({ tags: this.queryTags, page: page ? page : this.queryPage, limit: this.queryLimit }, 500)
    }

    /** Loads the next page of results */
    private async loadNextPage(): Promise<boolean> {
        const search = await this.fetchPosts(this.queryPage + 1);
        if (search.length == 0) return Promise.resolve(false);

        this.queryPage += 1;

        const imageRatioChange = this.fetchSettings<boolean>("imageRatioChange");

        $("<post-break>")
            .attr("id", "page-" + this.queryPage)
            .html(`Page&nbsp;${this.queryPage}`)
            .appendTo(this.$content);

        for (const post of search) {
            const $article = Post.build(post, imageRatioChange, this.queryPage);
            this.$content.append($article);
            this.observer.observe($article[0]);
        }

        Page.setQueryParameter("page", this.queryPage + "");
        BetterSearch.trigger("tracker.update");
        BlacklistEnhancer.update();
        this.updatePostCount();

        return Promise.resolve(true);
    }

    /** Rebuilds the DOM structure of the paginator */
    public reloadPaginator(): void {

        this.$paginator.html("");

        if (this.queryPage == 1) {
            $("<span>")
                .html(`<i class="fas fa-angle-double-left"></i> Previous`)
                .appendTo(this.$paginator);
        } else {
            $("<a>")
                .attr("href", getPageURL(this.queryPage, false))
                .html(`<i class="fas fa-angle-double-left"></i> Previous`)
                .appendTo(this.$paginator);
        }

        if (this.fetchSettings("infiniteScroll")) {
            if (this.hasMorePages) {
                $("<a>")
                    .html("Load More")
                    .attr("id", "infscroll-next")
                    .appendTo(this.$paginator)
                    .one("click", (event) => {
                        event.preventDefault();

                        this.loadingPosts = true;
                        this.$wrapper.attr("infscroll", "loading");
                        this.loadNextPage().then((result) => {
                            this.hasMorePages = result;
                            this.$wrapper.attr("infscroll", "ready");
                            this.reloadPaginator();
                            this.loadingPosts = false;
                        });
                    });
            } else {
                $("<span>")
                    .html("No More Posts")
                    .attr("id", "infscroll-next")
                    .appendTo(this.$paginator)
            }
        } else $("<span>").appendTo(this.$paginator);

        if (this.hasMorePages) {
            $("<a>")
                .attr("href", getPageURL(this.queryPage, true))
                .html(`Next <i class="fas fa-angle-double-right"></i>`)
                .appendTo(this.$paginator);
        } else {
            $("<span>")
                .html(`Next <i class="fas fa-angle-double-right"></i>`)
                .appendTo(this.$paginator);
        }

        function getPageURL(currentPage: number, next: boolean): string {
            const url = new URL(window.location.toString())
            url.searchParams.set("page", (currentPage + (next ? 1 : -1)) + "");
            url.searchParams.set("nopreload", "true");
            return url.pathname + url.search;
        }

    }

}

export enum ImageLoadMethod {
    Disabled = "disabled",
    Hover = "hover",
    Always = "always",
}

export enum ImageZoomMode {
    Disabled = "disabled",
    Hover = "hover",
    OnShift = "onshift",
}

export enum ImageClickAction {
    Disabled = "disabled",
    NewTab = "newtab",
    CopyID = "copyid",
    Blacklist = "blacklist",
    AddToSet = "addtoset",
    ToggleSet = "toggleset",
}
