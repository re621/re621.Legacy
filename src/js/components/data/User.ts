import { E621 } from "../api/E621";
import { APICurrentUser } from "../api/responses/APIUser";

/**
 * User  
 * Basic framework for fetching user information from the page metadata
 */
export class User {

    private static instance: User;

    private loggedin: boolean;
    private username: string;
    private userid: number;

    private level: string;

    public constructor() {
        const $ref = $("body");

        this.loggedin = $ref.attr("data-user-is-anonymous") == "false";
        this.username = $ref.attr("data-user-name") || "Anonymous";
        this.userid = parseInt($ref.attr("data-user-id")) || 0;
        this.level = $ref.attr("data-user-level-string") || "Guest";
    }

    /**
     * Returns user's login state
     * @returns boolean true if the user is logged in, false otherwise
     */
    public static isLoggedIn(): boolean {
        return this.getInstance().loggedin;
    }

    /**
     * Returns user's name
     * @returns string Username if the user is logged in, "Anonymous" otherwise
     */
    public static getUsername(): string {
        return this.getInstance().username;
    }

    /**
     * Returns user's ID
     * @returns string User ID if the user is logged in, 0 otherwise
     */
    public static getUserID(): number {
        return this.getInstance().userid;
    }

    /**
     * Returns user's group level
     * @returns string Group if the user is logged in, "Guest" otherwise
     */
    public static getLevel(): string {
        return this.getInstance().level;
    }

    /**
     * @returns the users e6 site settings
     */
    public static async getCurrentSettings(): Promise<APICurrentUser> {
        return E621.Users.find(this.getUserID()).first<APICurrentUser>().then((response) => {
            return Promise.resolve(response);
        });
    }

    /**
     * Saves the settings for the user
     * There is no need to put the keys into array form, this happens automatically
     */
    public static async setSettings(data: {}): Promise<void> {
        const json = { "_method": "patch" };
        for (const key of Object.keys(data)) {
            json["user[" + key + "]"] = data[key];
        }
        await E621.Users.find(this.getUserID()).post(json);
    }

    public static getInstance(): User {
        if (this.instance == undefined) this.instance = new this();
        return this.instance;
    }
}
