import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { PostUtilities } from "../../components/structure/PostUtilities";

export class BetterSearch extends RE6Module {

    private static paused = false;              // If true, stops several actions that may interfere with other modules

    private $wrapper: JQuery<HTMLElement>;      // wrapper object containing the loading and content sections
    private $loading: JQuery<HTMLElement>;      // loading screen displayed over the content
    private $content: JQuery<HTMLElement>;      // section containing post thumbnails

    public constructor() {
        super([PageDefintion.search, PageDefintion.favorites]);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            imageLoadMethod: ImageLoadMethod.Disabled,      // whether the image should be loaded as a preview, as a sample immediately, or on hover
            autoPlayGIFs: true,                             // If false, animated GIFs will use the `hover` load method even if that is set to `always`

            imageSizeChange: true,                          // If true, resizes the image in accordance with `imageWidth`
            imageWidth: "150px",                            // Width if the resized image
            imageRatioChange: true,                         // If true, crops the image to ratio specified in `imageRatio`
            imageRatio: "0.9",                              // Ratio to conform to

            zoomMode: ImageZoomMode.Disabled,               // How should the hover zoom be triggered
            zoomScale: "2",
            zoomContextual: true,

            hoverTags: false,                               // if true, adds a hover text to the image containing all of its tags

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
    }

    public create(): void {
        super.create();

        this.updateContentHeader();

        E621.Posts.get<APIPost>({}, 500).then((search) => {
            console.log(search);

            for (const post of search) {
                this.$content.append(PostUtilities.make(post));
            }

            this.$wrapper.attr("loading", "false");
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
