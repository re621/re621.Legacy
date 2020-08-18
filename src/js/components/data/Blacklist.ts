import { BlacklistEnhancer } from "../../modules/search/BlacklistEnhancer";
import { PostData } from "../post/PostData";
import { PostFilter } from "../post/PostFilter";
import { Util } from "../utility/Util";
import { User } from "./User";

export class Blacklist {

    private static instance: Blacklist;

    private blacklist = new Map<string, PostFilter>();

    private constructor() {
        const filters = $("head meta[name=blacklisted-tags]").attr("content");
        const blacklistEnabled = Util.LS.getItem("dab") !== "1";

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
    private static get(): Map<string, PostFilter> {
        return this.getInstance().blacklist;
    }

    /** Returns the filters that currently have posts on record */
    public static getActiveFilters(): Map<string, PostFilter> {
        const result: Map<string, PostFilter> = new Map();
        for (const [tags, filter] of this.getInstance().blacklist)
            if (filter.getMatchesCount() > 0) result.set(tags, filter);
        return result;
    }

    /**
     * Adds the post to the blacklist cache
     * @param posts Post(s) to add to the cache
     * @returns Number of filters that match the post
     */
    public static addPost(...posts: PostData[]): number {
        let count = 0;
        for (const filter of Blacklist.get().values()) {
            if (filter.update(posts)) count++;
        }
        return count;
    }

    /**
     * Alias of `addPost`, to avoid ambiguity
     * @param posts Post(s) to update
     * @returns Number of filters that match the post
     */
    public static updatePost(...posts: PostData[]): number {
        return Blacklist.addPost(...posts);
    }

    /** Returns true if the post is in the blacklist cache */
    public static checkPost(post: PostData | number, ignoreDisabled = false): boolean {
        if (typeof post !== "number") post = post.id;
        for (const filter of Blacklist.get().values()) {
            if (filter.matchesID(post, ignoreDisabled)) return true;
        }
        return false;
    }

    /** Enables all blacklist filters */
    public static enableAll(): void {
        for (const filter of Blacklist.get().values())
            filter.setEnabled(true);
    }

    /** Disables all blacklist filters */
    public static disableAll(): void {
        for (const filter of Blacklist.get().values())
            filter.setEnabled(false);
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
        /*
        const posts = Post.fetchPosts();
        for (const post of posts) {
            postFilter.addPost(post, false);
        }
        */
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

    /**
     * Adds or removes a tag from the user's blacklist
     * @param tagname Name of the tag to toggle
     */
    public static async toggleBlacklistTag(tagName: string): Promise<void> {

        let currentBlacklist = (await User.getCurrentSettings()).blacklisted_tags.split("\n");

        if (currentBlacklist.indexOf(tagName) === -1) {
            currentBlacklist.push(tagName);
            Blacklist.createFilter(tagName);
            Danbooru.notice(`Adding ${getTagLink(tagName)} to blacklist`);
        } else {
            currentBlacklist = currentBlacklist.filter(e => e !== tagName);
            Blacklist.deleteFilter(tagName);
            Danbooru.notice(`Removing ${getTagLink(tagName)} from blacklist`);
        }

        await User.setSettings({ blacklisted_tags: currentBlacklist.join("\n") });

        BlacklistEnhancer.update();
        // TODO Trigger BetterSearch visibility update

        return Promise.resolve();

        function getTagLink(tagName: string): string {
            if (tagName.startsWith("id:")) return `<a href="/posts/${tagName.substr(3)}" target="_blank">${tagName}</a>`;
            return `<a href="/wiki_pages/show_or_new?title=${tagName}">${tagName}</a>`;
        }
    }

}
