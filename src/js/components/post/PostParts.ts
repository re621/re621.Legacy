import { BetterSearch, ImageClickAction, ImageLoadMethod, ImageZoomMode } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { Danbooru } from "../api/Danbooru";
import { E621 } from "../api/E621";
import { PostFlag } from "../api/responses/APIPost";
import { XM } from "../api/XM";
import { Blacklist } from "../data/Blacklist";
import { Page } from "../data/Page";
import { DomUtilities } from "../structure/DomUtilities";
import { Util } from "../utility/Util";
import { LoadedFileType, Post } from "./Post";
import { PostActions } from "./PostActions";

/** Handles the rendering of individual post elements. Called from the main Post class. */
export class PostParts {

    public static renderImage(post: Post, conf: any): JQuery<HTMLElement> {

        const query = Page.getQueryParameter("tags")

        // Basic structure
        const $link = $("<a>")
            .attr({ "href": "/posts/" + post.id + (query !== null ? "?q=" + query : ""), })
            .append(PostParts.renderImageElement(post, conf))
            .append($("<post-loading>"));

        if (conf.clickAction !== ImageClickAction.Disabled) PostParts.handleDoubleClick($link, post, conf);
        if (conf.zoomMode !== ImageZoomMode.Disabled) PostParts.handleHoverZoom($link, post);

        return $link;

    }

