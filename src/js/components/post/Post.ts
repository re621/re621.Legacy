import { BetterSearch } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { APIPost } from "../api/responses/APIPost";
import { Blacklist } from "../data/Blacklist";
import { ModuleController } from "../ModuleController";
import { Util } from "../utility/Util";
import { PostData } from "./PostData";
import { PostParts } from "./PostParts";

export class Post {

    public static build(data: APIPost, imageRatioChange: boolean, page?: number): JQuery<HTMLElement> {

        const tags = APIPost.getTagSet(data),
            flags = APIPost.getFlagSet(data),
            animated = tags.has("animated") || data.file.ext == "webm" || data.file.ext == "gif";

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "post_" + data.id,
                "fav": data.is_favorited == true ? "true" : undefined,
                "animated": animated ? "true" : undefined,
                "filetype": data.file.ext,
                "deleted": flags.has("deleted") ? "true" : undefined,
                "page": page ? page : undefined,
                "rendered": false,
            })
            .data({
                id: data.id,
                flags: flags,
                score: data.score.total,
                user_vote: 0,
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
                loaded: undefined,

                img: {
                    width: data.file.width,
                    height: data.file.height,
                    ratio: data.file.height / data.file.width,
                },

                has: {
                    children: data.relationships.has_active_children,
                    parent: data.relationships.parent_id !== undefined,
                },

            })
            .html(data.id + "");

        if (!imageRatioChange) $article.css("--img-ratio", (data.file.height / data.file.width) + "");

        // Register for blacklist and custom flagger
        Post.updateFilters($article);
        Post.updateVisibility($article);

        return $article;
    }

    public static render($article: JQuery<HTMLElement>): JQuery<HTMLElement> {

        const post = PostData.get($article);
        const conf = ModuleController.get(BetterSearch).fetchSettings([
            "imageRatioChange",                                 // renderArticle
            "clickAction", "zoomMode",                          // renderLink
            "imageLoadMethod", "autoPlayGIFs", "hoverTags",     // renderImage
            "ribbonsFlag", "ribbonsRel",                        // renderRibbons
            "buttonsVote", "buttonsFav",                        // renderButtons
        ]);

        // Reset the article state
        $article
            .attr({
                "fav": post.is_favorited == true ? "true" : undefined,
                "rendered": true,
            })
            .removeAttr("style")
            .html("");

        // Render elements
        $article
            .append(PostParts.renderImage(post, conf))       // Image
            .append(PostParts.renderRibbons(post, conf))     // Ribbons
            .append(PostParts.renderButtons(post, conf))     // Voting Buttons
            .append(PostParts.renderFlags(post))             // Custom Flags
            .append(PostParts.renderInfo(post))              // Post info

        if (!conf.imageRatioChange) $article.css("--img-ratio", post.img.ratio);

        // Refresh blacklist state
        Post.updateVisibility($article);

        return $article;
    }

    public static reset($article: JQuery<HTMLElement>): JQuery<HTMLElement> {
        $article
            .attr({
                "state": "done",
                "rendered": false,
            })
            .html($article.data("id"))
            .children().remove();
        return $article;
    }

    public static updateFilters($article: JQuery<HTMLElement>): void {
        const post = PostData.get($article);
        CustomFlagger.addPost(post);
        Blacklist.addPost(post);
    }

    public static updateVisibility($article: JQuery<HTMLElement>): void {
        if (Blacklist.checkPost($article.data("id")))
            $article.attr("blacklisted", "true");
        else $article.removeAttr("blacklisted");
    }

}
