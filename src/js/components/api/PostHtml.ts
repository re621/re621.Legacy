import { DomUtilities } from "../structure/DomUtilities";
import { APIPost } from "./responses/APIPost";

export class PostHtml {

    public static create(json: APIPost, lazyload = true, loadlarge = false): JQuery<HTMLElement> {
        const allTags = APIPost.getTagString(json);
        const $article = $("<article>")
            .attr({
                "id": "post_" + json.id,
                "data-id": json.id,
                "data-flags": APIPost.getFlagString(json),
                "data-tags": allTags,
                "data-rating": json.rating,
                "data-uploader-id": json.uploader_id,
                "data-file-ext": json.file.ext,
                "data-file-url": json.file.url,
                "data-large-file-url": json.sample.url,       // yes, even though the name has large in it, sample is correct here
                "data-preview-file-url": json.preview.url,
                "data-uploader": json.uploader_id,
                // data-has-sound is not really used by e621, and is disabled here to improve performance
                // "data-has-sound": allTags.includes("video_with_sound") || allTags.includes("flash_with_sound"),
            })
            .addClass(this.getArticleClasses(json).join(" "));

        const $href = $("<a>")
            .addClass("preview-box")
            .attr("href", "/posts/" + json.id)
            .appendTo($article);
        const $picture = $("<picture>").appendTo($href);

        const $img = $("<img>")
            .addClass("has-cropped-false resized")
            .attr({
                "title": `Rating: ${json.rating}\nID: ${json.id}\nDate: ${json.created_at}\nScore: ${json.score.total}\n\n ${allTags}`,
                "alt": allTags,
                "src": DomUtilities.getPlaceholderImage(),
            })
            .css("--native-ratio", json.file.height / json.file.width)
            .appendTo($picture);

        if (!(json.file.ext === "swf" || $article.attr("data-flags").includes("deleted"))) {
            // Don't forget to update ThumbnailEnhancer accordingly
            $img.addClass(lazyload ? "lazyload" : "later-lazyload");

            if (loadlarge) $img.attr("data-src", json.sample.url);
            else $img.attr("data-src", json.preview.url);
        }

        const scoreInfo = this.getScoreInfo(json);
        $("<div>")
            .attr("class", "desc")
            .html(`
                <div class="post-score" id="post-score-${json.id}">
                    <span class="post-score-score ${scoreInfo.class}">${scoreInfo.modifier + json.score.total}</span>
                    <span class="post-score-faves">\u2665${json.fav_count}</span>
                    <span class="post-score-comments">C${json.comment_count}</span>
                    <span class="post-score-rating">${json.rating.toUpperCase()}</span>
                    <span class="post-score-extra">${this.getExtra(json)}</span>
                </div>
            `)
            .appendTo($article);

        return $article;
    }

    private static getScoreInfo(json: APIPost): { class: string; modifier: string } {
        if (json.score.total > 0) return { class: "score-positive", modifier: "\u2191" };
        if (json.score.total < 0) return { class: "score-negative", modifier: "\u2193" };
        return { class: "score-neutral", modifier: "\u2195" };
    }

    private static getArticleClasses(json: APIPost): string[] {
        const result = [
            "blacklisted",
            "captioned",
            "post-preview"
        ];

        switch (json.rating) {
            case "s":
                result.push("post-rating-safe");
                break;
            case "q":
                result.push("post-rating-questionable");
                break;
            case "e":
                result.push("post-rating-explicit");
                break;
        }

        for (const flag of APIPost.getFlagSet(json))
            result.push("post-status-" + flag);

        if (json.relationships.has_active_children)
            result.push("post-status-has-children");

        if (json.relationships.parent_id !== null)
            result.push("post-status-has-parent");

        return result;
    }

    private static getExtra(json: APIPost): string {
        let result = "";
        if (json.relationships.parent_id !== null) result += "P";
        if (json.relationships.has_active_children) result += "C";
        if (json.flags.pending) result += "U";
        if (json.flags.flagged) result += "F";
        return result;
    }
}
