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
        if (post === undefined) {
            return;
        }
        const oldTitle = document.title;
        let prefix = "";
        const symbols = this.fetchSettings("symbols");
        if (post.getIsFaved()) {
            prefix += symbols.fav;
        }
        if (post.getIsUpvoted()) {
            prefix += symbols.voteup;
        } else if (post.getIsDownvoted()) {
            prefix += symbols.votedown;
        }

        let tagsToAddToTitle = [];
        if (this.fetchSettings("addArtistToTitle") === true) {
            const tags = post.getTagsFromType(TagTypes.Artist).filter(tag => Tag.isArist(tag));
            tagsToAddToTitle = tagsToAddToTitle.concat(tags);
        }
        if (this.fetchSettings("addCopyrightToTitle") === true) {
            tagsToAddToTitle = tagsToAddToTitle.concat(post.getTagsFromType(TagTypes.Copyright));
        }
        const titleSplit = oldTitle.split(" ");
        //add a extra space after the number only if there are any tags
        titleSplit[0] += (tagsToAddToTitle.length === 0) ? "" : " " + tagsToAddToTitle.join(" ");

        document.title = prefix + titleSplit.join(" ");
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "symbols": {
                "fav": "\u2665",      //heart symbol
                "voteup": "\u2191",   //arrow up
                "votedown": "\u2193"  //arrow down
            },
            "addArtistToTitle": true,
            "addCopyrightToTitle": false
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
