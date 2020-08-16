import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { XM } from "../../components/api/XM";
import { Page, PageDefintion } from "../../components/data/Page";
import { PostActions } from "../../components/data/PostActions";
import { User } from "../../components/data/User";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { PostUtilities } from "../../components/structure/PostUtilities";
import { Util } from "../../components/utility/Util";
import { BlacklistEnhancer } from "./BlacklistEnhancer";

export class BetterSearch extends RE6Module {

    private static readonly PAGES_PRELOAD = 3;  // Number of pages to pre-load when `loadPrevPages` is true
    private static readonly HOVER_DELAY = 200;  // How long should a user hover over a post in order to trigger an event
    private static readonly CLICK_DELAY = 200;  // Timeout for double-click events

    private static paused = false;              // If true, stops several actions that may interfere with other modules

    private $wrapper: JQuery<HTMLElement>;      // Wrapper object containing the loading and content sections
    private $content: JQuery<HTMLElement>;      // Section containing post thumbnails

    private $zoomBlock: JQuery<HTMLElement>;    // Display area for the hover zoom
    private $zoomImage: JQuery<HTMLElement>;    // Image tag for hover zoom
    private $zoomInfo: JQuery<HTMLElement>;     // Posts's resolution and file size
    private $zoomTags: JQuery<HTMLElement>;     // Post's tags section displayed on hover

    private $paginator: JQuery<HTMLElement>;    // Pagination element

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

            ribbonsFlag: true,                              // Status ribbons - flagged / pending
            ribbonsRel: true,                               // Relations ribbons - parent / child posts
            buttonsVote: true,                              // Voting buttons
            buttonsFav: true,                               // Favorite button

            clickAction: ImageClickAction.NewTab,           // Action take when double-clicking the thumbnail

            infiniteScroll: true,                           // Seemlessly load more posts below the current ones
            loadAutomatically: true,                        // Load posts automatically while scrolling down
            loadPrevPages: true,                            // If enabled, will load 3 pages before the current one (if available)
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

        const preloadEnabled = Page.getQueryParameter("nopreload") !== "true";
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
        this.$content.on("update.re621", "post", (event) => {
            const $article = $(event.currentTarget),
                $link = $article.find("a").first(),
                $img = $link.find("img").first();

            PostUtilities.update($article, $link, $img);
        });

