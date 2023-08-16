import { Danbooru } from "../../components/api/Danbooru";
import { PageDefinition } from "../../components/data/Page";
import { ImageScalingMode, User } from "../../components/data/User";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Handles scaling post images in an intelligent way
 */
export class ImageScaler extends RE6Module {

    public constructor() {
        super(PageDefinition.posts.view, true);
        this.registerHotkeys(
            { keys: "hotkeyScale", fnct: this.cycleScaling },
            { keys: "hotkeyFullscreen", fnct: this.openFullscreen },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            hotkeyScale: "v|0",                 // cycle through the various scaling modes
            hotkeyFullscreen: "",               // open the current post in fullscreen mode

            clickScale: true,                   // click on the image to change the scale
            clickShowFiltered: false,           // click on blacklisted image to show it
            organizeModes: true,                // re-order the scaling modes

            dynSizeMode: DynSizeMode.Disabled,  // dynamic scaling mode
            dynSizeDeadzone: 0.1,               // only for DynSizeMode.AspectScale - negative for height bias, positive for width
            dynSizeTags: "comic",               // only for DynSizeMode.TagScale - tags that cause the scale to flip to fit-width
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        const $container = $("#image-container"),
            $selector = $("#image-resize-selector");

        const isInteractive = Post.getViewingPost().meta.interactive;

        const post = Post.getViewingPost();

        // Set up dynamic scaling options
        const dynSizeMode = this.fetchSettings("dynSizeMode");
        if (dynSizeMode !== DynSizeMode.Disabled)
            Danbooru.Post.resize_to(this.calcDynamicSize(post, dynSizeMode));

        // Rename the "download" button - actual downloading is provided by DownloadCustomizer
        $("#image-download-link a").html("Fullscreen");

        // Re-order the scaling modes
        if (this.fetchSettings("organizeModes")) {
            $selector.find("option[value=fitv]").appendTo($selector);
            $selector.find("option[value=fit]").appendTo($selector);
            $selector.find("option[value=original]").appendTo($selector);
        }

        // Handle clicking on the post
        $container.on("click", async () => {

            // Workaround to un-blacklist images on mouse click
            if ($container.hasClass("blacklisted")) {
                if (!this.fetchSettings("clickShowFiltered")) return;

                $container.removeClass("blacklisted");
                const size = ($selector.val() + "") || "large";
                Danbooru.Post.resize_to(size);
                Danbooru.Post.resize_notes();

                return;
            }
            
            // Does not work with those types of files anyways
            if(post.file.ext == "webm" || post.file.ext == "swf")
                return;

            // Disable this when notes are being edited
            if (!this.fetchSettings("clickScale")
                || isInteractive
                || await Danbooru.Note.TranslationMode.active()) return;

            this.cycleScaling();
        });

    }

    /** Opens the post in fullscreen mode */
    private openFullscreen(): void {
        $("#image-download-link a")[0].click();
    }

    /** Cycles through scaling modes */
    private cycleScaling(): void {
        Danbooru.Post.resize_cycle_mode();
    }

    private calcDynamicSize(post: Post, mode: DynSizeMode): ImageScalingMode {
        if (mode == DynSizeMode.AspectScale) {
            if (post.img.ratio < (1 - this.fetchSettings<number>("dynSizeDeadzone"))) return ImageScalingMode.FitHeight;
            return ImageScalingMode.FitWidth;
        } else if (mode == DynSizeMode.TagScale) {
            if (setHasAny(post.tags.all, this.fetchSettings<string>("dynSizeTags").split(" "))) return ImageScalingMode.FitWidth
            return ImageScalingMode.FitHeight;
        }
        return User.defaultImageSize;

        function setHasAny(list: Set<string>, entries: string[]): boolean {
            for (const entry of entries)
                if (list.has(entry)) return true;
            return false;
        }
    }

}

enum DynSizeMode {
    Disabled = 0,
    AspectScale = 1,
    TagScale = 2,
}
