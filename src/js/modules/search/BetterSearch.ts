import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { PostUtilities } from "../../components/structure/PostUtilities";
import { Util } from "../../components/utility/Util";

export class BetterSearch extends RE6Module {

    private static paused = false;              // if true, stops several actions that may interfere with other modules

    private $wrapper: JQuery<HTMLElement>;      // wrapper object containing the loading and content sections
    private $loading: JQuery<HTMLElement>;      // loading screen displayed over the content
    private $content: JQuery<HTMLElement>;      // section containing post thumbnails

    private $zoomBlock: JQuery<HTMLElement>;    // display area for the hover zoom
    private $zoomImage: JQuery<HTMLElement>;    // image tag for hover zoom
    private $zoomInfo: JQuery<HTMLElement>;     // posts's resolution and file size
    private $zoomTags: JQuery<HTMLElement>;     // post's tags section displayed on hover

    private shiftPressed = false;               // used to block zoom in onshift mode

    public constructor() {
        super([PageDefintion.search, PageDefintion.favorites]);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            imageLoadMethod: ImageLoadMethod.Disabled,      // Whether the image should be loaded as a preview, as a sample immediately, or on hover
            autoPlayGIFs: true,                             // If false, animated GIFs will use the `hover` load method even if that is set to `always`

            imageSizeChange: true,                          // If true, resizes the image in accordance with `imageWidth`
            imageWidth: "150px",                            // Width if the resized image
            imageRatioChange: true,                         // If true, crops the image to ratio specified in `imageRatio`
            imageRatio: "0.9",                              // Ratio to conform to

            zoomMode: ImageZoomMode.Disabled,               // How should the hover zoom be triggered
            zoomTags: false,                                // Show a list of tags under the zoomed-in image

            hoverTags: false,                               // If true, adds a hover text to the image containing all of its tags

            ribbonsFlag: true,                              // Status ribbons - flagged / pending
            ribbonsRel: true,                               // Relations ribbons - parent / child posts
            buttonsVote: true,                              // Voting buttons
            buttonsFav: true,                               // Favorite button

            clickAction: ImageClickAction.NewTab,           // Action take when double-clicking the thumbnail
        };
    }

    public async prepare(): Promise<void> {
        await super.prepare();

        // TODO check if module is enabled
        if (!this.pageMatchesFilter()) return;
        this.$wrapper = $("#content")
            .html("")
            .attr("loading", "true");

        // TODO Use LS to remove #content html early

        this.$loading = $("<search-loading>")
            .html(`
                <span>
                    <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                </span>
            `)
            .appendTo(this.$wrapper);

        this.$content = $("<search-content>")
            .appendTo(this.$wrapper);

        this.$zoomBlock = $("<zoom-container>")
            .attr({
                "status": "waiting",
            })
            .appendTo("body");
        this.$zoomInfo = $("<div>")
            .attr("id", "zoom-info")
            .appendTo(this.$zoomBlock);
        this.$zoomImage = $("<img>")
            .attr("src", DomUtilities.getPlaceholderImage())
            .appendTo(this.$zoomBlock);
        this.$zoomTags = $("<div>")
            .attr("id", "zoom-tags")
            .appendTo(this.$zoomBlock);
    }

    public create(): void {
        super.create();

        // Write appropriate settings into the content wrapper
        this.updateContentHeader();

        // Load posts
        E621.Posts.get<APIPost>({}, 500).then((search) => {
            console.log(search);

            for (const post of search) {
                this.$content.append(PostUtilities.make(post));
            }

            this.$wrapper.attr("loading", "false");
        });

        // Listen for hover zoom
        const viewport = $(window);
        BetterSearch.on("zoom.start", (event, data) => {
            if (BetterSearch.paused || (this.fetchSettings("zoomMode") == ImageZoomMode.OnShift && !this.shiftPressed))
                return;

            const $article = $("#post_" + data)
                .attr("loading", "true");

            this.$zoomBlock.attr("status", "loading");
            this.$zoomImage
                .attr("src", $article.data("file.original"))
                .one("load", () => {
                    this.$zoomBlock.attr("status", "ready");
                    $article.removeAttr("loading");
                });
            this.$zoomInfo.html(`${$article.data("img.width")} x ${$article.data("img.height")}, ${Util.formatBytes($article.data("file.size"))}`);

            if (this.fetchSettings("zoomTags")) this.$zoomTags.html([...$article.data("tags")].sort().join(" "));
            else this.$zoomTags.html("");

            let throttled = false;
            $(document).on("mousemove.re621.zoom", (event) => {
                if (throttled) return;
                throttled = true;
                window.setTimeout(() => { throttled = false }, 25);

                const width = viewport.width(),
                    cursorX = event.pageX,
                    cursorY = event.pageY - viewport.scrollTop();

                // which side of the screen the cursor is on, true for left, false for right
                if (cursorX < (width / 2)) {
                    this.$zoomBlock.css({
                        "left": `${cursorX + 100}px`,
                        "right": "",
                    });
                } else {
                    this.$zoomBlock.css({
                        "left": "",
                        "right": `${((width - cursorX) + 100)}px`,
                    });
                }

                const imgHeight = this.$zoomBlock.height();
                let top = cursorY - (imgHeight / 2);
                if (top < 10) top = 10;
                else if (top > (viewport.height() - imgHeight - 10)) top = (viewport.height() - imgHeight - 10);

                this.$zoomBlock.css({
                    "top": `${top}px`,
                });

            });
        });
        BetterSearch.on("zoom.stop", (event, data) => {
            $(document).off("mousemove.re621.zoom");
            this.$zoomBlock
                .attr("status", "waiting")
                .css({
                    "left": 0,
                    "right": "",
                    "top": "100vh",
                });
            this.$zoomInfo.html("");
            this.$zoomImage
                .attr("src", DomUtilities.getPlaceholderImage());
            this.$zoomTags.html("");

            $("#post_" + data)
                .removeAttr("loading");
        });
    }

    public updateContentStructure(): void {
        this.$content.children("post").trigger("update.re621");
    }

    public updateContentHeader(): void {
        const conf = this.fetchSettings([
            "imageSizeChange", "imageWidth", "imageRatioChange", "imageRatio",
            "ribbonsFlag", "ribbonsRel",
            "buttonsVote", "buttonsFav",
            "zoomMode",
        ]);

        // Scaling Settings
        this.$content.removeAttr("style");
        if (conf.imageSizeChange) this.$content.css("--img-width", conf.imageWidth);
        if (conf.imageRatioChange) this.$content.css("--img-ratio", conf.imageRatio);

        // Ribbons
        if (conf.ribbonsFlag) this.$content.attr("ribbon-flag", "true");
        else this.$content.removeAttr("ribbon-flag");
        if (conf.ribbonsRel) this.$content.attr("ribbon-rel", "true");
        else this.$content.removeAttr("ribbon-rel");

        // Voting Buttons
        if (conf.buttonsVote) this.$content.attr("btn-vote", "true");
        else this.$content.removeAttr("btn-vote");
        if (conf.buttonsFav) this.$content.attr("btn-fav", "true");
        else this.$content.removeAttr("btn-fav");

        // Zoom Toggle
        $(document)
            .off("keydown.re621.zoom")
            .off("keyup.re621.zoom");

        if (conf.zoomMode == ImageZoomMode.OnShift) {
            $(document)
                .on("keydown.re621.zoom", null, "shift", () => {
                    if (this.shiftPressed) return;
                    this.shiftPressed = true;
                })
                .on("keyup.re621.zoom", null, "shift", () => {
                    this.shiftPressed = false;
                });
        }
    }

    public static isPaused(): boolean {
        return BetterSearch.paused;
    }

}

export enum ImageLoadMethod {
    Disabled = "disabled",
    Hover = "hover",
    Always = "always",
}

export enum ImageZoomMode {
    Disabled = "disabled",
    Hover = "hover",
    OnShift = "onshift",
}

export enum ImageClickAction {
    Disabled = "disabled",
    NewTab = "newtab",
    CopyID = "copyid",
    Blacklist = "blacklist",
    AddToSet = "addtoset",
    ToggleSet = "toggleset",
}
