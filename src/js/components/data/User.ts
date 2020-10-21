import { E621 } from "../api/E621";
import { APICurrentUser } from "../api/responses/APIUser";

/**
 * User  
 * Basic framework for fetching user information from the page metadata
 */
export class User {

    public static loggedIn: boolean;
    public static username: string;
    public static userID: number;

    public static canApprovePosts: boolean;
    public static commentThreshold: number;
    public static blacklistedTags: string;
    public static blacklistUsers: boolean;

    public static enableJSNavigation: boolean;
    public static enableAutoComplete: boolean;
    public static styleUsernames: boolean;

    public static defaultImageSize: string;

    public static level: string;

    public static init(): void {
        const $ref = $("body");

        User.loggedIn = getValue("current-user-name") == "Anonymous";
        User.username = getValue("current-user-name");
        User.userID = parseInt(getValue("current-user-id")) || -1;

        User.canApprovePosts = getValue("current-user-can-approve-posts") == "true";
        User.commentThreshold = parseInt(getValue("user-comment-threshold")) || 3;
        User.blacklistedTags = getValue("blacklisted-tags");
        User.blacklistUsers = getValue("blacklist-users") == "true";

        User.enableJSNavigation = getValue("enable-js-navigation") == "true";
        User.enableAutoComplete = getValue("enable-auto-complete") == "true";
        User.styleUsernames = getValue("style-usernames") == "true";

        User.defaultImageSize = getValue("default-image-size");

        User.level = $ref.attr("data-user-level-string") || "Guest";

        function getValue(name: string): string {
            const el = $(`meta[name="${name}"]`);
            if (el.length == 0) return null;
            return el.attr("content");
        }
    }

    /**
     * @returns the users e6 site settings
     */
    public static async getCurrentSettings(): Promise<APICurrentUser> {
        return E621.User.id(User.userID).first<APICurrentUser>();
    }

    /**
     * Saves the settings for the user
     * There is no need to put the keys into array form, this happens automatically
     */
    public static async setSettings(data: any): Promise<void> {
        await E621.User.id(this.userID).post({ user: data, "_method": "patch" });
    }

}
