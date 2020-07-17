import { DomUtilities } from "../structure/DomUtilities";
import { APIPost } from "./responses/APIPost";

export class PostHtml {

    public static create(json: APIPost, lazyload = true, loadlarge = false): JQuery<HTMLElement> {
        //data-has-sound
        //data-flags
        const allTags = APIPost.getTagString(json);
        const $article = $("<article>")
            .attr({
                "id": "post_" + json.id,
                "data-id": json.id,
                "data-flags": this.getFlags(json).join(" "),
                "data-tags": allTags,
                "data-rating": json.rating,
                "data-uploader-id": json.uploader_id,
                "data-file-ext": json.file.ext,
                "data-file-url": json.file.url,
                "data-large-file-url": json.sample.url,       // yes, even though the name has large in it, sample is correct here
                "data-preview-file-url": json.preview.url,
                "data-uploader": json.uploader_id,
            })
            .addClass(this.getArticleClasses(json).join(" "));

        const $href = $("<a>")
            .addClass("preview-box")
            .attr("href", "/posts/" + json.id)
            .appendTo($article);
        const $picture = $("<picture>").appendTo($href);

        const $img = $("<img>")
            .addClass("has-cropped-false")
            .attr({
                "title": `Rating: ${json.rating}\nID: ${json.id}\nDate: ${json.created_at}\nScore: ${json.score.total}\n\n ${allTags}`,
                "alt": allTags,
                "src": DomUtilities.getPlaceholderImage(),
            })
            .appendTo($picture);

        $img.css("--native-ratio", json.file.height / json.file.width);
        $img.addClass("resized");

        if (!(json.file.ext === "swf" || $article.attr("data-flags").includes("deleted"))) {
            // Don't forget to update ThumbnailEnhancer accordingly
            $img.addClass(lazyload ? "lazyload" : "later-lazyload");

            if (loadlarge) $img.attr("data-src", json.sample.url);
            else $img.attr("data-src", json.preview.url);
        }

        const $desc = $("<div>")
            .attr("class", "desc")
            .appendTo($article);

        const $postScore = $("<div>")
            .attr("id", "post-score-" + json.id)
            .addClass("post-score")
            .appendTo($desc);

        // Score
        const scoreInfo = this.getScoreInfo(json);
        $("<span>")
            .addClass("post-score-score ")
            .addClass(scoreInfo.class)
            .text(scoreInfo.modifier + json.score.total)
            .appendTo($postScore);
        // Favs
        $("<span>")
            .addClass("post-score-faves")
            .text("\u2665" + json.fav_count)
            .appendTo($postScore);
        // Comments
        $("<span>")
            .addClass("post-score-comments")
            .text("C" + json.comment_count)
            .appendTo($postScore);
        // Rating
        $("<span>")
            .addClass("post-score-rating")
            .text(json.rating.toUpperCase())
            .appendTo($postScore);
        // Extra
        $("<span>")
            .addClass("post-score-extra")
            .text(this.getExtra(json))
            .appendTo($postScore);

        return $article;
    }

    private static getScoreInfo(json: APIPost): ScoreInfo {
        if (json.score.total === 0) {
            return {
                class: "score-neutral",
                modifier: "\u2195"
            };
        } else if (json.score.total > 0) {
            return {
                class: "score-positive",
                modifier: "\u2191"
            };
        } else {
            return {
                class: "score-negative",
                modifier: "\u2193"
            };
        }
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

        for (const flag of this.getFlags(json)) {
            result.push("post-status-" + flag);
        }

        if (json.relationships.has_active_children) {
            result.push("post-status-has-children");
        }
        if (json.relationships.parent_id !== null) {
            result.push("post-status-has-parent");
        }
        return result;
    }

    private static getFlags(json: APIPost): string[] {
        const result = [];
        if (json.flags.deleted) {
            result.push("deleted");
        } else if (json.flags.flagged) {
            result.push("flagged");
        } else if (json.flags.pending) {
            result.push("pending");
        }
        return result;
    }

    private static getExtra(json: APIPost): string {
        let result = "";
        if (json.relationships.parent_id !== null) {
            result += "P";
        }
        if (json.relationships.has_active_children) {
            result += "C";
        }
        if (json.flags.pending) {
            result += "U";
        }
        if (json.flags.flagged) {
            result += "F";
        }
        return result;
    }
}

interface ScoreInfo {
    class: string;
    modifier: string;
}
