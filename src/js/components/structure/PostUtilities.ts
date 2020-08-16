import { BetterSearch, ImageLoadMethod } from "../../modules/search/BetterSearch";
import { APIPost } from "../api/responses/APIPost";
import { ModuleController } from "../ModuleController";
import { Util } from "../utility/Util";
import { DomUtilities } from "./DomUtilities";

export class PostUtilities {

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
        const $voteBox = $("<post-voting>")
            .appendTo($article);

        $("<button>")   // Upvote
            .html(`<i class="far fa-thumbs-up"></i>`)
            .addClass("button voteButton vote vote-up post-vote-up-" + data.id + " score-neutral")
            .appendTo($voteBox);

        $("<button>")   // Downvote
            .html(`<i class="far fa-thumbs-down"></i>`)
            .addClass("button voteButton vote vote-down post-vote-down-" + data.id + " score-neutral")
            .appendTo($voteBox);

        $("<button>")   // Favorite
            .html(`<i class="far fa-star"></i>`)
            .addClass("button voteButton fav post-favorite-" + data.id + " score-neutral" + (data.is_favorited ? " score-favorite" : ""))
            .appendTo($voteBox);


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
        PostUtilities.update($article, $link, $img);

        return $article;
    }

    public static update($article: JQuery<HTMLElement>, $link: JQuery<HTMLElement>, $img: JQuery<HTMLElement>): void {
        // Fetch the settings
        const conf = ModuleController.get(BetterSearch).fetchSettings([
            "imageLoadMethod", "autoPlayGIFs",
            "imageRatioChange",
            "hoverTags",
            "clickAction",
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

        // Add hover text
        if (conf.hoverTags) $img.attr("title", PostUtilities.getHoverText($article));
        else $img.removeAttr("title");

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

            // Add dynamically-loaded highres thumbnails
            const sampleURL = $article.data("file.sample"),
                previewURL = $article.data("file.preview");

            if (conf.imageLoadMethod === ImageLoadMethod.Hover ||
                (conf.imageLoadMethod === ImageLoadMethod.Always && $article.data("file.ext") === "gif" && !conf.autoPlayGIFs)) {

                $img.attr("data-src", previewURL);
                // The rest is handled via a delegated event in `BetterSearch`

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
