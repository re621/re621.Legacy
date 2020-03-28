import { RE6Module } from "../RE6Module";
import { Api } from "../api/Api";
import { PostFilter } from "./PostFilter";
import { Post } from "./Post";
import { BlacklistEnhancer } from "../../modules/search/BlacklistEnhancer";

/**
 * User  
 * Basic framework for fetching user information from the page metadata
 */
export class User extends RE6Module {

    private static instance: User;

    private loggedin: boolean;
    private username: string;
    private userid: string;

    private level: string;

    private blacklist = new Map<string, PostFilter>();

    private constructor() {
        super();
        let $ref = $("body");

        this.loggedin = $ref.attr("data-user-is-anonymous") == "false";
        this.username = $ref.attr("data-user-name") || "Anonymous";
        this.userid = $ref.attr("data-user-id") || "0";
        this.level = $ref.attr("data-user-level-string") || "Guest";

        const filters = JSON.parse($("head meta[name=blacklisted-tags]").attr("content"));
        const blacklistEnabled = BlacklistEnhancer.blacklistIsActive();
        for (const filter of filters) {
            this.addBlacklistFilter(filter, blacklistEnabled);
        }
    }

    /**
     * Returns a singleton instance of the class
     * @returns User instance
     */
    public static getInstance(): User {
        if (this.instance === undefined) this.instance = new User();
        return this.instance;
    }

    /**
     * Returns user's login state
     * @returns boolean true if the user is logged in, false otherwise
     */
    public static isLoggedIn() {
        return this.getInstance().loggedin;
    }

    /**
     * Returns user's name
     * @returns string Username if the user is logged in, "Anonymous" otherwise
     */
    public static getUsername() {
        return this.getInstance().username;
    }

    /**
     * Returns user's ID
     * @returns string User ID if the user is logged in, 0 otherwise
     */
    public static getUserID() {
        return this.getInstance().userid;
    }

    /**
     * Returns user's group level
     * @returns string Group if the user is logged in, "Guest" otherwise
     */
    public static getLevel() {
        return this.getInstance().level;
    }

    /**
     * Returns the parsed blacklist filters
     * @returns PostFilter[] A array of the users current filters
     */
    public static getBlacklist() {
        return this.getInstance().blacklist;
    }

    /**
     * Saves the passed blacklist to the users e6 account
     * and refreshes the currently visible posts
     * @param filter the string which should be turned into a PostFilter
     * @param enabled wether or not the filter should be enabled after creation
     */
    public addBlacklistFilter(filter: string, enabled = true) {
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
    public static async getCurrentSettings() {
        return Api.getJson("/users/" + this.getUserID() + ".json");
    }

    /**
     * Saves the settings for the user
     * There is no need to put the keys into array form, this happens automatically
     */
    public static async setSettings(data: {}) {
        const url = "/users/" + this.getUserID() + ".json";
        const json = {
            "_method": "patch"
        }
        for (const key of Object.keys(data)) {
            json["user[" + key + "]"] = data[key];
        }
        await Api.postUrl(url, json);
    }
}
