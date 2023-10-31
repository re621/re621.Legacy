import { PostFlag } from "../../components/api/responses/APIPost";
import { XM } from "../../components/api/XM";
import { Blacklist } from "../../components/data/Blacklist";
import { User } from "../../components/data/User";
import { ModuleController } from "../../components/ModuleController";
import { Post, PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";
import { DownloadCustomizer } from "../post/DownloadCustomizer";

export class HoverZoom extends RE6Module {

    private static paused = false;              // If true, stops several actions that may interfere with other modules

    private $zoomBlock: JQuery<HTMLElement>;    // Display area for the hover zoom
    private $zoomImage: JQuery<HTMLElement>;    // Image tag for hover zoom
    private $zoomVideo: JQuery<HTMLElement>;    // Video tag for hover zoom
    private $zoomInfo: JQuery<HTMLElement>;     // Post's resolution and file size
    private $zoomTags: JQuery<HTMLElement>;     // Post's tags section displayed on hover

    private shiftPressed = false;               // Used to block zoom in onshift mode
    private pageX = 0;                          // Mouse position
    private pageY = 0;

    private static curPost: PostData = null;    // Post over which the user currently hovers, or null if there isn't one

    public constructor() {
        super([], true);

        this.registerHotkeys(
            { keys: "hotkeyDownload", fnct: this.downloadCurPost, ignoreShift: true },
            { keys: "hotkeyFullscreen", fnct: this.fullscreenCurPost, ignoreShift: true },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            mode: ImageZoomMode.OnShift,                // How should the hover zoom be triggered
            tags: true,                                 // Show a list of tags under the zoomed-in image
            time: true,                                 // If true, shows the timestamp in "x ago" format

            zoomDelay: 0,                               // Delay until the zoom is triggered, in milliseconds
            stickyShift: false,                         // In onShift mode, zoom won't clear until mouse leaves the post

            audio: false,

            hotkeyDownload: "",                         // downloads the currently hovered over post
            hotkeyFullscreen: "",                       // opens the currently hovered over post in new tab
        };
    }

    public create(): void {
        super.create();

        this.createStructure();
        this.reloadEventListeners();
        this.initFunctionality();
    }

    private createStructure(): void {
        this.$zoomBlock = $("<zoom-container>")
            .attr("status", "waiting")
            .appendTo("body");
        this.$zoomInfo = $("<div>")
            .attr("id", "zoom-info")
            .appendTo(this.$zoomBlock);
        this.$zoomImage = $("<img>")
            .attr("src", Util.DOM.getPlaceholderImage())
            .addClass("display-none")
            .appendTo(this.$zoomBlock);
        this.$zoomVideo = $("<video controls autoplay loop></video>")
            .attr({
                poster: "",
                src: "",
            })
            .prop("muted", this.fetchSettings<boolean>("audio") == false)
            .addClass("display-none")
            .appendTo(this.$zoomBlock);
        this.$zoomTags = $("<div>")
            .attr("id", "zoom-tags")
            .appendTo(this.$zoomBlock);
    }

    /** Restarts the even listeners used by the hover zoom submodule. */
    public reloadEventListeners(): void {

        const zoomMode = this.fetchSettings("mode");
        const stickyShift = this.fetchSettings("stickyShift");

        $(document)
            .off("scroll.re621.zoom")
            .off("keydown.re621.zoom")
            .off("keyup.re621.zoom")
            .off("mousemove.re621.zoom");

        $(window)
            .off("blur.re621.zoom")
            .off("contextmenu.re621.zoom");

        $("#page")
            .off("mouseenter.re621.zoom", "post, .post-preview, div.post-thumbnail, sb-ctwrap subitem[data-id] img")
            .off("mouseleave.re621.zoom", "post, .post-preview, div.post-thumbnail, sb-ctwrap subitem[data-id] img");

        if (zoomMode == ImageZoomMode.Disabled) return;

        // Listen for mouse position
        let throttled = false;
        $(document).on("mousemove.re621.zoom", (event) => {

            // Throttle the mousemove events to 40 frames per second
            // Anything less than 30 feels choppy, but performance is a concern
            if (throttled) return;
            throttled = true;
            window.setTimeout(() => { throttled = false }, 25);

            this.pageX = event.pageX;
            this.pageY = event.pageY;
            HoverZoom.trigger("mousemove", { x: event.pageX, y: event.pageY, });
        });

        // Listen for mouse hover over thumbnails
        let timer = 0;
        let scrolling = false;
        const zoomDelay = this.fetchSettings("zoomDelay");
        $("#page")
            .on("mouseenter.re621.zoom", "post, .post-preview, div.post-thumbnail, sb-ctwrap subitem[data-id] img", (event) => {
                if (scrolling) return;

                let $ref = $(event.currentTarget);
                if ($ref.attr("hztarget"))
                    $ref = $ref.parents($ref.attr("hztarget"));
                $ref.attr("hovering", "true");

                HoverZoom.curPost = $ref.is("post")
                    ? Post.get($ref)
                    : PostData.fromThumbnail($ref);

                window.clearTimeout(timer);
                timer = window.setTimeout(() => {
                    HoverZoom.trigger("zoom.start", { post: HoverZoom.curPost.id, pageX: event.pageX, pageY: event.pageY });
                }, zoomDelay);
            })
            .on("mouseleave.re621.zoom", "post, .post-preview, div.post-thumbnail, sb-ctwrap subitem[data-id] img", (event) => {
                let $ref = $(event.currentTarget);
                if ($ref.attr("hztarget"))
                    $ref = $ref.parents($ref.attr("hztarget"));
                $ref.removeAttr("hovering");

                HoverZoom.curPost = null;

                window.clearTimeout(timer);
                HoverZoom.trigger("zoom.stop", { post: $ref.data("id"), pageX: event.pageX, pageY: event.pageY });
            });

        let scrollTimer = 0;
        $(document).on("scroll.re621.zoom", () => {
            if (scrollTimer) window.clearTimeout(scrollTimer);
            scrollTimer = window.setTimeout(() => {
                scrolling = false;
            }, 100);
            scrolling = true;
        })

        // Listen for the Shift button being held
        if (zoomMode !== ImageZoomMode.OnShift) return;
        $(document)
            .on("keydown.re621.zoom", (event) => {
                if (this.shiftPressed || (event.originalEvent as KeyboardEvent).key !== "Shift") return;
                this.shiftPressed = true;
                for (const el of $("[hovering=true]")) {
                    const $el = $(el);
                    if ($el.attr("hztrigger"))
                        $el.find($el.attr("hztrigger")).trigger("mouseenter.re621.zoom")
                    else $(el).trigger("mouseenter.re621.zoom");
                }
            })
            .on("keyup.re621.zoom", (event) => {
                if (!this.shiftPressed || (event.originalEvent as KeyboardEvent).key !== "Shift") return;
                this.shiftPressed = false;
                if (!stickyShift) resetOnUnshift();
            });
        $(window).on("blur.re621.zoom", () => {
            this.shiftPressed = false;
            if (!stickyShift) resetOnUnshift();
        });
        $(window).on("contextmenu.re621.zoom", () => {
            this.shiftPressed = false;
            if (!stickyShift) resetOnUnshift();
        })

        function resetOnUnshift(): void {
            if (!HoverZoom.curPost) return;
            HoverZoom.trigger("zoom.stop", { post: HoverZoom.curPost.id, pageX: null, pageY: null });
            HoverZoom.curPost = null;
        }
    }

    /** Initialize the event listeners for the hover zoom functionality */
    private initFunctionality(): void {

        let videoTimeout: number;

        const viewport = $(window);
        HoverZoom.on("zoom.start", (event, data) => {
            const mode = this.fetchSettings("mode");
            if (HoverZoom.paused || (mode == ImageZoomMode.OnShift && !this.shiftPressed))
                return;

            const $ref = $(`#entry_${data.post}, #post_${data.post}, div.post-thumbnail[data-id=${data.post}], subitem[data-id=${data.post}]`).first();

            let post: PostData;
            if ($ref.is("post")) post = Post.get($ref);
            else {
                post = PostData.fromThumbnail($ref);
                Blacklist.addPost(post);
            }

            // Skip blacklisted posts, if necessary
            if (this.fetchSettings("skipBlacklisted")
                && (post["$ref"]                    // Placeholder until feat:thumb gets finished
                    ? Blacklist.checkPost(post)     // Non-RE621 blacklist does not work properly with this
                    : $ref.find("img:first").attr("src") == "/images/blacklisted-preview.png")
            ) return;

            // Skip deleted and flash files
            if ((post.flags.has(PostFlag.Deleted) && !User.canSeeDeletedPosts) || post.file.ext == "swf") return;

            const $img = $ref.find("img").first();
            $ref.data("stored-title", $img.attr("title") || "");
            $img.removeAttr("title");

            this.$zoomBlock.attr("status", "loading");

            // Calculate preview width and height
            let width = Math.min(post.img.width, viewport.width() * 0.5 - 50),
                height = width * post.img.ratio;

            if (height > (viewport.height() * 0.75)) {
                height = viewport.height() * 0.75;
                width = height / post.img.ratio;
            }

            this.$zoomImage.css({
                "width": width + "px",
                "height": height + "px",
            });

            // Display the image
            if (post.file.ext == "webm") {
                this.$zoomVideo
                    .removeClass("display-none")
                    .css("background-image", `url("${post.file.sample}")`)
                    .attr({
                        src: post.file.original,
                        poster: post.file.sample,
                    });

                // Chrome blocks the video autoplay unless it's muted
                // No, I don't remember why it's on a timeout
                videoTimeout = window.setTimeout(() => {
                    this.$zoomVideo.prop("muted", this.fetchSettings<boolean>("audio") == false);
                }, 100);

                this.$zoomBlock.attr("status", "ready");
            } else {
                this.$zoomImage
                    .removeClass("display-none")
                    .css("background-image", `url("${post.file.preview}")`)
                    .attr("src", post.file.sample)
                    .one("load", () => {
                        this.$zoomBlock.attr("status", "ready");
                        this.$zoomImage.css("background-image", "");
                    });
            }

            // Write the image data into the info block
            this.$zoomInfo.html("");
            if (post.img.width && post.img.height)
                $("<span>") // dimensions and filesize
                    .text(`${post.img.width} x ${post.img.height}` + (post.file.size > 0 ? `, ${Util.Size.format(post.file.size)}` : ""))
                    .appendTo(this.$zoomInfo);
            if (post.rating)
                $("<span>") // rating
                    .addClass("post-info-rating rating-" + post.rating)
                    .text(post.rating)
                    .appendTo(this.$zoomInfo);
            if (post.date.iso !== "0")
                $("<span>")
                    .text(this.fetchSettings("time") ? post.date.ago : Util.Time.format(post.date.iso))
                    .appendTo(this.$zoomInfo);

            // Append the tags block
            if (this.fetchSettings("tags"))
                this.$zoomTags
                    .text(post.tagString)
                    .css({ "max-width": width + "px" });

            // Listen for mouse movements to move the preview accordingly
            HoverZoom.on("mousemove.tracking", () => {
                alignWindow(viewport, this.$zoomBlock, this.pageX, this.pageY);
            });
            alignWindow(viewport, this.$zoomBlock, this.pageX, this.pageY);

            function alignWindow(viewport: JQuery<Window>, zoomBlock: JQuery<HTMLElement>, x: number, y: number): void {
                const imgHeight = zoomBlock.height(),
                    imgWidth = zoomBlock.width(),
                    cursorX = x,
                    cursorY = y - viewport.scrollTop();

                const left = (cursorX < (viewport.width() / 2))
                    ? cursorX + 50                                  // left side of the screen
                    : cursorX - imgWidth - 50;                      // right side
                const top = Util.Math.clamp(cursorY - (imgHeight / 2), 10, (viewport.height() - imgHeight - 10));

                zoomBlock.css({
                    "left": `${left}px`,
                    "top": `${top}px`,
                });
            }

        });

        HoverZoom.on("zoom.stop", (event, data) => {
            HoverZoom.off("mousemove.tracking");

            const $ref = $(`#entry_${data.post}, #post_${data.post}, div.post-thumbnail[data-id=${data.post}]`).first();

            const $img = $ref.find("img").first();
            if ($ref.data("stored-title")) $img.attr("title", $ref.data("stored-title"));

            // Reset the preview window
            this.$zoomBlock
                .attr("status", "waiting")
                .css({
                    "left": 0,
                    "top": "100vh",
                });
            this.$zoomInfo.html("");
            this.$zoomImage
                .addClass("display-none")
                .removeAttr("style")
                .attr("src", Util.DOM.getPlaceholderImage());
            this.$zoomVideo
                .addClass("display-none")
                .prop("muted", this.fetchSettings<boolean>("audio") == false);
            if (this.$zoomVideo.attr("src") !== "")
                this.$zoomVideo.attr({
                    "poster": "",
                    "src": "",
                });
            window.clearTimeout(videoTimeout);
            this.$zoomTags
                .removeAttr("style")
                .html("");
        });
    }

    private downloadCurPost(): void {
        Debug.log("hovering over", HoverZoom.curPost);
        if (HoverZoom.curPost == null) return;
        XM.Connect.browserDownload({
            url: HoverZoom.curPost.file.original,
            name: DownloadCustomizer.getFileName(HoverZoom.curPost),
            saveAs: ModuleController.fetchSettings<boolean>(DownloadCustomizer, "confirmDownload"),
        });
    }

    private fullscreenCurPost(): void {
        Debug.log("hovering over", HoverZoom.curPost);
        if (HoverZoom.curPost == null) return;
        const win = window.open(HoverZoom.curPost.file.original, '_blank');
        win.focus();
    }

}

export enum ImageZoomMode {
    Disabled = "disabled",
    Hover = "hover",
    OnShift = "onshift",
}
