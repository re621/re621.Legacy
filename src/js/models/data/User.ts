import { E621 } from "../api/E621";
import { APICurrentUser } from "../api/responses/APIUser";

/**
 * User  
 * Basic framework for fetching user information from the page metadata
 */
export default class User {

    public static loggedIn: boolean;

    // From body parameters
    public static username: string;
    public static userID: number;
    public static level: number;
    public static levelString: string;

    public static isMember: boolean;
    public static isPrivileged: boolean;
    public static isContributor: boolean;
    public static isFormerStaff: boolean;
    public static isJanitor: boolean;
    public static isModerator: boolean;
    public static isAdmin: boolean;

    public static isBlocked: boolean;
    public static isVerified: boolean;
    public static canApprovePosts: boolean;
    public static canUploadFree: boolean;

    public static postsPerPage: number;

    // From meta tags
    public static commentThreshold: number;
    public static blacklistedTags: string;
    public static blacklistUsers: boolean;
    public static enableJSNavigation: boolean;
    public static enableAutoComplete: boolean;
    public static styleUsernames: boolean;
    public static defaultImageSize: ImageScalingMode;

    // Derived
    public static canSeeDeletedPosts: boolean;

    public static init(): void {
        const data = $("body").data() as BodyParams;

        User.loggedIn = data.userIsAnonymous == false;

        // From body parameters
        User.username = data.userName || "Anonymous";
        User.userID = data.userId || -1;
        User.level = data.userLevel || 0;
        User.levelString = data.userLevelString || "Anonymous";

        User.isMember = data.userIsMember == true;
        User.isPrivileged = data.userIsPrivileged == true;
        User.isContributor = data.userIsContributor == true;
        User.isFormerStaff = data.userIsFormerStaff == true;
        User.isJanitor = data.userIsJanitor == true;
        User.isModerator = data.userIsModerator == true;
        User.isAdmin = data.userIsAdmin == true;

        User.isBlocked = data.userIsBlocked == true;
        User.isVerified = data.userIsVerified == true;

        User.canApprovePosts = data.userCanApprovePosts == true;
        User.canUploadFree = data.userCanUploadFree == true;

        User.postsPerPage = data.userPerPage || 75;

        // From meta tags
        User.commentThreshold = parseInt(getValue("user-comment-threshold", -3));
        User.blacklistedTags = getValue("blacklisted-tags", "[]");
        User.blacklistUsers = getValue("blacklist-users", "false") == "true";

        User.enableJSNavigation = getValue("enable-js-navigation", "true") == "true";
        User.enableAutoComplete = getValue("enable-auto-complete", "true") == "true";
        User.styleUsernames = getValue("style-usernames", "false") == "true";

        User.defaultImageSize = ImageScalingMode.get(getValue("default-image-size"));

        // Derived
        User.canSeeDeletedPosts = User.canApprovePosts || User.isJanitor || User.isModerator || User.isAdmin;

        function getValue(name: string, fallback = null): string {
            const el = $(`meta[name="${name}"]`);
            if (el.length == 0) return fallback;
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

export enum ImageScalingMode {
    Sample = "large",
    FitHeight = "fitv",
    FitWidth = "fit",
    Original = "original",
}

export namespace ImageScalingMode {
    export function get(mode: string): ImageScalingMode {
        switch (mode) {
            case "large": return ImageScalingMode.Sample;
            case "fitv": return ImageScalingMode.FitHeight;
            case "fit": return ImageScalingMode.FitWidth;
            case "original": return ImageScalingMode.Original;
        }
        return ImageScalingMode.Sample;
    }
}

interface BodyParams {

    // Theme settings
    thMain: string,
    thExtra: string,
    thNav: string,

    // User info
    userName: string,
    userId: number,
    userLevel: number,
    userLevelString: string,
    userPerPage: number,

    // User levels
    userIsAnonymous: boolean,
    userIsMember: boolean,
    userIsPrivileged: boolean,
    userIsContributor: boolean,
    userIsFormerStaff: boolean,
    userIsJanitor: boolean,
    userIsModerator: boolean,
    userIsAdmin: boolean,

    // Permissions
    userIsBlocked: boolean,
    userIsVerified: boolean,
    userCanApprovePosts: boolean,
    userCanUploadFree: boolean,

    // Pointless
    userIsVoter: boolean,       // Legacy value, same as `userIsMember`
    userIsBanned: boolean,      // Fringe case, should be the same as `userIsBlocked`
    userIsApprover: boolean,    // Alias for `userCanApprovePosts`

    // Location
    action: string,
    controller: string,
}
