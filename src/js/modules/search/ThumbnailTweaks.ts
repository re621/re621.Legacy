import { ModuleController } from "../../components/ModuleController";
import { PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { BetterSearch } from "./BetterSearch";
import { CustomFlagger } from "./CustomFlagger";

export class ThumbnailTweaks extends RE6Module {

    public constructor() {
        super();
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
        };
    }

    public create(): void {
        super.create();

        const conf = ModuleController.get(BetterSearch).fetchSettings(["ribbonsRel", "ribbonsFlag"]);
        for (const element of $(".post-preview").get()) {
            ThumbnailTweaks.modify($(element), conf.ribbonsRel, conf.ribbonsFlag);
        }
    }

    private static modify($article: JQuery<HTMLElement>, ribbonsRel: boolean, ribbonsFlag: boolean): void {

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

            if ($article.attr("data-has-children") == "true") {
                relRibbon.addClass("has-children");
                relRibbonText.push("Child posts");
            }
            if ($article.attr("data-parent-id") !== undefined) {
                relRibbon.addClass("has-parent");
                relRibbonText.push("Parent posts");
            }

            if (relRibbonText.length > 0) relRibbon.attr("title", relRibbonText.join("\n"));
            else relRibbon.remove();
        }

        // Flag Ribbons
        if (ribbonsFlag) {
            const flags = new Set(($article.attr("data-flags") || "").split(" "));

            const flagRibbon = $("<ribbon>")
                .addClass("right")
                .html(`<span></span>`)
                .appendTo($ribbons);
            const flagRibbonText = [];

            if (flags.has("flagged")) {
                flagRibbon.addClass("is-flagged");
                flagRibbonText.push("Flagged");
            }
            if (flags.has("pending")) {
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
