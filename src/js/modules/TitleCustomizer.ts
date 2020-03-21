import { Post } from "../components/Post";
import { RE6Module } from "../components/RE6Module";
import { TagTypes, Tag } from "../components/Tag";


/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class TitleCustomizer extends RE6Module {

    private static instance: TitleCustomizer = new TitleCustomizer();

    private constructor() {
        super();

        const post = Post.getViewingPost();
        if (post === undefined) { return; }

        document.title = this.parseTemplate();
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "template": "%icons% #%postnum% by %author% (%copyright%) - %character%",
            "symbolsEnabled": true,
            "symbol-fav": "\u2665",      //heart symbol
            "symbol-voteup": "\u2191",   //arrow up
            "symbol-votedown": "\u2193",  //arrow down

        };
    }

    private parseTemplate() {
        let post = Post.getViewingPost();

        let prefix = "";
        if (this.fetchSettings("symbolsEnabled")) {
            if (post.getIsFaved()) { prefix += this.fetchSettings("symbol-fav"); }
            if (post.getIsUpvoted()) { prefix += this.fetchSettings("symbol-voteup"); }
            else if (post.getIsDownvoted()) { prefix += this.fetchSettings("symbol-votedown"); }
            if (prefix) prefix += " ";
        }

        return this.fetchSettings("template")
            .replace(/%icons%/g, prefix)
            .replace(/%postnum%/g, post.getId().toString())
            .replace(/%author%/g, post.getTagsFromType(TagTypes.Artist).filter(tag => Tag.isArist(tag)).join(", "))
            .replace(/%copyright%/g, post.getTagsFromType(TagTypes.Copyright).join(", "))
            .replace(/%character%/g, post.getTagsFromType(TagTypes.Character).join(", "));
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
