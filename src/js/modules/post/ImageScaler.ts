import { Danbooru } from "../../components/api/Danbooru";
import { PageDefinition } from "../../components/data/Page";
import { User } from "../../components/data/User";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Handles scaling post images in an intelligent way
 */
export class ImageScaler extends RE6Module {

    public constructor() {
        super(PageDefinition.post, true);
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

            hotkeyScale: "v|0",         // cycle through the various scaling modes
            hotkeyFullscreen: "",       // open the current post in fullscreen mode

            clickScale: true,           // click on the image to change the scale
            clickShowFiltered: false,   // click on blacklisted image to show it
            organizeModes: true,        // re-order the scaling modes

            size: ImageSize.Fill,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        const $image = $("#image"),
            $container = $("#image-container"),
            $selector = $("#image-resize-selector");

        const isInteractive = Post.getViewingPost().meta.interactive;

        // Fix to a vanilla bug - blacklisted posts would not have the correct size selected
        $selector.val(User.defaultImageSize);

        // Rename the "download" button - actual downloading is provided by DownloadCustomizer
        $("#image-download-link a").html("Fullscreen");

        // Re-order the scaling modes
        if (this.fetchSettings("organizeModes")) {
            $selector.find("option[value=fitv]").appendTo($selector);
            $selector.find("option[value=fit]").appendTo($selector);
            $selector.find("option[value=original]").appendTo($selector);
        }

        // Handle clicking on the post
        $image.on("click", async () => {

            // Workaround to un-blacklist images on mouse click
            if ($container.hasClass("blacklisted-active-visible")) {
                if (!this.fetchSettings("clickShowFiltered")) return;

                $container.addClass("blacklisted").removeClass("blacklisted-active-visible");
                const size = ($selector.val() || "large") + "";
                Danbooru.Post.resize_to(size);

                return;
            }

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

}

enum ImageSize {
    Sample = "sample",
    Fill = "fit-vertical",
    Fit = "fit-horizontal",
    Original = "original",
}
