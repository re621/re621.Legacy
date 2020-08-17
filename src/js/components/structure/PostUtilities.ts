import { BetterSearch, ImageLoadMethod } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { APIPost, PostRating } from "../api/responses/APIPost";
import { Blacklist } from "../data/Blacklist";
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
                id: data.id,
                flags: flags,
                score: data.score.total,
                favorites: data.fav_count,
                is_favorited: data.is_favorited == true,
                comments: data.comment_count,
                rating: data.rating,
                uploader: data.uploader_id,

                date: {
                    raw: data.created_at,
                    ago: Util.Time.ago(data.created_at),
                },

                tags: {
                    all: tags,
                    artist: new Set(data.tags.artist),
                    copyright: new Set(data.tags.copyright),
                    species: new Set(data.tags.species),
                    character: new Set(data.tags.character),
                    general: new Set(data.tags.general),
                    invalid: new Set(data.tags.invalid),
                    meta: new Set(data.tags.meta),
                    lore: new Set(data.tags.lore),
                },

                file: {
                    ext: data.file.ext,
                    original: data.file.url,
                    sample: data.sample.url,
                    preview: data.preview.url,
                    size: data.file.size,
                },

                img: {
                    width: data.file.width,
                    height: data.file.height,
                    ratio: data.file.height / data.file.width,
                },

                has: {
                    children: data.relationships.has_active_children,
                    parent: data.relationships.parent_id !== undefined,
                },

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
            .appendTo($article);


        // Custom Flags
        const $flagBox = $("<post-flags>")
            .appendTo($article);

        // Listen for post updates to refresh the data
        PostUtilities.update($article, $img, $flagBox);

        return $article;
    }

    public static update($article: JQuery<HTMLElement>, $img?: JQuery<HTMLElement>, $flagBox?: JQuery<HTMLElement>): void {
        if ($img == undefined) $img = $article.find("img").first();
        if ($flagBox == undefined) $flagBox = $article.find("post-flags").first();

        // console.log("updating " + $article.data("id"));

        // Fetch the settings
        const conf = ModuleController.get(BetterSearch).fetchSettings([
            "imageLoadMethod", "autoPlayGIFs",
            "imageRatioChange",
            "hoverTags",
            "clickAction",
        ]);
        const post = Post.get($article);


        /* 1. Update Article Properties */
        // Favorite status
        if (post.is_favorited) $article.attr("fav", "true");
        else $article.removeAttr("fav");


        /* 2. Update Image Properties */
        // Handle upscaling
        const imgState = $article.attr("state");
        if (imgState == "ready") PostUtilities.handleUpscaling($article, $img, conf);

        // Set the image dimensions
        $img.removeAttr("style");
        if (!conf.imageRatioChange) $img.css("--img-ratio", post.img.ratio);

        // Add hover text
        if (conf.hoverTags) $img.attr("title", PostUtilities.getHoverText($article));
        else $img.removeAttr("title");


        /* 3. Update the blacklist */
        Blacklist.addPost(post);
        PostUtilities.updateVisibility($article);


        /* 4. Reload the custom flags */
        CustomFlagger.addPost(post);
        $flagBox.html("");
        for (const flag of CustomFlagger.getFlags(post)) {
            $("<span>")
                .addClass("custom-flag-thumb")
                .css("--flag-color", flag.color)
                .attr("title", flag.tags)
                .html(flag.name)
                .appendTo($flagBox);
        }

    }

    public static updateVisibility($article: JQuery<HTMLElement>): void {
        if (Blacklist.checkPost($article.data("id")))
            $article.attr("blacklisted", "true");
        else $article.removeAttr("blacklisted");
    }

    /** Processes the upscaling routine */
    private static handleUpscaling($article: JQuery<HTMLElement>, $img: JQuery<HTMLElement>, conf: any): void {

        const post = Post.get($article);

        if (post.file.ext === "swf") {

            post.img.ratio = 1;
            Post.save(post);
            $img.addClass("placeholder-flash");
            $article.attr("state", "done");

        } else if (post.flags.has("deleted")) {

            post.img.ratio = 1;
            Post.save(post);
            $img.addClass("placeholder-deleted");
            $article.attr("state", "done");

        } else {

            // Add dynamically-loaded high-res thumbnails
            if (conf.imageLoadMethod === ImageLoadMethod.Hover ||
                (conf.imageLoadMethod === ImageLoadMethod.Always && post.file.ext === "gif" && !conf.autoPlayGIFs)) {

                $img.attr("data-src", post.file.preview);
                // The rest is handled via a delegated event in `BetterSearch`

            } else if (conf.imageLoadMethod === ImageLoadMethod.Always) {
                $article.attr("state", "loading");
                $img.attr("data-src", post.file.sample)
                    .addClass("lazyload")
                    .one("lazyloaded", () => { $article.attr("state", "done"); });
            } else {
                $img.attr("data-src", post.file.preview);
            }

        }
    }

    /**
     * Returns a formatted tags section based on the provided post element
     * @param $article Post element
     */
    public static getHoverText($article: JQuery<HTMLElement>, html = false): string {
        const br = html ? "<br>\n" : "\n";
        const post = Post.get($article);
        return `` +
            `Post #${post.id}, posted on: ${Util.Time.format(post.date.raw)} (${post.date.ago})${br}` +
            `${[...post.tags.artist, ...post.tags.copyright].join(" ")}${br}` +
            `${[...post.tags.character, ...post.tags.species].join(" ")}${br}` +
            `${[...post.tags.general, ...post.tags.invalid, ...post.tags.lore, ...post.tags.meta].join(" ")}${br}` +
            ``;
    }
}

export interface Post {

    $ref: JQuery<HTMLElement>;

    id: number;
    flags: Set<string>;
    score: number;
    favorites: number;
    is_favorited: boolean;
    comments: number;
    rating: PostRating;
    uploader: number;

    date: {
        raw: string;
        ago: string;
    };

    tags: {
        all: Set<string>;
        artist: Set<string>;
        copyright: Set<string>;
        species: Set<string>;
        character: Set<string>;
        general: Set<string>;
        invalid: Set<string>;
        meta: Set<string>;
        lore: Set<string>;
    };

    file: {
        ext: string;
        original: string;
        sample: string;
        preview: string;
        size: number;
    };

    img: {
        width: number;
        height: number;
        ratio: number;
    };

    has: {
        children: boolean;
        parent: boolean;
    };

}

export namespace Post {

    export function get($article: JQuery<HTMLElement>): Post {
        const output = $article.data();
        output["$ref"] = $article;
        return output as Post;
    }

    export function save(data: Post): void {
        const output = jQuery.extend(true, {}, data);
        delete output.$ref;
        data.$ref.data(output);
    }

    export function set(data: Post, element: string, value: any): void {
        data.$ref.data(element, value);
    }
}