    private static handleDoubleClick($link: JQuery<HTMLElement>, post: Post, conf: any): void {

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
                    $link.off("click.re621.dblextra");
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

    private static handleHoverZoom($link: JQuery<HTMLElement>, post: Post): void {


        // Flash files will never work with hover zoom, deal with it
        if (post.file.ext === "swf" || post.flags.has(PostFlag.Deleted)) return;

        post.$ref.on("mouseenter.re621.zoom", (event) => {
            post.$ref.attr("hovering", "true");
            BetterSearch.trigger("zoom.start", { post: post.id, pageX: event.pageX, pageY: event.pageY });
        });

        post.$ref.on("mouseleave.re621.zoom", (event) => {
            post.$ref.removeAttr("hovering");
            BetterSearch.trigger("zoom.stop", { post: post.id, pageX: event.pageX, pageY: event.pageY });
        });
    }

    private static renderImageElement(post: Post, conf: any): JQuery<HTMLElement> {

        post.$ref.attr("loading", "true");

        const $image = $("<img>")
            .attr("src", DomUtilities.getPlaceholderImage())
            .one("load", () => { post.$ref.removeAttr("loading"); });

        if (conf.hoverTags) $image.attr("title", PostParts.formatHoverText(post));

        // Load appropriate image
        if (post.flags.has(PostFlag.Deleted)) {
            post.img.ratio = 1;
            post.loaded = LoadedFileType.ORIGINAL;
        } else if (post.file.ext === "swf") {
            post.img.ratio = 1;
            post.loaded = LoadedFileType.ORIGINAL;
        } else if (post.file.ext === "gif" && conf.imageLoadMethod == ImageLoadMethod.Always && !conf.autoPlayGIFs) { // account for other load methods

            if (post.loaded == LoadedFileType.SAMPLE) $image.attr("src", post.file.sample);
            else {
                $image.attr("src", post.file.preview);
                post.loaded = LoadedFileType.PREVIEW;

                let timer: number;
                $image.on("mouseenter.re621.upscale", () => {
                    timer = window.setTimeout(() => {
                        post.$ref.attr("loading", "true");
                        post.loaded = LoadedFileType.SAMPLE;
                        // ($image[0] as HTMLImageElement).src = post.file.sample;
                        $image.attr("src", post.file.sample).on("load", () => {
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
        } else {
            const size = getRequiredImageSize(post.loaded, conf.imageLoadMethod);
            if (size == LoadedFileType.SAMPLE) $image.attr("src", post.file.sample);
            else $image.attr("src", post.file.preview);
            post.loaded = size;
        }

        // Load sample-sized image on hover
        if (conf.imageLoadMethod == ImageLoadMethod.Hover && post.loaded == LoadedFileType.PREVIEW) {
            let timer: number;
            $image.on("mouseenter.re621.upscale", () => {
                timer = window.setTimeout(() => {
                    post.$ref.attr("loading", "true");
                    post.loaded = LoadedFileType.SAMPLE;

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


        /** Determines the size of the image to load */
        function getRequiredImageSize(cur: LoadedFileType, req: ImageLoadMethod): LoadedFileType {
            if (!cur) return req == ImageLoadMethod.Always ? LoadedFileType.SAMPLE : LoadedFileType.PREVIEW;
            if (req == ImageLoadMethod.Always) return LoadedFileType.SAMPLE;
            else if (req == ImageLoadMethod.Disabled) return LoadedFileType.PREVIEW;
            return cur;
        }
    }

    public static renderRibbons(post: Post, conf: any): JQuery<HTMLElement> {

        const $ribbons = $("<img-ribbons>")

        // Relationship Ribbons
        if (conf.ribbonsRel) {
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
        if (conf.ribbonsFlag) {
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

        if ($ribbons.children().length == 0) return undefined;
        return $ribbons;
    }

    public static renderButtons(post: Post, conf: any): JQuery<HTMLElement> {

        const $voteBox = $("<post-voting>");

        if (conf.buttonsVote) {

            $("<button>")   // Upvote
                .addClass(`button voteButton vote score-neutral`)
                .attr("action", "up")
                .appendTo($voteBox)
                .on("click", (event) => {
                    event.preventDefault();

                    const firstVote = post.$ref.attr("vote") == undefined;

                    PostActions.vote(post.id, 1, firstVote).then(
                        (response) => {
                            // console.log(response);

                            if (response.action == 0) {
                                if (firstVote) post.$ref.attr("vote", "1");
                                else post.$ref.attr("vote", "0");
                            } else post.$ref.attr("vote", response.action);

                            post.score = response.score;
                            post.$ref.trigger("re621:update");
                        },
                        (error) => {
                            Danbooru.error("An error occurred while recording the vote");
                            console.log(error);
                        }
                    );
                });

            $("<button>")   // Downvote
                .addClass(`button voteButton vote score-neutral`)
                .attr("action", "down")
                .appendTo($voteBox)
                .on("click", (event) => {
                    event.preventDefault();

                    const firstVote = parseInt(post.$ref.attr("vote")) == undefined;

                    PostActions.vote(post.id, -1, firstVote).then(
                        (response) => {
                            // console.log(response);

                            if (response.action == 0) {
                                if (firstVote) post.$ref.attr("vote", "-1");
                                else post.$ref.attr("vote", "0");
                            } else post.$ref.attr("vote", response.action);

                            post.score = response.score;
                            post.$ref.trigger("re621:update");
                        },
                        (error) => {
                            Danbooru.error("An error occurred while recording the vote");
                            console.log(error);
                        }
                    );
                });
        }

        if (conf.buttonsFav) {
            let favBlock = false;
            const $btn = $("<button>")   // Favorite
                .addClass(`button voteButton fav score-neutral`)
                .appendTo($voteBox)
                .on("click", async (event) => {
                    event.preventDefault();

                    if (favBlock) return;
                    favBlock = true;

                    if (post.is_favorited) {
                        await E621.Favorite.id(post.id).delete();
                        post.is_favorited = false;
                        post.$ref.removeAttr("fav");
                        $btn.removeClass("score-favorite");
                    } else {
                        await E621.Favorites.post({ "post_id": post.id });
                        post.is_favorited = true;
                        post.$ref.attr("fav", "true");
                        $btn.addClass("score-favorite");
                    }

                    favBlock = false;
                });
        }


        return $voteBox;
    }

    public static renderFlags(post: Post): JQuery<HTMLElement> {

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

    public static renderInfo(post: Post): JQuery<HTMLElement> {

        const $infoBlock = $("<post-info>");
        post.$ref.on("re621:update", () => {
            $infoBlock.html(getPostInfo(post));
        });
        $infoBlock.html(getPostInfo(post));

        return $infoBlock;

        function getPostInfo(post: Post): string {
            const scoreClass = post.score > 0 ? "positive" : (post.score < 0 ? "negative" : "neutral");
            return `
                <span class="post-info-score score-${scoreClass}">${post.score}</span>
                <span class="post-info-favorites">${post.favorites}</span>
                <span class="post-info-comments">${post.comments}</span>
                <span class="post-info-rating rating-${post.rating}">${post.rating}</span>
            `;
        }
    }

    /** Returns a formatted tag string for the image's hover text */
    public static formatHoverText(post: Post, compact = false, html = false): string {
        const br = html ? "<br>\n" : "\n";
        if (compact)
            return `` +
                `${[...post.tags.artist, ...post.tags.copyright].join(" ")} ` +
                `${[...post.tags.character, ...post.tags.species].join(" ")} ` +
                `${[...post.tags.general, ...post.tags.invalid, ...post.tags.lore, ...post.tags.meta].join(" ")}` +
                ``;
        return `` +
            `Post #${post.id}, posted on: ${Util.Time.format(post.date.raw)} (${post.date.ago})${br}` +
            `${[...post.tags.artist, ...post.tags.copyright].join(" ")}${br}` +
            `${[...post.tags.character, ...post.tags.species].join(" ")}${br}` +
            `${[...post.tags.general, ...post.tags.invalid, ...post.tags.lore, ...post.tags.meta].join(" ")}${br}` +
            ``;
    }

}
