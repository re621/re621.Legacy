import { BetterSearch, ImageClickAction, ImageLoadMethod, ImageZoomMode } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { E621 } from "../api/E621";
import { XM } from "../api/XM";
import { Blacklist } from "../data/Blacklist";
import { DomUtilities } from "../structure/DomUtilities";
import { Util } from "../utility/Util";
import { PostActions } from "./PostActions";
import { LoadedFileType, PostData } from "./PostData";

export class PostParts {

    public static renderImage(post: PostData, conf: any): JQuery<HTMLElement> {

        // Basic structure
        const $link = $("<a>")
            .attr({ "href": "/posts/" + post.id, })
            .append(PostParts.renderImageElement(post, conf))
            .append($("<post-loading>"));

        if (conf.clickAction !== ImageClickAction.Disabled) PostParts.handleDoubleClick($link, post, conf);
        if (conf.zoomMode !== ImageZoomMode.Disabled) PostParts.handleHoverZoom($link, post);

        return $link;

    }

    private static handleDoubleClick($link: JQuery<HTMLElement>, post: PostData, conf: any): void {

        let dbclickTimer: number;
        let prevent = false;

        // Make it so that the doubleclick prevents the normal click event
        $link.on("click.re621.dblextra", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) return;

            event.preventDefault();

            dbclickTimer = window.setTimeout(() => {
                if (!prevent) {
                    $link.off("click.re621.dblextra", "post a");
                    $link[0].click();
                }
                prevent = false;
            }, 200);

            return false;
        });
        $link.on("dblclick.re621.dblextra", (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop keeping track of double clicks if the zoom is paused
                (BetterSearch.isPaused()) ||
                // Only use double-click actions in the view mode
                $("#mode-box-mode").val() !== "view"
            ) { return; }

            event.preventDefault();
            window.clearTimeout(dbclickTimer);
            prevent = true;

            post.$ref.addClass("highlight");
            window.setTimeout(() => post.$ref.removeClass("highlight"), 250);

            switch (conf.clickAction) {
                case ImageClickAction.NewTab: {
                    XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
                    break;
                }
                case ImageClickAction.CopyID: {
                    XM.Util.setClipboard(post.id + "", "text");
                    Danbooru.notice(`Copied post ID to clipboard: <a href="/posts/${post.id}" target="_blank">#${post.id}</a>`);
                    break;
                }
                case ImageClickAction.Blacklist: {
                    Blacklist.toggleBlacklistTag("id:" + post.id);
                    break;
                }
                case ImageClickAction.AddToSet: {
                    const lastSet = parseInt(window.localStorage.getItem("set"));
                    if (!lastSet) Danbooru.error(`Error: no set selected`);
                    else PostActions.addSet(lastSet, post.id);
                    break;
                }
                case ImageClickAction.ToggleSet: {
                    const lastSet = parseInt(window.localStorage.getItem("set"));
                    if (!lastSet) Danbooru.error(`Error: no set selected`);
                    else PostActions.toggleSet(lastSet, post.id);
                    break;
                }
                default: {
                    $link.off("click.re621.dblextra");
                    $link[0].click();
                }
            }
        });
    }

    private static handleHoverZoom($link: JQuery<HTMLElement>, post: PostData): void {

        let timer: number,
            started = false;

        $link.on("mouseenter.re621.zoom", () => {
            timer = window.setTimeout(() => {
                started = true;
                BetterSearch.trigger("zoom.start", post.id);
            }, 200);
        });

        $link.on("mouseleave.re621.zoom", () => {
            window.clearTimeout(timer);
            if (started) {
                started = false;
                BetterSearch.trigger("zoom.stop", post.id);
            }
        });
    }

    private static renderImageElement(post: PostData, conf: any): JQuery<HTMLElement> {

        post.$ref.attr("loading", "true");

        const $image = $("<img>")
            .attr("src", DomUtilities.getPlaceholderImage())
            .one("load", () => { post.$ref.removeAttr("loading"); });

        if (conf.hoverTags) $image.attr("title", formatHoverText(post));

        // Load appropriate image
        if (post.file.ext === "swf") {
            post.img.ratio = 1;
            post.loaded = LoadedFileType.ORIGINAL;
        } else if (post.flags.has("deleted")) {
            post.img.ratio = 1;
            post.loaded = LoadedFileType.ORIGINAL;
        } else {
            const size = getRequiredImageSize(post.loaded, conf.imageLoadMethod);
            if (size == LoadedFileType.SAMPLE) $image.attr("src", post.file.sample);
            else $image.attr("src", post.file.preview);
            post.loaded = size;
        }
        PostData.save(post);

        // Load sample-sized image on hover
        if (conf.imageLoadMethod == ImageLoadMethod.Hover && post.loaded == LoadedFileType.PREVIEW) {
            let timer: number;
            $image.on("mouseenter.re621.upscale", () => {
                timer = window.setTimeout(() => {
                    post.$ref.attr("loading", "true");
                    PostData.set(post, "loaded", LoadedFileType.SAMPLE);
                    $image.attr("src", post.file.sample)
                        .one("load", () => {
                            post.$ref.removeAttr("loading");
                            $image.off("mouseenter.re621.upscale")
                                .off("mouseleave.re621.upscale");
                        });
                }, 200);
            });
            $image.on("mouseleave.re621.upscale", () => {
                window.clearTimeout(timer);
            });
        }

        return $image;

        /** Returns a formatted tag string for the image's hover text */
        function formatHoverText(post: PostData, html = false): string {
            const br = html ? "<br>\n" : "\n";
            return `` +
                `Post #${post.id}, posted on: ${Util.Time.format(post.date.raw)} (${post.date.ago})${br}` +
                `${[...post.tags.artist, ...post.tags.copyright].join(" ")}${br}` +
                `${[...post.tags.character, ...post.tags.species].join(" ")}${br}` +
                `${[...post.tags.general, ...post.tags.invalid, ...post.tags.lore, ...post.tags.meta].join(" ")}${br}` +
                ``;
        }

        /** Determines the size of the image to load */
        function getRequiredImageSize(cur: LoadedFileType, req: ImageLoadMethod): LoadedFileType {
            if (!cur) return req == ImageLoadMethod.Always ? LoadedFileType.SAMPLE : LoadedFileType.PREVIEW;
            if (req == ImageLoadMethod.Always) return LoadedFileType.SAMPLE;
            else if (req == ImageLoadMethod.Disabled) return LoadedFileType.PREVIEW;
            return cur;
        }
    }

    public static renderRibbons(post: PostData, conf: any): JQuery<HTMLElement> {

        const $ribbons = $("<img-ribbons>")

        // Relationship Ribbons
        if (conf.ribbonsRel) {
            const relRibbon = $("<ribbon>")
                .addClass("left")
                .html(`<span></span>`)
                .appendTo($ribbons);
            let relRibbonText = "";

            if (post.has.children) {
                relRibbon.addClass("has-children");
                relRibbonText += "Child posts\n"
            }
            if (post.has.parent) {
                relRibbon.addClass("has-parent");
                relRibbonText += "Parent posts\n"
            }

            if (relRibbonText != "") { relRibbon.attr("title", relRibbonText); }
            else relRibbon.remove();
        }

        // Flag Ribbons
        if (conf.ribbonsFlag) {
            const flagRibbon = $("<ribbon>")
                .addClass("right")
                .html(`<span></span>`)
                .appendTo($ribbons);
            let flagRibbonText = "";

            if (post.flags.has("flagged")) {
                flagRibbon.addClass("is-flagged");
                flagRibbonText += "Flagged\n"
            }
            if (post.flags.has("pending")) {
                flagRibbon.addClass("is-pending");
                flagRibbonText += "Pending\n"
            }

            if (flagRibbonText != "") { flagRibbon.attr("title", flagRibbonText); }
            else flagRibbon.remove();
        }

        if ($ribbons.children().length == 0) return undefined;
        return $ribbons;
    }

    public static renderButtons(post: PostData, conf: any): JQuery<HTMLElement> {

        const $voteBox = $("<post-voting>");

        if (conf.buttonsVote) {
            $("<button>")   // Upvote
                .addClass(`button voteButton vote vote-up post-vote-up-${post.id} ${post.user_vote > 0 ? "score-positive" : "score-neutral"}`)
                .appendTo($voteBox)
                .on("click", (event) => {
                    event.preventDefault();
                    Danbooru.Post.vote(post.id, 1);
                    // TODO record user's votes
                });

            $("<button>")   // Downvote
                .addClass(`button voteButton vote vote-down post-vote-down-${post.id} ${post.user_vote < 0 ? "score-negative" : "score-neutral"}`)
                .appendTo($voteBox)
                .on("click", (event) => {
                    event.preventDefault();
                    Danbooru.Post.vote(post.id, -1);
                    // TODO record user's votes
                });
        }

        if (conf.buttonsFav) {
            let favBlock = false;
            const $btn = $("<button>")   // Favorite
                .addClass(`button voteButton fav post-favorite-${post.id} score-neutral ${post.is_favorited ? " score-favorite" : ""}`)
                .appendTo($voteBox)
                .on("click", async (event) => {
                    event.preventDefault();

                    if (favBlock) return;
                    favBlock = true;

                    if (post.is_favorited) {
                        await E621.Favorite.id(post.id).delete();
                        PostData.set(post, "is_favorited", false);
                        post.$ref.removeAttr("fav");
                        $btn.removeClass("score-favorite");
                    } else {
                        await E621.Favorites.post({ "post_id": post.id });
                        PostData.set(post, "is_favorited", false);
                        post.$ref.attr("fav", "true");
                        $btn.addClass("score-favorite");
                    }

                    favBlock = false;
                });
        }


        return $voteBox;
    }

    public static renderFlags(post: PostData): JQuery<HTMLElement> {

        const $flagBox = $("<post-flags>");

        for (const flag of CustomFlagger.getFlags(post)) {
            $("<span>")
                .addClass("custom-flag-thumb")
                .css("--flag-color", flag.color)
                .attr("title", flag.tags)
                .html(flag.name)
                .appendTo($flagBox);
        }

        if ($flagBox.children().length == 0) return undefined;
        return $flagBox;

    }

    public static renderInfo(post: PostData): JQuery<HTMLElement> {

        const scoreClass = post.score > 0 ? "positive" : (post.score < 0 ? "negative" : "neutral");
        return $("<post-info>")
            .html(`
                <span class="post-info-score score-${scoreClass}">${post.score}</span>
                <span class="post-info-favorites">${post.favorites}</span>
                <span class="post-info-comments">${post.comments}</span>
                <span class="post-info-rating rating-${post.rating}">${post.rating}</span>
            `)
    }

}
