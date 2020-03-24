import { ApiPost } from "./responses/ApiPost";

export class PostHtml {
    public static create(json: ApiPost) {
        //data-has-sound
        //data-flags
        //data-uploader
        const tags = json.tags;
        //this must be possible in another way
        const allTags = tags.artist.concat(tags.character, tags.copyright, tags.general,
            tags.invalid, tags.lore, tags.meta, tags.species).join(" ");
        let $article = $("<article>").
            attr("id", "post_" + json.id).
            attr("data-id", json.id).
            attr("data-flags", this.getFlags(json).join(" ")).
            attr("data-tags", allTags).
            attr("data-rating", json.rating).
            attr("data-uploader-id", json.uploader_id).
            attr("data-file-ext", json.file.ext).
            attr("data-file-url", json.file.url).
            attr("data-large-file-url", json.sample.url).       //yes, even though the name has large in it, sample is correct here
            attr("data-preview-file-url", json.preview.url).
            attr("data-uploader", json.uploader_id);            // TODO temporary, replace with actual uploader name

        for (const className of this.getArticleClasses(json)) {
            $article.addClass(className);
        }
        let $href = $("<a>").
            attr("href", "/posts/" + json.id);
        let $picture = $("<picture>");
        $picture.append($("<source>").
            attr("media", "(max-width: 800px)").
            attr("srcset", json.preview.url));
        //TODO title status
        $picture.append($("<img>").
            attr("class", "has-cropped-false").
            attr("src", json.preview.url).
            attr("title", `Rating: ${json.rating}\nID: ${json.id}\nDate: ${json.created_at}\nScore: ${json.score.total}\n\n ${allTags}`).
            attr("alt", allTags));

        $href.append($picture);
        let $desc = $("<div>").
            attr("class", "desc");
        let $postScore = $("<div>").attr("id", "post-score-" + json.id).attr("class", "post-score");

        //Score
        const scoreInfo = this.getScoreInfo(json);
        $postScore.append($("<span>").
            addClass("post-score-score ").
            addClass(scoreInfo.class).
            text(scoreInfo.modifier + json.score.total));
        //Favs
        $postScore.append($("<span>").
            addClass("post-score-faves").
            text("\u2665" + json.fav_count));
        //Comments
        $postScore.append($("<span>").
            addClass("post-score-comments").
            text("C" + json.comment_count));
        //Rating
        $postScore.append($("<span>").
            addClass("post-score-rating").
            text(json.rating.toUpperCase()));
        //Extra
        $postScore.append($("<span>").
            addClass("post-score-extra").
            text(this.getExtra(json)));

        //Append to main container
        $desc.append($postScore);
        $article.append($href);
        $article.append($desc);
        return $article;
    }

    private static getScoreInfo(json: ApiPost) {
        if (json.score.total === 0) {
            return {
                class: "score-neutral",
                modifier: "\u2195"
            };
        } else if (json.score.total > 0) {
            return {
                class: "score-positive",
                modifier: "\u2191"
            }
        } else {
            return {
                class: "score-negative",
                modifier: "\u2193"
            }
        }
    }

    private static getArticleClasses(json: ApiPost) {
        let result = [
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

    private static getFlags(json: ApiPost) {
        const result = [];
        if (json.flags.deleted) {
            result.push("deleted");
        } else if (json.flags.flagged) {
            result.push("flagged");
        } else if (json.flags.pending) {
            result.push("pending")
        }
        return result;
    }

    private static getExtra(json: ApiPost) {
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
