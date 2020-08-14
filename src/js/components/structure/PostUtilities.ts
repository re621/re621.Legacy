import { BetterSearch, ImageLoadMethod } from "../../modules/search/BetterSearch";
import { APIPost } from "../api/responses/APIPost";
import { ModuleController } from "../ModuleController";
import { DomUtilities } from "./DomUtilities";

export class PostUtilities {

    public static make(data: APIPost): JQuery<HTMLElement> {

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "post_" + data.id,
            })
            .data({
                "id": data.id,
                "flags": APIPost.getFlagSet(data),
                "score": data.score.total,
                "favorites": data.fav_count,
                "is_favorited": data.is_favorited == true,
                "comments": data.comment_count,
                "rating": data.rating,
                "uploader": data.uploader_id,

                "tags": APIPost.getTags(data),
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

                "img.width": data.file.width,
                "img.height": data.file.height,
                "img.ratio": data.file.height / data.file.width,

                "rel.has_children": data.relationships.has_active_children,
                "rel.has_parent": data.relationships.parent_id !== undefined,
            });

        const $link = $("<a>")
            .attr({ "href": "/posts/" + data.id, })
            .appendTo($article);

        const $img = $("<img>")
            .attr({
                "src": DomUtilities.getPlaceholderImage(),
                "alt": "post #" + data.id,
            })
            .appendTo($link);

        const $postInfo = $("<post-info>")
            .appendTo($article);

        // Listen for post updates to refresh the data
        $article.on("update.re621", update);
        update();

        return $article;

        function update(): void {
            // Fetch the settings
            const conf = ModuleController.get(BetterSearch).fetchSettings(["imageLoadMethod", "hoverTags"]);

            // Update the article
            if ($article.data("is_favorited")) $article.attr("fav", "true");
            else $article.removeAttr("fav");

            // Update the image
            if ($article.data("file.ext") !== "swf" && !$article.data("flags").has("deleted")) {
                // TODO Check that setting the same source does not reload the image
                if (conf.imageLoadMethod == ImageLoadMethod.Always) $img.attr("data-src", $article.data("file.sample"));
                else $img.attr("data-src", $article.data("file.preview"));
                $img.addClass("lazyload");
            }

            if (conf.hoverTags) $img.attr("title", $article.data("tags"));   // TODO Make this prettier
            else $img.removeAttr("title");

            // Update postInfo
            const info = {
                score: $article.data("score"),
                favorites: $article.data("favorites"),
                comments: $article.data("comments"),
                rating: $article.data("rating"),
            };

            const scoreClass = info.score > 0 ? "positive" : (info.score < 0 ? "negative" : "neutral");

            $postInfo.html(`
                <span class="post-info-score score-${scoreClass}">${info.score}</span>
                <span class="post-info-favorites">\u2665${info.favorites}</span>
                <span class="post-info-comments">C${info.comments}</span>
                <span class="post-info-rating rating-${info.rating}">${info.rating}</span>
            `);
        }
    }

}
