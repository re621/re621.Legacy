import { RE6Module } from "../RE6Module";
import { Api } from "../api/Api";
import { PostFilter } from "./PostFilter";
import { Post } from "./Post";
import { ApiUserSettings } from "../api/responses/ApiUserSettings";

/**
 * User  
 * Basic framework for fetching user information from the page metadata
 */
export class User extends RE6Module {

    private loggedin: boolean;
    private username: string;
    private userid: number;

    private level: string;

    private blacklist = new Map<string, PostFilter>();

    public constructor() {
        super();
        const $ref = $("body");

        this.loggedin = $ref.attr("data-user-is-anonymous") == "false";
        this.username = $ref.attr("data-user-name") || "Anonymous";
        this.userid = parseInt($ref.attr("data-user-id")) || 0;
        this.level = $ref.attr("data-user-level-string") || "Guest";

        const filters = JSON.parse($("head meta[name=blacklisted-tags]").attr("content"));
        const blacklistEnabled = $("#disable-all-blacklists").is(":visible");

        for (const filter of filters) {
            this.addBlacklistFilter(filter, blacklistEnabled);
        }
    }

    private static get(): User {
        return super.getInstance() as User;
    }

    /**
     * Returns user's login state
     * @returns boolean true if the user is logged in, false otherwise
     */
    public static isLoggedIn(): boolean {
        return this.get().loggedin;
    }

    /**
     * Returns user's name
     * @returns string Username if the user is logged in, "Anonymous" otherwise
     */
    public static getUsername(): string {
        return this.get().username;
    }

    /**
     * Returns user's ID
     * @returns string User ID if the user is logged in, 0 otherwise
     */
    public static getUserID(): number {
        return this.get().userid;
    }

    /**
     * Returns user's group level
     * @returns string Group if the user is logged in, "Guest" otherwise
     */
    public static getLevel(): string {
        return this.get().level;
    }

    /**
     * Returns the parsed blacklist filters
     * @returns PostFilter[] A array of the users current filters
     */
    public static getBlacklist(): Map<string, PostFilter> {
        return this.get().blacklist;
    }

    /**
     * Saves the passed blacklist to the users e6 account
     * and refreshes the currently visible posts
     * @param filter the string which should be turned into a PostFilter
     * @param enabled wether or not the filter should be enabled after creation
     */
    public addBlacklistFilter(filter: string, enabled = true): void {
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
     * @returns the users e6 site settings
     */
    public static async getCurrentSettings(): Promise<ApiUserSettings> {
        return Api.getJson("/users/" + this.getUserID() + ".json");
    }

    /**
     * Saves the settings for the user
     * There is no need to put the keys into array form, this happens automatically
     */
    public static async setSettings(data: {}): Promise<void> {
        const url = "/users/" + this.getUserID() + ".json";
        const json = {
            "_method": "patch"
        };
        for (const key of Object.keys(data)) {
            json["user[" + key + "]"] = data[key];
        }
        await Api.postUrl(url, json);
    }
}
