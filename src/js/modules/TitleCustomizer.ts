import { Post } from "../components/Post";
import { RE6Module } from "../components/RE6Module";


/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class TitleCustomizer extends RE6Module {

    private static instance: TitleCustomizer = new TitleCustomizer();

    private constructor() {
        super();
        const post = Post.getViewingPost();
        if (post === undefined) {
            return;
        }
        const oldTitle = document.title;
        let prefix = "";
        if (post.getIsFaved()) {
            prefix += this.fetchSettings("favsymbol");
        }
        if (post.getIsUpvoted()) {
            prefix += this.fetchSettings("voteupsymbol")
        } else if (post.getIsDownvoted()) {
            prefix += this.fetchSettings("votedownsymbol")
        }
        document.title = prefix + oldTitle;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "favsymbol": "\u2665",      //heart symbol
            "voteupsymbol": "\u2191",   //arrow up
            "votedownsymbol": "\u2193"  //arrow down
        };
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
