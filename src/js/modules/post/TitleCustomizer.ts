import { Page, PageDefintion } from "../../components/data/Page";
import { Post, ViewingPost } from "../../components/data/Post";
import { Tag, TagTypes } from "../../components/data/Tag";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class TitleCustomizer extends RE6Module {

    private post: ViewingPost;

    public constructor() {
        super(PageDefintion.post);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "#%postid% by %artist% (%copyright%) - %character%",
            symbolsEnabled: true,
            symbolFav: "\u2665",      //heart symbol
            symbolVoteUp: "\u2191",   //arrow up
            symbolVoteDown: "\u2193",  //arrow down
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        this.post = Post.getViewingPost();
        this.refreshPageTitle();
    }

    /**
     * Refreshes the page's title according to the template in the settings
     */
    public refreshPageTitle(): void {
        document.title = this.parseTemplate();
    }

    /**
     * Parses the page title template, replacing variables with their corresponding values
     * @returns string Page title
     */
    private parseTemplate(): string {
        let prefix = "";
        if (this.fetchSettings("symbolsEnabled")) {
            if (this.post.getIsFaved()) { prefix += this.fetchSettings("symbolFav"); }
            if (this.post.getIsUpvoted()) { prefix += this.fetchSettings("symbolVoteUp"); }
            else if (this.post.getIsDownvoted()) { prefix += this.fetchSettings("symbolVoteDown"); }
            if (prefix) prefix += " ";
        }

        return prefix + this.fetchSettings("template")
            .replace(/%postid%/g, this.post.getId().toString())
            .replace(/%artist%/g, this.post.getTagsFromType(TagTypes.Artist).filter(tag => Tag.isArist(tag)).join(", "))
            .replace(/%copyright%/g, this.post.getTagsFromType(TagTypes.Copyright).join(", "))
            .replace(/%character%/g, this.post.getTagsFromType(TagTypes.Character).join(", "))
            .replace(/%species%/g, this.post.getTagsFromType(TagTypes.Species).join(", "))
            .replace(/%meta%/g, this.post.getTagsFromType(TagTypes.Meta).join(", "))
            .replace(/\(\)|( - )$/g, "")
            .replace(/[ ]{2,}|^ | $/g, "")
            + " - " + Page.getSiteName();
    }
}
