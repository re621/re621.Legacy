import { PostFlag } from "../../components/api/responses/APIPost";
import { ModuleController } from "../../components/ModuleController";
import { PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { BetterSearch } from "./BetterSearch";
import { CustomFlagger } from "./CustomFlagger";

export class ThumbnailTweaks extends RE6Module {

    public constructor () {
        super([], true);
    }

    protected getDefaultSettings (): Settings {
        return {
            enabled: true,
        };
    }

    public create (): void {
        super.create();

        const conf = ModuleController.get(BetterSearch).fetchSettings(["ribbonsRel", "ribbonsFlag"]);
        let count = 0;
        for (const element of $(".post-preview").get()) {
            ThumbnailTweaks.modify($(element), conf.ribbonsRel, conf.ribbonsFlag);
            count++;
        }
        Debug.log(`ThumbnailTweaks: ${count} elements`);
    }

    private static modify ($article: JQuery<HTMLElement>, ribbonsRel: boolean, ribbonsFlag: boolean): void {

        const post = PostData.fromThumbnail($article);
        CustomFlagger.addPost(post);

        // Sometimes, the image might not be wrapped in a picture tag properly
        // This is most common on comment pages and the like
        // If that bug gets fixed, this code can be removed
        let $picture = $article.find("picture");
        if ($picture.length == 0) {
            const $img = $article.find("img");
            $picture = $("<picture>").insertAfter($img).append($img);
        }

        // States and Ribbons
        $picture.addClass("picture-container");
        const $ribbons = $("<img-ribbons>").appendTo($picture);

        // Relationship Ribbons
        if (ribbonsRel) {
            const relRibbon = $("<ribbon>")
                .addClass("left")
                .html(`<span></span>`)
                .appendTo($ribbons);
            const relRibbonText = [];

            if (post.has.children) {
                relRibbon.addClass("has-children");
                relRibbonText.push("Child posts");
            }
            if (post.has.parent) {
                relRibbon.addClass("has-parent");
                relRibbonText.push("Parent posts");
            }

            if (relRibbonText.length > 0) relRibbon.attr("title", relRibbonText.join("\n"));
            else relRibbon.remove();
        }

        // Flag Ribbons
        if (ribbonsFlag) {

            const flagRibbon = $("<ribbon>")
                .addClass("right")
                .html(`<span></span>`)
                .appendTo($ribbons);
            const flagRibbonText = [];

            if (post.flags.has(PostFlag.Flagged)) {
                flagRibbon.addClass("is-flagged");
                flagRibbonText.push("Flagged");
            }
            if (post.flags.has(PostFlag.Pending)) {
                flagRibbon.addClass("is-pending");
                flagRibbonText.push("Pending");
            }

            if (flagRibbonText.length > 0) flagRibbon.attr("title", flagRibbonText.join("\n"));
            else flagRibbon.remove();
        }

        if ($ribbons.children().length == 0) $ribbons.remove();


        // Custom Flags
        const $flagBox = $("<post-flags>").appendTo($picture);

        for (const flag of CustomFlagger.getFlags(post)) {
            $("<span>")
                .addClass("custom-flag-thumb")
                .css("--flag-color", flag.color)
                .attr("title", flag.tags)
                .html(flag.name)
                .appendTo($flagBox);
        }
    }

}
