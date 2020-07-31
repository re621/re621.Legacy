import { Post } from "./Post";
import { PostFilter } from "./PostFilter";

export class Blacklist {

    private static instance: Blacklist;

    private blacklist = new Map<string, PostFilter>();

    private constructor() {
        const filters = $("head meta[name=blacklisted-tags]").attr("content");
        const blacklistEnabled = $("#disable-all-blacklists").is(":visible");

        if (filters !== undefined) {
            for (const filter of JSON.parse(filters))
                this.createFilter(filter, blacklistEnabled);
        }
    }

    /** Returns a singleton instance of the class */
    private static getInstance(): Blacklist {
        if (this.instance == undefined) this.instance = new Blacklist();
        return this.instance;
    }

    /**
     * Returns the parsed blacklist filters
     * @returns PostFilter[] A array of the users current filters
     */
    public static get(): Map<string, PostFilter> {
        return this.getInstance().blacklist;
    }

    /**
     * Creates a new filter based on provided tag string
     * @param filter String which should be turned into a PostFilter
     * @param enabled Whether or not the filter should be enabled after creation
     */
    private createFilter(filter: string, enabled = true): void {
        let postFilter = this.blacklist.get(filter);
        if (postFilter === undefined) {
            postFilter = new PostFilter(filter, enabled);
            this.blacklist.set(filter, postFilter);
        }
        const posts = Post.fetchPosts();
        for (const post of posts) {
            postFilter.addPost(post, false);
        }
    }

    /**
     * Creates a new filter based on provided tag string
     * @param filter String which should be turned into a PostFilter
     * @param enabled Whether or not the filter should be enabled after creation
     */
    public static createFilter(filter: string, enabled = true): void {
        return this.getInstance().createFilter(filter, enabled);
    }

    /**
     * Deletes the filter matching provided tag string
     * @param filter String which should match an existing PostFilter
     */
    private deleteFilter(filter: string): void {
        this.blacklist.delete(filter);
    }

    /**
     * Deletes the filter matching provided tag string
     * @param filter String which should match an existing PostFilter
     */
    public static deleteFilter(filter: string): void {
        return this.getInstance().deleteFilter(filter);
    }

}
