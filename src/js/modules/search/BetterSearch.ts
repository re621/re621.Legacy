import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { PostUtilities } from "../../components/structure/PostUtilities";

export class BetterSearch extends RE6Module {

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

            hoverTags: false,                               // if true, adds a hover text to the image containing all of its tags
        };
    }

    public async prepare(): Promise<void> {
        await super.prepare();

        // TODO check if module is enabled
        if (!this.pageMatchesFilter()) return;
        this.$wrapper = $("#content")
            .html("")
            .attr("loading", "true");

        this.$loading = $("<post-loading>")
            .html(`
                <span>
                    <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                </span>
            `)
            .appendTo(this.$wrapper);

        this.$content = $("<post-content>")
            .appendTo(this.$wrapper);
    }

    public create(): void {
        super.create();

        E621.Posts.get<APIPost>({}, 500).then((search) => {
            console.log(search);

            for (const post of search) {
                this.$content.append(PostUtilities.make(post));
            }

            this.$wrapper.attr("loading", "false");
        });
    }

}

export enum ImageLoadMethod {
    Disabled = "disabled",
    Hover = "hover",
    Always = "always",
}
