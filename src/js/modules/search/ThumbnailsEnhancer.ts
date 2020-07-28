import { Danbooru } from "../../components/api/Danbooru";
import { E621 } from "../../components/api/E621";
import { XM } from "../../components/api/XM";
import { PageDefintion } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Util } from "../../components/utility/Util";

export enum ThumbnailPerformanceMode {
    Disabled = "disabled",
    Hover = "hover",
    Always = "always",
}

export enum ThumbnailClickAction {
    Disabled = "disabled",
    NewTab = "newtab",
    CopyID = "copyid",
}

export enum FavSyncState {
    Unknown = 0,
    Required = 1,
    Finished = 2,
}

export class ThumbnailEnhancer extends RE6Module {

    private postsWrapper: JQuery<HTMLElement>;      // div#posts Hidden on start to hide page reflows
    private postsLoading: JQuery<HTMLElement>;      // Placeholder with some loading animations

    private postContainer: JQuery<HTMLElement>;     // Element containing posts - div#page used for compatibility

    private static favoritesList: Set<number>;

    private static zoomPaused = false;

    public constructor() {
        super([PageDefintion.search, PageDefintion.popular, PageDefintion.favorites, PageDefintion.comments], true);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            upscale: ThumbnailPerformanceMode.Hover,

            zoom: false,
            zoomScale: "2",
            zoomContextual: true,

            vote: true,
            fav: false,
            favSyncState: FavSyncState.Unknown,

            crop: true,
            cropSize: "150px",
            cropRatio: "0.9",
            cropPreserveRatio: false,

            ribbons: true,
            relRibbons: true,

            preserveHoverText: false,

            clickAction: ThumbnailClickAction.NewTab,
        };
    }

    public async prepare(): Promise<void> {
        await super.prepare();

        this.postsWrapper = $("div#posts")
            .addClass("display-none-important");
        this.postsLoading = $("<div>")
            .attr("id", "postContainerOverlay")
            .html(`
                <span>
                    <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                </span>
            `)
            .insertBefore(this.postsWrapper);
    }

    public create(): void {
        super.create();

        this.postContainer = $("div#page");

        const upscaleMode = this.fetchSettings<ThumbnailPerformanceMode>("upscale"),
            clickAction = this.fetchSettings<ThumbnailClickAction>("clickAction"),
            preserveHoverText = this.fetchSettings<boolean>("preserveHoverText");

        const thumbnails = this.postContainer.find<HTMLElement>("article.post-preview, div.post-preview").get();
        for (const thumb of thumbnails) {
            ThumbnailEnhancer.modifyThumbnail($(thumb), upscaleMode, clickAction, preserveHoverText);
        }

        this.toggleHoverZoom(this.fetchSettings("zoom"));
        this.setZoomScale(this.fetchSettings("zoomScale"));
        this.toggleZoomContextual(this.fetchSettings("zoomContextual"));

        this.toggleHoverVote(this.fetchSettings("vote"));

        this.toggleThumbCrop(this.fetchSettings("crop"));
        this.setThumbSize(this.fetchSettings("cropSize"));
        this.setThumbRatio(this.fetchSettings("cropRatio"));
        this.toggleThumbPreserveRatio(this.fetchSettings("cropPreserveRatio"))

        this.toggleStatusRibbons(this.fetchSettings("ribbons"));
        this.toggleRelationRibbons(this.fetchSettings("relRibbons"));

        this.postsLoading.addClass("display-none-important");
        this.postsWrapper.removeClass("display-none-important");

        ThumbnailEnhancer.on("pauseHoverActions.main", (event, zoomPaused) => {
            if (typeof zoomPaused === "undefined") return;
            if (zoomPaused) $("div#page").attr({ "data-thumb-zoom": "false", "data-thumb-vote": "false", });
            else {
                const module = ModuleController.get(ThumbnailEnhancer);
                $("div#page").attr({
                    "data-thumb-zoom": module.fetchSettings("zoom"),
                    "data-thumb-vote": module.fetchSettings("vote"),
                });
            }

            ThumbnailEnhancer.zoomPaused = zoomPaused;
        });
    }

    public destroy(): void {
        super.destroy();
        ThumbnailEnhancer.off("pauseHoverActions.main")
    }

    public async execute(): Promise<void> {
        ThumbnailEnhancer.favoritesList = new Set<number>(JSON.parse(window.localStorage.getItem("re621.favorites") || "[]"));

        ThumbnailEnhancer.on("favorite.main", (event, data) => {
            ThumbnailEnhancer.favoritesList = new Set<number>(JSON.parse(window.localStorage.getItem("re621.favorites") || "[]"));
            if (data.action) ThumbnailEnhancer.favoritesList.add(data.id);
            else ThumbnailEnhancer.favoritesList.delete(data.id);
            window.localStorage.setItem("re621.favorites", JSON.stringify(Array.from(ThumbnailEnhancer.favoritesList)));
        });
    }

    /**
     * Enables the zoom-on-hover functionality
     * @param state True to enable, false to disable
     */
    public toggleHoverZoom(state = true): void {
        this.postContainer.attr("data-thumb-zoom", state + "");
    }

    /**
     * Sets the ratio by which the thumbnail is scaled on hover
     * @param scale Value, above zero, below 10 (?)
     */
    public setZoomScale(scale: string): void {
        this.postContainer.css("--thumbnail-zoom", scale);
    }

    /**
     * Toggles the contextual zoom
     * @param state True to enable, false to suppress
     */
    public toggleZoomContextual(state = true): void {
        this.postContainer.attr("data-thumb-zoom-context", state + "");
    }

    /**
     * Enables the zoom-on-hover functionality
     * @param state True to enable, false to disable
     */
    public toggleHoverVote(state = true): void {
        this.postContainer.attr("data-thumb-vote", state + "");
    }

    /**
     * Crops the thumbnails to squares to minimize empty space
     * @param state True to crop, false to restore
     */
    public toggleThumbCrop(state = true): void {
        this.postContainer.attr("data-thumb-crop", state + "");
    }

    /**
     * Sets the thumbnail width. Does not support percent values.
     * @param size Value, in pixels, em, rem, whatever
     */
    public setThumbSize(size: string): void {
        this.postContainer.css("--thumbnail-size", size);
    }

    /**
     * Sets the height to width ratio for the thumbnail
     * @param ratio Value, from 0 to 2
     */
    public setThumbRatio(ratio: string): void {
        this.postContainer.css("--thumbnail-ratio", ratio);
    }

    /**
     * If set to true, ignores the forced thumbnail ratio in favor of the original one
     * @param state True to preserve, false to enforce
     */
    public toggleThumbPreserveRatio(state = true): void {
        this.postContainer.attr("data-thumb-preserve-ratio", state + "");
    }

    /**
     * Toggles the post flag ribbons
     * @param state True to enable, false to disable
     */
    public toggleStatusRibbons(state = true): void {
        this.postContainer.attr("data-thumb-ribbons", state + "");
    }

    /**
     * Toggles the post relation ribbons
     * @param state True to enable, false to disable
     */
    public toggleRelationRibbons(state = true): void {
        this.postContainer.attr("data-thumb-rel-ribbons", state + "");
    }

    public getFavCache(): Set<number> {
        return ThumbnailEnhancer.favoritesList;
    }

    public setFavCache(cache: Set<number>): void {
        ThumbnailEnhancer.favoritesList = cache;
        window.localStorage.setItem("re621.favorites", JSON.stringify(Array.from(ThumbnailEnhancer.favoritesList)));
    }

    /** Returns the size of the favorites cache */
    public getFavCacheSize(): number {
        return ThumbnailEnhancer.favoritesList.size;
    }

    /**
     * Converts the thumbnail into an enhancer-ready format
     * @param $article JQuery element `article.post-preview`
     * @param upscaleMode If / when to load upscaled versions of the image
     */
    public static async modifyThumbnail($article: JQuery<HTMLElement>, upscaleMode = ThumbnailPerformanceMode.Hover, clickAction = ThumbnailClickAction.NewTab, preserveHoverText: boolean): Promise<void> {

        /* Create the structure */
        const $link = $article.find<HTMLElement>("a").first(),
            postID = parseInt($article.attr("data-id")),
            $img = $article.find("img"),
            $imgData = $img.attr("title") ? $img.attr("title").split("\n").slice(0, -2) : [];     // Replace if the post date is added for the data-attributes.

        $article.find("source").remove();                               // If we ever have to worry about mobile users, this will need to be addressed.

        if (!preserveHoverText) $img.removeAttr("title");
        $img.attr("alt", "#" + $article.attr("data-id"));

        // Sometimes, the image might not be wrapped in a picture tag properly
        // This is most common on comment pages and the like
        // If that bug gets fixed, this code can be removed
        let $picture = $article.find("picture");
        if ($picture.length == 0) {
            const $img = $article.find("img");
            $picture = $("<picture>").insertAfter($img).append($img);
        }

        // Loading icon
        $link.addClass("preview-box");
        $("<div>")
            .addClass("preview-load")
            .html(`<i class="fas fa-circle-notch fa-2x fa-spin"></i>`)
            .appendTo($link);

        // Favorite state
        let isFavorited = ThumbnailEnhancer.favoritesList.has(postID);
        $article.attr("data-is-favorited", isFavorited + "");

        // States and Ribbons
        $picture.addClass("picture-container");

        // States
        const state = $("<div>")
            .addClass("rel-ribbon")
            .append($("<span>"))
            .appendTo($picture);
        let stateText = "";

        if ($article.hasClass("post-status-has-children")) {
            state.addClass("thumb-ribbon thumb-ribbon-has-children");
            stateText += "Child posts\n"
        }
        if ($article.hasClass("post-status-has-parent")) {
            state.addClass("thumb-ribbon thumb-ribbon-has-parent");
            stateText += "Parent posts\n"
        }

        if (state.hasClass("thumb-ribbon")) { state.addClass("left").attr("title", stateText); }
        else { state.remove(); }

        // Ribbons
        const ribbon = $("<div>")
            .addClass("flag-ribbon")
            .append($("<span>"))
            .appendTo($picture);
        let ribbonText = "";

        if ($article.hasClass("post-status-flagged")) {
            ribbon.addClass("thumb-ribbon thumb-ribbon-flagged");
            ribbonText += "Flagged\n"
        }
        if ($article.hasClass("post-status-pending")) {
            ribbon.addClass("thumb-ribbon thumb-ribbon-pending");
            ribbonText += "Pending\n"
        }

        if (ribbon.hasClass("thumb-ribbon")) { ribbon.addClass("right").attr("title", ribbonText); }
        else { ribbon.remove(); }

        // Description box that only shows up on hover
        const $extrasBox = $("<div>")
            .addClass("bg-highlight preview-extras")
            .appendTo($link);

        if ($imgData[4] === undefined) $("<span>").html("Score: ?").appendTo($extrasBox);
        else $("<span>").html($imgData[4]).appendTo($extrasBox);

        if ($imgData[0] === undefined) $("<span>").html("unknown").appendTo($extrasBox);
        else $("<span>").html(parseRating($imgData[0])).appendTo($extrasBox);

        if ($imgData[2] === undefined) $("<span>").html("unknown").appendTo($extrasBox);
        else $("<span>").html(parseDate($imgData[2])).appendTo($extrasBox);

        // Voting Buttons
        const $voteBox = $("<div>")
            .addClass("preview-voting")
            .appendTo($link);
        const $voteUp = $("<button>")           // Upvote
            .attr("href", "#")
            .html(`<i class="far fa-thumbs-up"></i>`)
            .addClass("button voteButton post-vote-up-" + postID + " score-neutral")
            .appendTo($voteBox);
        const $voteDown = $("<button>")        // Downvote
            .attr("href", "#")
            .html(`<i class="far fa-thumbs-down"></i>`)
            .addClass("button voteButton post-vote-down-" + postID + " score-neutral")
            .appendTo($voteBox);
        const $favorite = $("<button>")        // Favorite
            .attr("href", "#")
            .html(`<i class="far fa-star"></i>`)
            .addClass("button voteButton post-favorite-" + postID + " " + (isFavorited ? "score-favorite" : "score-neutral"))
            .appendTo($voteBox);

        let buttonBlock = false;
        $voteUp.click((event) => {
            event.preventDefault();
            if (buttonBlock) return;
            buttonBlock = true;
            Danbooru.Post.vote(postID, 1);
            buttonBlock = false;
        });
        $voteDown.click((event) => {
            event.preventDefault();
            if (buttonBlock) return;
            buttonBlock = true;
            Danbooru.Post.vote(postID, -1);
            buttonBlock = false;
        });
        $favorite.click(async (event) => {
            event.preventDefault();
            if (buttonBlock) return;
            buttonBlock = true;
            if (isFavorited) {
                isFavorited = false;
                E621.Favorites.find(postID).delete();
                ThumbnailEnhancer.trigger("favorite", { id: postID, action: false });
                $favorite.addClass("score-neutral").removeClass("score-favorite");
            } else {
                isFavorited = true;
                E621.Favorites.post({ "post_id": postID });
                ThumbnailEnhancer.trigger("favorite", { id: postID, action: true });
                $favorite.addClass("score-favorite").removeClass("score-neutral");
            }
            $article.attr("data-is-favorited", isFavorited + "");
            buttonBlock = false;
        })


        /* Handle double-click */
        let dbclickTimer: number;
        const delay = 200;
        let prevent = false;

        //Make it so that the doubleclick prevents the normal click event
        $link.on("click.re621.thumbnail", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Stop keeping track of double clicks if the zoom is paused
                (ThumbnailEnhancer.zoomPaused) ||
                // Make sure the click does not get triggered on the voting buttons
                ($(event.target).hasClass("voteButton") || $(event.target).parent().hasClass("voteButton")) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) { return; }

            event.preventDefault();

            dbclickTimer = window.setTimeout(() => {
                if (!prevent) {
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
                prevent = false;
            }, delay);
        }).on("dblclick.re621.thumbnail", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Stop keeping track of double clicks if the zoom is paused
                (ThumbnailEnhancer.zoomPaused) ||
                // Make sure the click does not get triggered on the voting buttons
                ($(event.target).hasClass("voteButton") || $(event.target).parent().hasClass("voteButton")) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) { return; }

            event.preventDefault();
            window.clearTimeout(dbclickTimer);
            prevent = true;

            $article.addClass("highlight");
            window.setTimeout(() => $article.removeClass("highlight"), 250);

            if (clickAction === ThumbnailClickAction.NewTab) XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
            else if (clickAction === ThumbnailClickAction.CopyID) XM.Util.setClipboard($article.attr("data-id"), "text");
            else {
                $link.off("click.re621.thumbnail");
                $link[0].click();
            }
        });


        /* Load the larger images */
        if ($article.attr("data-file-ext") === "swf" || $article.attr("data-flags").includes("deleted")) {
            // Replace placeholder images with CSS-styled ones
            // Don't forget to update PostHtml.create() accordingly

            $("<img>")
                .attr("src", DomUtilities.getPlaceholderImage())
                .css("--native-ratio", 1)
                .addClass("re621-placeholder-replacer resized")
                .appendTo($picture);
            $img.addClass("re621-placeholder-default");
            $picture.addClass("color-text post-placeholder");

            // <img class="has-cropped-true" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="#2234748">

            if ($article.attr("data-file-ext") === "swf") $picture.addClass("flash");
            if ($article.attr("data-flags") === "deleted") $picture.addClass("deleted");

        } else {
            // Add dynamically-loaded highres thumbnails

            const sampleURL = $article.attr("data-large-file-url");

            if (upscaleMode === ThumbnailPerformanceMode.Hover) {
                resolveRatio();

                let timer: number;
                $article.on("mouseenter", () => {
                    if (ThumbnailEnhancer.zoomPaused) return;

                    // only load sample after a bit of waiting
                    // this prevents loading images just by hovering over them to get to another one
                    timer = window.setTimeout(() => {
                        if ($img.attr("data-src") == sampleURL) return;

                        $link.addClass("loading");
                        $img.attr("data-src", sampleURL)
                            .addClass("lazyload")
                            .one("lazyloaded", () => {
                                $link.removeClass("loading");
                                $article.addClass("loaded");
                            });
                    }, 200);
                });
                $article.on("mouseleave", () => {
                    window.clearTimeout(timer);
                });
            } else if (upscaleMode === ThumbnailPerformanceMode.Always) {
                $link.addClass("loading");
                $img.attr("data-src", sampleURL)
                    .addClass($img.hasClass("later-lazyload") ? "" : "lazyload")
                    .one("lazyloaded", () => {
                        resolveRatio();
                        $link.removeClass("loading");
                        $article.addClass("loaded");
                    });
            } else {
                // Presume ThumbnailPerformanceMode.Disabled
                resolveRatio();
            }

        }

        function parseRating(input: string): string {
            switch (input) {
                case "Rating: e": return "Explicit";
                case "Rating: q": return "Questionable";
                case "Rating: s": return "Safe";
                default: return "Unknown";
            }
        }

        function parseDate(input: string): string {
            const date = new Date(input.split(": ").pop().replace(" ", "T").replace(" ", ""));
            return `<span title="` + date.toLocaleString() + `">` + Util.timeAgo(date) + `</span>`;
        }

        function resolveRatio(force = false): void {
            if (force || !$img.hasClass("resized")) {
                $img.css("--native-ratio", $img.height() / $img.width());
                $img.addClass("resized");
            }
        }

    }

}
