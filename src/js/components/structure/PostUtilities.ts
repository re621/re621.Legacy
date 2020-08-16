import { BetterSearch, ImageClickAction, ImageLoadMethod, ImageZoomMode } from "../../modules/search/BetterSearch";
import { BlacklistEnhancer } from "../../modules/search/BlacklistEnhancer";
import { E621 } from "../api/E621";
import { APIPost } from "../api/responses/APIPost";
import { XM } from "../api/XM";
import { PostActions } from "../data/PostActions";
import { ModuleController } from "../ModuleController";
import { Util } from "../utility/Util";
import { DomUtilities } from "./DomUtilities";

export class PostUtilities {

    private static readonly mouseOverTimeout = 200;
    private static readonly doubleClickTimeout = 200;

    public static make(data: APIPost, page?: number): JQuery<HTMLElement> {

        const tags = APIPost.getTagSet(data),
            flags = APIPost.getFlagSet(data),
            animated = tags.has("animated") || data.file.ext == "webm" || data.file.ext == "gif";

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "post_" + data.id,
                "fav": data.is_favorited == true ? "true" : undefined,
                "state": "ready",
                "animated": animated ? "true" : undefined,
                "filetype": data.file.ext,
                "deleted": flags.has("deleted") ? "true" : undefined,
                "page": page ? page : undefined
            })
            .data({
                "id": data.id,
                "flags": flags,
                "score": data.score.total,
                "favorites": data.fav_count,
                "is_favorited": data.is_favorited == true,
                "comments": data.comment_count,
                "rating": data.rating,
                "uploader": data.uploader_id,

                "date": data.created_at,
                "date.ago": Util.Time.ago(data.created_at),

                "tags": tags,
                "tags.artist": data.tags.artist,
                "tags.copyright": data.tags.copyright,
                "tags.species": data.tags.species,
                "tags.character": data.tags.character,
                "tags.general": data.tags.general,
                "tags.invalid": data.tags.invalid,
                "tags.meta": data.tags.meta,
                "tags.lore": data.tags.lore,

                "file.ext": data.file.ext,
                "file.original": data.file.url,
                "file.sample": data.sample.url,
                "file.preview": data.preview.url,
                "file.size": data.file.size,

                "img.width": data.file.width,
                "img.height": data.file.height,
                "img.ratio": data.file.height / data.file.width,

                "rel.has_children": data.relationships.has_active_children,
                "rel.has_parent": data.relationships.parent_id !== undefined,
            });

        const $link = $("<a>")
            .attr({ "href": "/posts/" + data.id, })
            .appendTo($article);


        // Image
        const $img = $("<img>")
            .attr({
                "src": DomUtilities.getPlaceholderImage(),
                "alt": "post #" + data.id,
            })
            .addClass("lazyload")
            .appendTo($link);

        const $ribbons = $("<img-ribbons>")
            .appendTo($article);


        // Relationship Ribbons
        const relRibbon = $("<ribbon>")
            .addClass("left")
            .html(`<span></span>`)
            .appendTo($ribbons);
        let relRibbonText = "";

        if (data.relationships.has_active_children) {
            relRibbon.addClass("has-children");
            relRibbonText += "Child posts\n"
        }
        if (data.relationships.parent_id !== undefined) {
            relRibbon.addClass("has-parent");
            relRibbonText += "Parent posts\n"
        }

        if (relRibbonText != "") { relRibbon.attr("title", relRibbonText); }
        else relRibbon.remove();

        // Flag Ribbons
        const flagRibbon = $("<ribbon>")
            .addClass("right")
            .html(`<span></span>`)
            .appendTo($ribbons);
        let flagRibbonText = "";

        if (flags.has("flagged")) {
            flagRibbon.addClass("is-flagged");
            flagRibbonText += "Flagged\n"
        }
        if (flags.has("pending")) {
            flagRibbon.addClass("is-pending");
            flagRibbonText += "Pending\n"
        }

        if (flagRibbonText != "") { flagRibbon.attr("title", flagRibbonText); }
        else flagRibbon.remove();


        // Voting Buttons
        let buttonBlock = false;
        const $voteBox = $("<post-voting>")
            .appendTo($article);

        $("<button>")                           // Upvote
            .html(`<i class="far fa-thumbs-up"></i>`)
            .addClass("button voteButton vote post-vote-up-" + data.id + " score-neutral")
            .appendTo($voteBox)
            .click((event) => {
                event.preventDefault();
                if (buttonBlock) return;
                buttonBlock = true;
                Danbooru.Post.vote(data.id, 1);
                buttonBlock = false;
            });

        $("<button>")                           // Downvote
            .html(`<i class="far fa-thumbs-down"></i>`)
            .addClass("button voteButton vote post-vote-down-" + data.id + " score-neutral")
            .appendTo($voteBox)
            .click((event) => {
                event.preventDefault();
                if (buttonBlock) return;
                buttonBlock = true;
                Danbooru.Post.vote(data.id, -1);
                buttonBlock = false;
            });

        const $favorite = $("<button>")        // Favorite
            .html(`<i class="far fa-star"></i>`)
            .addClass("button voteButton fav post-favorite-" + data.id + " score-neutral" + (data.is_favorited ? " score-favorite" : ""))
            .appendTo($voteBox)
            .click(async (event) => {
                event.preventDefault();
                if (buttonBlock) return;
                buttonBlock = true;
                if ($article.data("is_favorited")) {
                    await E621.Favorite.id(data.id).delete();
                    $article.data("is_favorited", false)
                    $article.removeAttr("fav");
                    $favorite.removeClass("score-favorite");
                } else {
                    await E621.Favorites.post({ "post_id": data.id });
                    $article.data("is_favorited", true)
                    $article.attr("fav", "true");
                    $favorite.addClass("score-favorite");
                }
                buttonBlock = false;
            });


        // Post info
        $("<post-loading>")
            .html(`<i class="fas fa-circle-notch fa-2x fa-spin"></i>`)
            .appendTo($link);

        const scoreClass = data.score.total > 0 ? "positive" : (data.score.total < 0 ? "negative" : "neutral");
        $("<post-info>")
            .html(`
                <span class="post-info-score score-${scoreClass}">${data.score.total}</span>
                <span class="post-info-favorites">${data.fav_count}</span>
                <span class="post-info-comments">${data.comment_count}</span>
                <span class="post-info-rating rating-${data.rating}">${data.rating}</span>
            `)
            .appendTo($article);;

        // Listen for post updates to refresh the data
        $article.on("update.re621", () => { PostUtilities.update($article, $link, $img); });
        PostUtilities.update($article, $link, $img);

        return $article;
    }

    private static update($article: JQuery<HTMLElement>, $link: JQuery<HTMLElement>, $img: JQuery<HTMLElement>): void {
        // Fetch the settings
        const conf = ModuleController.get(BetterSearch).fetchSettings([
            "imageLoadMethod", "autoPlayGIFs",
            "imageRatioChange",
            "clickAction",
            "hoverTags",
            "zoomMode",
        ]);


        /* 1. Update Article Properties */
        // Favorite status
        if ($article.data("is_favorited")) $article.attr("fav", "true");
        else $article.removeAttr("fav");


        /* 2. Update Image Properties */
        // Handle upscaling
        const imgState = $article.attr("state");
        if (imgState == "ready") PostUtilities.handleUpscaling($article, $img, conf);

        // Set the image dimensions
        $img.removeAttr("style");
        if (!conf.imageRatioChange) $img.css("--img-ratio", $article.data("img.ratio"));

        // Handle double-click
        $link.off("click.re621.thumbnail")
            .off("dblclick.re621.thumbnail");
        if (conf.clickAction !== ImageClickAction.Disabled) PostUtilities.handleDoubleClick($article, $link, conf);

        // Add hover text
        if (conf.hoverTags) $img.attr("title", PostUtilities.getHoverText($article));
        else $img.removeAttr("title");

        // Establish the hover zoom event listeners
        $article.off("mouseenter.re621.zoom")
            .off("mouseleave.re621.zoom");
        if (conf.zoomMode !== ImageZoomMode.Disabled) PostUtilities.handleZoom($article);


    }

    /** Processes the upscaling routine */
    private static handleUpscaling($article: JQuery<HTMLElement>, $img: JQuery<HTMLElement>, conf: any): void {

        if ($article.data("file.ext") === "swf") {

            $article.data("img.ratio", 1);
            $img.addClass("placeholder-flash");
            $article.attr("state", "done");

        } else if ($article.data("flags").has("deleted")) {

            $article.data("img.ratio", 1);
            $img.addClass("placeholder-deleted");
            $article.attr("state", "done");

        } else {

            $article.off("mouseenter.re621.upscale")
                .off("mouseleave.re621.upscale");

            // Add dynamically-loaded highres thumbnails
            const sampleURL = $article.data("file.sample"),
                previewURL = $article.data("file.preview");

            if (conf.imageLoadMethod === ImageLoadMethod.Hover ||
                (conf.imageLoadMethod === ImageLoadMethod.Always && $article.data("file.ext") === "gif" && conf.autoPlayGIFs)) {
                $img.attr("data-src", previewURL);

                let timer: number;
                $article.on("mouseenter.re621.upscale", () => {

                    // only load sample after a bit of waiting
                    // this prevents loading images just by hovering over them to get to another one
                    timer = window.setTimeout(() => {
                        $article.attr("state", "loading");
                        $img.attr("data-src", sampleURL)
                            .addClass("lazyload")
                            .one("lazyloaded", () => { $article.attr("state", "done"); });
                    }, PostUtilities.mouseOverTimeout);
                });
                $article.on("mouseleave.re621.upscale", () => {
                    window.clearTimeout(timer);
                });
            } else if (conf.imageLoadMethod === ImageLoadMethod.Always) {
                $article.attr("state", "loading");
                $img.attr("data-src", sampleURL)
                    .addClass("lazyload")
                    .one("lazyloaded", () => { $article.attr("state", "done"); });
            } else {
                $img.attr("data-src", previewURL);
            }

        }
    }

    /** Processes the double click routine */
    private static handleDoubleClick($article: JQuery<HTMLElement>, $link: JQuery<HTMLElement>, conf: any): void {

        let dbclickTimer: number;
        let prevent = false;

        // Make it so that the doubleclick prevents the normal click event
        $link.on("click.re621.thumbnail", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
                // Make sure the click does not get triggered on the voting buttons
                ($(event.target).hasClass("voteButton") || $(event.target).parent().hasClass("voteButton")) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) { return; }

            // Handle the meta-key presses
            if (event.ctrlKey || event.metaKey) {
                XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
                return;
            }

            event.preventDefault();

            dbclickTimer = window.setTimeout(() => {
                if (!prevent) {
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
                prevent = false;
            }, PostUtilities.doubleClickTimeout);
        }).on("dblclick.re621.thumbnail", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
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

            const postID = $article.data("id");

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
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
            }
        });
    }

    /** Starts up the hover zoom process */
    private static handleZoom($article: JQuery<HTMLElement>): void {

        let timer: number,
            started = false;
        $article.on("mouseenter.re621.zoom", () => {
            timer = window.setTimeout(() => {
                started = true;
                BetterSearch.trigger("zoom.start", $article.data("id"));
            }, PostUtilities.mouseOverTimeout);
        });
        $article.on("mouseleave.re621.zoom", () => {
            window.clearTimeout(timer);
            if (started) {
                started = false;
                BetterSearch.trigger("zoom.stop", $article.data("id"));
            }
        });

    }

    /**
     * Returns a formatted tags section based on the provided post element
     * @param $article Post element
     */
    public static getHoverText($article: JQuery<HTMLElement>, html = false): string {
        const br = html ? "<br>\n" : "\n";
        return `` +
            `Post #${$article.data("id")}, posted on: ${Util.Time.format($article.data("date"))} (${$article.data("date.ago")})${br}` +
            `${[...$article.data("tags.artist"), ...$article.data("tags.copyright")].join(" ")}${br}` +
            `${[...$article.data("tags.character"), ...$article.data("tags.species")].join(" ")}${br}` +
            `${[...$article.data("tags.general"), ...$article.data("tags.invalid"), $article.data("tags.lore"), ...$article.data("tags.meta")].join(" ")}${br}` +
            ``;
    }
}
