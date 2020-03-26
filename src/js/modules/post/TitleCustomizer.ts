import { Post, ViewingPost } from "../../components/data/Post";
import { RE6Module } from "../../components/RE6Module";
import { TagTypes, Tag } from "../../components/data/Tag";
import { PageDefintion } from "../../components/data/Page";


/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class TitleCustomizer extends RE6Module {

    private static instance: TitleCustomizer = new TitleCustomizer();

    private post: ViewingPost;

    private constructor() {
        super(PageDefintion.post);
        if (!this.eval()) return;

        this.post = Post.getViewingPost();

        this.refreshPageTitle();
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "template": "#%postid% by %artist% (%copyright%) - %character%",
            "symbolsEnabled": true,
            "symbol-fav": "\u2665",      //heart symbol
            "symbol-voteup": "\u2191",   //arrow up
            "symbol-votedown": "\u2193",  //arrow down

        };
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
            if (this.post.getIsFaved()) { prefix += this.fetchSettings("symbol-fav"); }
            if (this.post.getIsUpvoted()) { prefix += this.fetchSettings("symbol-voteup"); }
            else if (this.post.getIsDownvoted()) { prefix += this.fetchSettings("symbol-votedown"); }
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

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new TitleCustomizer();
        return this.instance;
    }
}