        // Initial post load
        new Promise(async (resolve) => {
            const firstPage = this.fetchSettings("loadPrevPages") && preloadEnabled
                ? Math.max((this.queryPage - BetterSearch.PAGES_PRELOAD), 1)
                : this.queryPage;

            const pageResult = await this.fetchPosts();
            if (pageResult.length == 0) {
                $("<span>")
                    .attr("id", "no-results")
                    .html("Nobody here but us chickens!")
                    .appendTo(this.$content);

                this.hasMorePages = false;
            } else {

                // Reload previous pages
                let result: APIPost[] = [];
                for (let i = firstPage; i < this.queryPage; i++) {
                    result = await this.fetchPosts(i);
                    for (const post of result)
                        this.$content.append(PostUtilities.make(post, i));
                    $("<post-break>")
                        .attr("id", "page-" + (i + 1))
                        .html(`Page&nbsp;${(i + 1)}`)
                        .appendTo(this.$content);
                }

                // Append the current page results
                for (const post of pageResult)
                    this.$content.append(PostUtilities.make(post, this.queryPage));

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

            this.initPageTracker();
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

    /** Triggers an update event on all loaded posts */
    public updateContentStructure(): void {
        this.$content.children("post").trigger("update.re621");
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

        // Ribbons
        if (conf.ribbonsFlag) this.$content.attr("ribbon-flag", "true");
        else this.$content.removeAttr("ribbon-flag");
        if (conf.ribbonsRel) this.$content.attr("ribbon-rel", "true");
        else this.$content.removeAttr("ribbon-rel");

        // Voting Buttons
        if (conf.buttonsVote) this.$content.attr("btn-vote", "true");
        else this.$content.removeAttr("btn-vote");
        if (conf.buttonsFav) this.$content.attr("btn-fav", "true");
        else this.$content.removeAttr("btn-fav");

        // InfScroll separators
        if (conf.hidePageBreaks) this.$content.attr("hide-page-breaks", "true");
        else this.$content.removeAttr("hide-page-breaks");
    }

    /** Restarts various event listenerd used by the module */
    public reloadEventListeners(): void {
        this.reloadVoteFavListeners();
        this.reloadUpscalingListeners();
        this.reloadDoubleClickListeners();
        this.reloadZoomListeners();
        this.reloadInfScrollListeners();
    }

    /**
     * Restarts the even listeners used by voting buttons.
     * Should only be called from `reloadEventListeners()`
     */
    private reloadVoteFavListeners(): void {

        const conf = this.fetchSettings(["buttonsVote", "buttonsFav"]);

        this.$content
            .off("click.re621.vote", "button.vote")
            .off("click.re621.vote", "button.fav");

        if (conf.buttonsVote) {
            this.$content.on("click.re621.vote", "button.vote", (event) => {
                event.preventDefault();

                const $target = $(event.currentTarget),
                    $article = $target.parents("post"),
                    id = parseInt($article.data("id"));

                if ($target.hasClass("vote-up")) Danbooru.Post.vote(id, 1);
                else if ($target.hasClass("vote-down")) Danbooru.Post.vote(id, -1);
                else Danbooru.error("Invalid post action");
            });
        }

        if (conf.buttonsFav) {
            let favBlock = false;
            this.$content.on("click.re621.vote", "button.fav", async (event) => {
                event.preventDefault();

                if (favBlock) return;
                favBlock = true;

                const $target = $(event.currentTarget),
                    $article = $target.parents("post"),
                    id = parseInt($article.data("id"));

                if ($article.data("is_favorited")) {
                    await E621.Favorite.id(id).delete();
                    $article.data("is_favorited", false)
                    $article.removeAttr("fav");
                    $target.removeClass("score-favorite");
                } else {
                    await E621.Favorites.post({ "post_id": id });
                    $article.data("is_favorited", true)
                    $article.attr("fav", "true");
                    $target.addClass("score-favorite");
                }

                favBlock = false;
            });
        }
    }

    /**
     * Restarts the even listeners used by the hover zoom submodule.  
     * Should only be called from `reloadEventListeners()`
     */
    private reloadUpscalingListeners(): void {

        const conf = this.fetchSettings(["imageLoadMethod", "autoPlayGIFs"]);

        this.$content
            .off("mouseenter.re621.upscale", "post[state=ready]")
            .off("mouseleave.re621.upscale", "post[state=ready]");

        if (conf.imageLoadMethod === ImageLoadMethod.Disabled) return;

        let timer: number;
        this.$content.on("mouseenter.re621.upscale", "post[state=ready]", (event) => {

            const $article = $(event.currentTarget),
                $img = $article.find("img").first();

            timer = window.setTimeout(() => {
                $article.attr("state", "loading");
                $img.attr("data-src", $article.data("file.sample"))
                    .addClass("lazyload")
                    .one("lazyloaded", () => {
                        $article
                            .attr("state", "done")
                            .off("mouseenter.re621.upscale")
                            .off("mouseleave.re621.upscale");
                    });
            }, BetterSearch.HOVER_DELAY);
        });
        this.$content.on("mouseleave.re621.upscale", "post[state=ready]", () => {
            window.clearTimeout(timer);
        });
    }

    /**
     * Restarts the even listeners used by the double click actions. 
     * Should only be called from `reloadEventListeners()`
     */
    private reloadDoubleClickListeners(): void {

        const conf = this.fetchSettings(["clickAction"]);

        this.$content
            .off("click.re621.dblextra", "post a")
            .off("dblclick.re621.dblextra", "post a");

        if (conf.clickAction == ImageClickAction.Disabled) return;

        let dbclickTimer: number;
        let prevent = false;

        // Make it so that the doubleclick prevents the normal click event
        this.$content.on("click.re621.dblextra", "post a", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) return;

            event.preventDefault();

            const $link = $(event.currentTarget);

            dbclickTimer = window.setTimeout(() => {
                if (!prevent) {
                    $link.off("click.re621.dblextra");
                    $link[0].click();
                }
                prevent = false;
            }, BetterSearch.CLICK_DELAY);

            return false;
        });
        this.$content.on("dblclick.re621.dblextra", "post a", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) { return; }

            event.preventDefault();
            window.clearTimeout(dbclickTimer);
            prevent = true;

            const $link = $(event.currentTarget),
                $article = $link.parent(),
                postID = $article.data("id");

            $article.addClass("highlight");
            window.setTimeout(() => $article.removeClass("highlight"), 250);

            switch (conf.clickAction) {
                case ImageClickAction.NewTab: {
                    XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
                    break;
                }
                case ImageClickAction.CopyID: {
                    Danbooru.notice(`Copied post ID to clipboard: <a href="/posts/${postID}" target="_blank">#${postID}</a>`);
                    XM.Util.setClipboard(postID + "", "text");
                    break;
                }
                case ImageClickAction.Blacklist: {
                    BlacklistEnhancer.toggleBlacklistTag("id:" + postID);
                    break;
                }
                case ImageClickAction.AddToSet: {
                    const lastSet = parseInt(window.localStorage.getItem("set"));
                    if (!lastSet) Danbooru.error(`Error: no set selected`);
                    else PostActions.addSet(lastSet, postID);
                    break;
                }
                case ImageClickAction.ToggleSet: {
                    const lastSet = parseInt(window.localStorage.getItem("set"));
                    if (!lastSet) Danbooru.error(`Error: no set selected`);
                    else PostActions.toggleSet(lastSet, postID);
                    break;
                }
                default: {
                    $link.off("click.re621.dblextra");
                    $link[0].click();
                }
            }
        });
    }

    /**
     * Restarts the even listeners used by the hover zoom submodule.  
     * Should only be called from `reloadEventListeners()`
     */
    private reloadZoomListeners(): void {

        const zoomMode = this.fetchSettings("zoomMode");

        // Hover Zoom - Mouseover
        this.$content
            .off("mouseenter.re621.zoom", "post")
            .off("mouseleave.re621.zoom", "post");
        if (zoomMode !== ImageZoomMode.Disabled) {
            let timer: number,
                started = false;
            this.$content.on("mouseenter.re621.zoom", "post", (event) => {
                const $article = $(event.currentTarget);
                timer = window.setTimeout(() => {
                    started = true;
                    BetterSearch.trigger("zoom.start", $article.data("id"));
                }, BetterSearch.HOVER_DELAY);
            });
            this.$content.on("mouseleave.re621.zoom", "post", () => {
                const $article = $(event.currentTarget);
                window.clearTimeout(timer);
                if (started) {
                    started = false;
                    BetterSearch.trigger("zoom.stop", $article.data("id"));
                }
            });
        }

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

    /**
     * Restarts the even listeners used by the infinite scroll submodule.  
     * Should only be called from `reloadEventListeners()`
     */
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

            // Viewport must be two screens away from the bottom
            if (viewport.scrollTop() < fullpage.height() - (viewport.height() * 2)) return;

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

            const $article = $("#post_" + data)
                .attr("loading", "true");

            // Load the image and its basic info
            this.$zoomBlock.attr("status", "loading");
            this.$zoomImage
                .attr("src", $article.data(this.fetchSettings("zoomFull") ? "file.original" : "file.sample"))
                .one("load", () => {
                    this.$zoomBlock.attr("status", "ready");
                    $article.removeAttr("loading");
                });
            this.$zoomInfo.html(`${$article.data("img.width")} x ${$article.data("img.height")}, ${Util.formatBytes($article.data("file.size"))}`);

            // Append the tags block
            if (this.fetchSettings("zoomTags"))
                this.$zoomTags.html([...$article.data("tags")].sort().join(" "));

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
            $("#post_" + data).removeAttr("loading");
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

        $("<post-break>")
            .attr("id", "page-" + this.queryPage)
            .html(`Page&nbsp;${this.queryPage}`)
            .appendTo(this.$content);

        for (const post of search)
            this.$content.append(PostUtilities.make(post, this.queryPage));

        BetterSearch.trigger("tracker.update");

        return Promise.resolve(true);
    }

    /** Sets the appropriate page query parameter depending on viewport location */
    private initPageTracker(): void {

        const viewport = $(window);

        const lookup = this.$content.find("[page]:visible");
        const firstPage = lookup.length == 0 ? 1 : parseInt(lookup.first().attr("page"));

        // Create a list of page references
        // If posts are added, or the visibility of ANY post changes, this needs to be triggered
        let refElements: { [index: number]: JQuery<HTMLElement> } = {};
        BetterSearch.on("tracker.update", () => {
            refElements = {};
            for (let index = firstPage; index <= this.queryPage; index++) {
                const elem = $(`[page=${index}]:visible:first`);
                if (elem.length > 0) refElements[index] = elem;
            }
        });
        BetterSearch.trigger("tracker.update");

        // Wait for the user to scroll past a reference post and set the corresponding page number
        BetterSearch.on("scroll.tracker", () => {
            for (const index of Object.keys(refElements).reverse()) {
                if (!isElementVisible(refElements[index])) continue;
                if (Page.getQueryParameter("page") == index) break;
                Page.setQueryParameter("page", index);
                break;
            }
        });

        function isElementVisible(element: JQuery<HTMLElement>): boolean {
            return element.offset().top < (viewport.scrollTop() + (viewport.height() * 0.5));
        }
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
