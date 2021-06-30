import { BetterSearch, ImageClickAction, ImageLoadMethod } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { Danbooru } from "../api/Danbooru";
import { PostFlag } from "../api/responses/APIPost";
import { XM } from "../api/XM";
import { Blacklist } from "../data/Blacklist";
import { Page } from "../data/Page";
import { User } from "../data/User";
import { Debug } from "../utility/Debug";
import { Util } from "../utility/Util";
import { FileExtension, LoadedFileType, Post, PostData } from "./Post";
import { PostActions } from "./PostActions";
import { PostSet } from "./PostSet";

/** Handles the rendering of individual post elements. Called from the main Post class. */
export class PostParts {

    private static renderedGIFs: PostSet = new PostSet();

    public static cleanup(post: Post): void {
        this.renderedGIFs.delete(post);
    }

    public static renderImage(post: Post, conf: any): JQuery<HTMLElement> {

        const query = Page.getQueryParameter("tags")

        // Basic structure
        const $link = $("<a>")
            .attr({ "href": "/posts/" + post.id + (query !== null ? "?q=" + query : ""), })
            .append(PostParts.renderImageElement(post, conf))
            .append($("<post-loading>"));

        if (post.meta.duration)
            $("<span>")
                .addClass("video-duration")
                .html(Util.Time.formatPlaytime(post.meta.duration))
                .appendTo($link);

        if (post.meta.sound || post.warning.sound)
            $("<span>")
                .addClass("post-sound")
                .attr({
                    "warning": post.warning.sound ? "true" : undefined,
                    "title": post.warning.sound ? "loud sound warning" : "has sound",
                })
                .appendTo($link);

        if (conf.clickAction !== ImageClickAction.Disabled) PostParts.handleDoubleClick($link, post, conf);

        return $link;

    }

    private static handleDoubleClick($link: JQuery<HTMLElement>, post: Post, conf: any): void {

        PostParts.bootstrapDoubleClick(
            $link,
            () => {

                post.$ref.addClass("highlight");
                window.setTimeout(() => post.$ref.removeClass("highlight"), 250);

                switch (conf.clickAction) {
                    case ImageClickAction.NewTab: {
                        XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
                        break;
                    }
                    case ImageClickAction.CopyID: {
                        XM.Util.setClipboard(post.id + "", "text");
                        Danbooru.notice(`Copied post ID to clipboard: <a href="/posts/${post.id}" target="_blank" rel="noopener noreferrer">#${post.id}</a>`);
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
                        $link.off("click.re621.dbl-extra");
                        $link[0].click();
                    }
                }

            },
            () => { return (BetterSearch.isPaused()) || $("#mode-box-mode").val() !== "view"; }
        );
    }

