import { BetterSearch } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { APIPost } from "../api/responses/APIPost";
import { Blacklist } from "../data/Blacklist";
import { ModuleController } from "../ModuleController";
import { PostData } from "./PostData";
import { PostParts } from "./PostParts";

export class Post {

    public static build(data: APIPost, imageRatioChange: boolean, page?: number): JQuery<HTMLElement> {

        const post = PostData.fromAPI(data, page),
            animated = post.tags.all.has("animated") || data.file.ext == "webm" || data.file.ext == "gif";

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "entry_" + data.id,
                "fav": data.is_favorited == true ? "true" : undefined,
                "vote": undefined,
                "animated": animated ? "true" : undefined,
                "filetype": data.file.ext,
                "deleted": post.flags.has("deleted") ? "true" : undefined,
                "rendered": false,
            })
            .data(post)
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
            .attr({ "rendered": false, })
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
