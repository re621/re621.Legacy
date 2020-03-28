import { Post, ViewingPost } from "../../components/data/Post";
import { RE6Module } from "../../components/RE6Module";
import { TagTypes, Tag } from "../../components/data/Tag";
import { PageDefintion } from "../../components/data/Page";


/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class TitleCustomizer extends RE6Module {

    private static instance: TitleCustomizer;

    private post: ViewingPost;

    private constructor() {
        super(PageDefintion.post);
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new TitleCustomizer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            enabled: true,
            template: "#%postid% by %artist% (%copyright%) - %character%",
            symbolsEnabled: true,
            symbol_fav: "\u2665",      //heart symbol
            symbol_voteup: "\u2191",   //arrow up
            symbol_votedown: "\u2193",  //arrow down
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();

        this.post = Post.getViewingPost();
        this.refreshPageTitle();
    }

    /**
     * Refreshes the page's title according to the template in the settings
     */
    public refreshPageTitle() {
        document.title = this.parseTemplate();
    }

    /**
     * Parses the page title template, replacing variables with their corresponding values
     * @returns string Page title
     */
    private parseTemplate() {
        let prefix = "";
        if (this.fetchSettings("symbolsEnabled")) {
            if (this.post.getIsFaved()) { prefix += this.fetchSettings("symbol_fav"); }
            if (this.post.getIsUpvoted()) { prefix += this.fetchSettings("symbol_voteup"); }
            else if (this.post.getIsDownvoted()) { prefix += this.fetchSettings("symbol_votedown"); }
            if (prefix) prefix += " ";
        }

        return prefix + this.fetchSettings("template")
            .replace(/%postid%/g, this.post.getId().toString())
            .replace(/%artist%/g, this.post.getTagsFromType(TagTypes.Artist).filter(tag => Tag.isArist(tag)).join(", "))
            .replace(/%copyright%/g, this.post.getTagsFromType(TagTypes.Copyright).join(", "))
            .replace(/%character%/g, this.post.getTagsFromType(TagTypes.Character).join(", "))
            .replace(/\(\)|( - )$/g, "")
            .replace(/[ ]{2,}|^ | $/g, "")
            + " - e621";
    }
}