    private static renderImageElement(post: Post, conf: any): JQuery<HTMLElement> {

        post.$ref.attr("loading", "true");

        const $image = $("<img>")
            .attr("src", Util.DOM.getPlaceholderImage())
            .one("load", () => {
                post.$ref.removeAttr("loading");
                if (conf.hoverTags)
                    $image.attr("title", PostParts.formatHoverText(post));
            })
            .one("error", () => {
                post.$ref
                    .removeAttr("loading")
                    .attr("error", "true");

                $image
                    .attr("src", Util.DOM.getPlaceholderImage())
                    .off("mouseenter.re621.upscale")
                    .off("mouseleave.re621.upscale");

                post.loaded = LoadedFileType.ORIGINAL;
            });

        // Fallbacks for deleted and flash files
        if (post.flags.has(PostFlag.Deleted) && !User.isApprover) {
            post.img.ratio = 1;
            post.loaded = LoadedFileType.ORIGINAL;
            return $image;
        } else if (post.file.ext === FileExtension.SWF) {
            post.img.ratio = 1;
            post.loaded = LoadedFileType.ORIGINAL;
            return $image;
        }

        // Load the appropriate file
        const loadedFileType = determineFileType(post.loaded, conf.imageLoadMethod, post.file.ext, conf.autoPlayGIFs);
        $image.attr("src", loadedFileType == LoadedFileType.SAMPLE ? post.file.sample : post.file.preview);
        post.loaded = loadedFileType;

        function determineFileType(loadedFileType: LoadedFileType, imageLoadMethod: ImageLoadMethod, extension: FileExtension, autoPlayGIFs: boolean): LoadedFileType {
            // If the autoPlayGIFs is enabled, the GIFs must be loaded at original quality
            if (extension == FileExtension.GIF) return autoPlayGIFs ? LoadedFileType.SAMPLE : LoadedFileType.PREVIEW;

            // If the image has not been previously loaded, determine appropriate size depending on the preferred load method
            if (!loadedFileType) return imageLoadMethod == ImageLoadMethod.Always ? LoadedFileType.SAMPLE : LoadedFileType.PREVIEW;

            // Override the previously loaded size if necessary
            switch (imageLoadMethod) {
                case ImageLoadMethod.Always: return LoadedFileType.SAMPLE;
                case ImageLoadMethod.Disabled: return LoadedFileType.PREVIEW;
            }

            // Fall back to the previously loaded size
            return loadedFileType;
        }

        // Handle the GIF dynamic loading
        if (post.file.ext === "gif" && !conf.autoPlayGIFs) {

            if (post.loaded == LoadedFileType.SAMPLE) $image.attr("src", post.file.sample);
            else {
                $image.attr("src", post.file.preview);
                post.loaded = LoadedFileType.PREVIEW;

                let timer: number;
                $image.on("mouseenter.re621.upscale", () => {
                    timer = window.setTimeout(() => {
                        post.$ref.attr("loading", "true");
                        $image.attr("src", post.file.sample).on("load", () => {
                            post.$ref.removeAttr("loading");
                            $image.off("mouseenter.re621.upscale")
                                .off("mouseleave.re621.upscale");

                            // Limit the number of actively playing GIFs for performance reasons
                            if (typeof conf.maxPlayingGIFs !== "number" || conf.maxPlayingGIFs == -1) return;
                            PostParts.renderedGIFs.push(post);
                            if (PostParts.renderedGIFs.size() > conf.maxPlayingGIFs) {
                                const trimmed = PostParts.renderedGIFs.shift();
                                if (trimmed.id == post.id) return;
                                trimmed.loaded = LoadedFileType.PREVIEW;
                                trimmed.render();
                            }
                        });
                        post.loaded = LoadedFileType.SAMPLE;
                    }, 200);
                });
                $image.on("mouseleave.re621.upscale", () => {
                    window.clearTimeout(timer);
                });
            }

            return $image;
        }

        // Load sample-sized image on hover
        if (conf.imageLoadMethod == ImageLoadMethod.Hover && post.loaded == LoadedFileType.PREVIEW) {
            let timer: number;
            $image.on("mouseenter.re621.upscale", () => {
                timer = window.setTimeout(() => {
                    post.$ref.attr("loading", "true");
                    $image.attr("src", post.file.sample)
                        .one("load", () => {
                            post.$ref.removeAttr("loading");
                            $image.off("mouseenter.re621.upscale")
                                .off("mouseleave.re621.upscale");
                        });
                    post.loaded = LoadedFileType.SAMPLE;
                }, 200);
            });
            $image.on("mouseleave.re621.upscale", () => {
                window.clearTimeout(timer);
            });
        }

        return $image;
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
                            Debug.log(response);

                            if (response.action == 0) {
                                if (firstVote) post.$ref.attr("vote", "1");
                                else post.$ref.attr("vote", "0");
                            } else post.$ref.attr("vote", response.action);

                            post.score = {
                                up: response.up || 0,
                                down: response.down || 0,
                                total: response.score || 0,
                            };
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
                            Debug.log(response);

                            if (response.action == 0) {
                                if (firstVote) post.$ref.attr("vote", "-1");
                                else post.$ref.attr("vote", "0");
                            } else post.$ref.attr("vote", response.action);

                            post.score = {
                                up: response.up || 0,
                                down: response.down || 0,
                                total: response.score || 0,
                            };
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
                        await PostActions.removeFavorite(post.id);
                        post.is_favorited = false;
                        post.$ref.removeAttr("fav");
                        $btn.removeClass("score-favorite");
                    } else {
                        await PostActions.addFavorite(post.id);
                        post.is_favorited = true;
                        post.$ref.attr("fav", "true");
                        $btn.addClass("score-favorite");
                        // Upvote post if updateOnFavorites setting is on
                        if (conf.upvoteOnFavorite) {
                            PostActions.vote(post.id, 1, true).then(
                                (response) => {
                                    post.$ref.attr("vote", 1);
        
                                    post.score = {
                                        up: response.up || 0,
                                        down: response.down || 0,
                                        total: response.score || 0,
                                    };
                                    post.$ref.trigger("re621:update");
                                }
                            );
                        }
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
            const scoreClass = post.score.total > 0 ? "positive" : (post.score.total < 0 ? "negative" : "neutral");
            return `
                <span class="post-info-score score-${scoreClass}" title="${post.score.up} up / ${Math.abs(post.score.down)} down">${post.score.total}</span>
                <span class="post-info-favorites">${post.favorites}</span>
                <span class="post-info-comments">${post.comments}</span>
                <span class="post-info-rating rating-${post.rating}">${post.rating}</span>
            `;
        }
    }

    /** Returns a formatted tag string for the image's hover text */
    public static formatHoverText(post: PostData, compact = false, html = false): string {
        const br = html ? "<br>\n" : "\n";
        if (compact)
            return `` +
                `${[...post.tags.artist, ...post.tags.copyright].join(" ")} ` +
                `${[...post.tags.character, ...post.tags.species].join(" ")} ` +
                `${[...post.tags.general, ...post.tags.invalid, ...post.tags.lore, ...post.tags.meta].join(" ")}` +
                ``;
        return `` +
            `Post #${post.id}, uploaded on: ${Util.Time.format(post.date.iso)} (${post.date.ago})${br}` +
            `${[...post.tags.artist, ...post.tags.copyright].join(" ")}${br}` +
            `${[...post.tags.character, ...post.tags.species].join(" ")}${br}` +
            `${[...post.tags.general, ...post.tags.invalid, ...post.tags.lore, ...post.tags.meta].join(" ")}${br}` +
            ``;
    }

    public static bootstrapDoubleClick(target: JQuery<HTMLElement> | string, onDoubleClick: ($link: JQuery<HTMLElement>) => void, isPaused: () => boolean = (): boolean => false): void {

        let attachment: JQuery<HTMLElement>, selector: string;
        if (typeof target == "string") {
            attachment = $("body");
            selector = target;
        } else {
            if (target.length > 1) {
                for (const element of target.get())
                    PostParts.bootstrapDoubleClick($(element), onDoubleClick, isPaused);
                return;
            }

            attachment = target;
            target = null;
        }

        let dblclickTimer: number;
        let prevent = false;

        // Make it so that the double-click prevents the normal click event
        attachment.on("click.re621.dbl-extra", selector, (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop tracking double clicks if the module is paused
                isPaused()
            ) return;

            event.preventDefault();
            const $link = $(event.currentTarget);

            dblclickTimer = window.setTimeout(() => {
                if (!prevent) {
                    attachment.off("click.re621.dbl-extra", selector);
                    $link[0].click();
                }
                prevent = false;
            }, 250);

            return false;
        });
        attachment.on("dblclick.re621.dbl-extra", selector, (event) => {
            if (
                // Ignore mouse clicks which are not left clicks
                (event.button !== 0) ||
                // Ignore meta-key presses
                (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) ||
                // Stop tracking double clicks if the module is paused
                isPaused()
            ) { return; }

            event.preventDefault();
            const $link = $(event.currentTarget);

            window.clearTimeout(dblclickTimer);
            prevent = true;

            onDoubleClick($link);
        });
    }

    public static unstrapDoubleClick(target: JQuery<HTMLElement> | string): void {
        if (typeof target == "string")
            $("body")
                .off("click.re621.thumbnail", target)
                .off("dblclick.re621.thumbnail", target);
        else
            target
                .off("click.re621.thumbnail")
                .off("dblclick.re621.thumbnail");
    }

}
