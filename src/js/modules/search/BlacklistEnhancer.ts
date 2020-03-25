import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";

declare var Danbooru;

/**
 * Blacklist Enhancer  
 * Replaces e6 blacklist functionality
 */
export class BlacklistEnhancer extends RE6Module {

    private static instance: BlacklistEnhancer;

    private constructor() {
        super([PageDefintion.search, PageDefintion.post]);
        if (!this.eval()) return;

        //Override default blacklist function
        Danbooru.Blacklist.apply = () => { };

        //catch when the user toggles the blacklist
        $("#disable-all-blacklists").add("#re-enable-all-blacklists").on("click", () => {
            this.applyBlacklist();
        });

        //Apply blacklist without user interaction. Blacklist might be active
        this.applyBlacklist();
    }


    private blacklistIsActive() {
        return $("#disable-all-blacklists").is(":visible");
    }

    /**
     * Hides posts, if they are blacklisted and blacklist is active, show otherwise
     * @param hide 
     */
    private applyBlacklist() {
        const blacklistIsActive = this.blacklistIsActive();
        for (const post of Post.fetchPosts()) {
            post.applyBlacklist(blacklistIsActive);
        }
    }

    /**
     * Returns a singleton instance of the class
     * @returns BlacklistEnhancer instance
     */
    public static getInstance() {
        if (this.instance === undefined) this.instance = new BlacklistEnhancer();
        return this.instance;
    }

}
