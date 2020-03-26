import { RE6Module } from "../RE6Module";
import { PostFilter } from "./PostFilter";
import { Api } from "../api/Api";
import { Post } from "./Post";

/**
 * User  
 * Basic framework for fetching user information from the page metadata
 */
export class User extends RE6Module {

    private static instance: User;

    private loggedin: boolean;
    private username: string;
    private userid: string;
    private blacklist: PostFilter[];

    private level: string;

    private constructor() {
        super();
        let $ref = $("body");

        this.loggedin = $ref.attr("data-user-is-anonymous") == "false";
        this.username = $ref.attr("data-user-name") || "Anonymous";
        this.userid = $ref.attr("data-user-id") || "0";

        this.refreshBlacklist();

        this.level = $ref.attr("data-user-level-string") || "Guest";
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
     * Returns user's blacklist
     * @returns string[] A array of space seperated strings
     */
    public static getBlacklist() {
        return this.getInstance().blacklist;
    }

    /**
     * Saves the passed blacklist to the users e6 account
     */
    public static setBlacklist(blacklistArray: string[]) {
        $("head meta[name=blacklisted-tags]").attr("content", JSON.stringify(blacklistArray))
        this.getInstance().refreshBlacklist();
    }

    private refreshBlacklist() {
        this.blacklist = [];
        const filterArray: string[] = JSON.parse($("head meta[name=blacklisted-tags]").attr("content"));
        for (const filter of filterArray) {
            this.blacklist.push(new PostFilter(filter));
        }
        Post.refreshBlacklistStatus();
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
