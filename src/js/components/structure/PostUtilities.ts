import { BetterSearch, ImageClickAction, ImageLoadMethod } from "../../modules/search/BetterSearch";
import { BlacklistEnhancer } from "../../modules/search/BlacklistEnhancer";
import { APIPost } from "../api/responses/APIPost";
import { XM } from "../api/XM";
import { PostActions } from "../data/PostActions";
import { ModuleController } from "../ModuleController";
import { Util } from "../utility/Util";
import { DomUtilities } from "./DomUtilities";

export class PostUtilities {

    public static make(data: APIPost): JQuery<HTMLElement> {

        const tags = APIPost.getTagSet(data),
            flags = APIPost.getFlagSet(data);

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "post_" + data.id,
                "state": "ready",
                "animated": tags.has("animated") ? "true" : undefined,
                "filetype": data.file.ext,
                "deleted": flags.has("deleted") ? "true" : undefined,
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


        // Post info
        $("<post-loading>")
            .html(`<i class="fas fa-circle-notch fa-2x fa-spin"></i>`)
            .appendTo($link);

        const $postInfo = $("<post-info>")
            .appendTo($article);

        // Listen for post updates to refresh the data
        $article.on("update.re621", () => { PostUtilities.update($article, $link, $img, $postInfo); });
        PostUtilities.update($article, $link, $img, $postInfo);

        return $article;
    }

    private static update($article: JQuery<HTMLElement>, $link: JQuery<HTMLElement>, $img: JQuery<HTMLElement>, $postInfo: JQuery<HTMLElement>): void {
        // Fetch the settings
        const conf = ModuleController.get(BetterSearch).fetchSettings([
            "imageLoadMethod", "autoPlayGIFs",
            "imageRatioChange",
            "clickAction",
            "hoverTags"
        ]);


        /* Step 1: Update Article Properties */
        // Favorite status
        if ($article.data("is_favorited")) $article.attr("fav", "true");
        else $article.removeAttr("fav");


        /* Step 2: Update Image Properties */
        // Handle upscaling
        const imgState = $article.attr("state");
        if (imgState == "ready") PostUtilities.handleUpscaling($article, $img, conf);

        // Set the image dimensions
        $img.removeAttr("style");
        if (!conf.imageRatioChange) $img.css("--img-ratio", $article.data("img.ratio"));

        // Handle double-click
        $link.off("click.re621.thumbnail")
            .off("dblclick.re621.thumbnail");
        if (conf.clickAction !== ImageClickAction.Disabled) PostUtilities.handleDoubleClick($article, $link, conf);

        // Add hover text
        if (conf.hoverTags) $img.attr("title", getHoverText($article));
        else $img.removeAttr("title");

        /* Step 3: Update postInfo */
        const info = {
            score: $article.data("score"),
            favorites: $article.data("favorites"),
            comments: $article.data("comments"),
            rating: $article.data("rating"),
        };

        const scoreClass = info.score > 0 ? "positive" : (info.score < 0 ? "negative" : "neutral");

        $postInfo.html(`
            <span class="post-info-score score-${scoreClass}">${info.score}</span>
            <span class="post-info-favorites">${info.favorites}</span>
            <span class="post-info-comments">${info.comments}</span>
            <span class="post-info-rating rating-${info.rating}">${info.rating}</span>
        `);

        /** Format the image hover text based on stored data */
        function getHoverText($article: JQuery<HTMLElement>): string {
            return `` +
                `ID: ${$article.data("id")}\n` +
                `Date: ${Util.Time.format($article.data("date"))} (${$article.data("date.ago")})\n` +
                `\n` +
                `${[...$article.data("tags")].sort().join(" ")}`;
        }
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

            $article.off("mouseenter.re621")
                .off("mouseleave.re621");

            // Add dynamically-loaded highres thumbnails
            const sampleURL = $article.data("file.sample"),
                previewURL = $article.data("file.preview");

            if (conf.imageLoadMethod === ImageLoadMethod.Hover ||
                (conf.imageLoadMethod === ImageLoadMethod.Always && $article.data("file.ext") === "gif" && conf.autoPlayGIFs)) {
                $img.attr("data-src", previewURL);

                let timer: number;
                $article.on("mouseenter.re621", () => {

                    // only load sample after a bit of waiting
                    // this prevents loading images just by hovering over them to get to another one
                    timer = window.setTimeout(() => {
                        $article.attr("state", "loading");
                        $img.attr("data-src", sampleURL)
                            .addClass("lazyload")
                            .one("lazyloaded", () => { $article.attr("state", "done"); });
                    }, 200);
                });
                $article.on("mouseleave.re621", () => {
                    window.clearTimeout(timer);
                });
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

    /** Processes the double click routine */
    private static handleDoubleClick($article: JQuery<HTMLElement>, $link: JQuery<HTMLElement>, conf: any): void {
        /* Handle double-click */
        let dbclickTimer: number;
        const delay = 200;
        let prevent = false;

        //Make it so that the doubleclick prevents the normal click event
        $link.on("click.re621.thumbnail", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
                // Make sure the click does not get triggered on the voting buttons
                ($(event.target).hasClass("voteButton") || $(event.target).parent().hasClass("voteButton")) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) { return; }

            // Handle the meta-key presses
            if (event.ctrlKey || event.metaKey) {
                XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
                return;
            }

            event.preventDefault();

            dbclickTimer = window.setTimeout(() => {
                if (!prevent) {
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
                prevent = false;
            }, delay);
        }).on("dblclick.re621.thumbnail", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
                // Make sure the click does not get triggered on the voting buttons
                ($(event.target).hasClass("voteButton") || $(event.target).parent().hasClass("voteButton")) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) { return; }

            event.preventDefault();
            window.clearTimeout(dbclickTimer);
            prevent = true;

            $article.addClass("highlight");
            window.setTimeout(() => $article.removeClass("highlight"), 250);

            const postID = $article.data("id");

            switch (conf.clickAction) {
                case ImageClickAction.NewTab: {
                    XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
                    break;
                }
                case ImageClickAction.CopyID: {
                    Danbooru.notice(`Copied post ID to clipboard: <a href="/posts/${postID}" target="_blank">#${postID}</a>`);
                    XM.Util.setClipboard(postID + "", "text");
                    break;
                }
                case ImageClickAction.Blacklist: {
                    BlacklistEnhancer.toggleBlacklistTag("id:" + postID);
                    break;
                }
                case ImageClickAction.AddToSet: {
                    const lastSet = parseInt(window.localStorage.getItem("set"));
                    if (!lastSet) Danbooru.error(`Error: no set selected`);
                    else PostActions.addSet(lastSet, postID);
                    break;
                }
                case ImageClickAction.ToggleSet: {
                    const lastSet = parseInt(window.localStorage.getItem("set"));
                    if (!lastSet) Danbooru.error(`Error: no set selected`);
                    else PostActions.toggleSet(lastSet, postID);
                    break;
                }
                default: {
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
            }
        });
    }

}
