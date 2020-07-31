import { CommentTracker } from "../../modules/subscriptions/CommentTracker";
import { ForumTracker } from "../../modules/subscriptions/ForumTracker";
import { PoolTracker } from "../../modules/subscriptions/PoolTracker";
import { TagTracker } from "../../modules/subscriptions/TagTracker";
import { XM } from "../api/XM";
import { ModuleController } from "../ModuleController";
import { Debug } from "./Debug";
import { Util } from "./Util";

declare const UAParser: any;

export class Sync {

    public static enabled: boolean;             // whether synchronization is enabled
    public static userID: string;               // unique user ID
    public static version: string | boolean;    // current script version
    public static timestamp: number;            // last time data was synchronized

    public static infoUpdate: number;           // last time changelog info was fetched

    public static async init(): Promise<any> {
        // Load settings
        const settings = await XM.Storage.getValue("re621.sync", {});

        Sync.enabled = typeof settings["enabled"] === "undefined" ? false : settings["enabled"];
        Sync.userID = typeof settings["userID"] === "undefined" ? "-1" : settings["userID"];
        Sync.version = typeof settings["version"] === "undefined" ? "0.0.1" : settings["version"];
        Sync.timestamp = typeof settings["timestamp"] === "undefined" ? 0 : settings["timestamp"];

        Sync.infoUpdate = typeof settings["infoUpdate"] === "undefined" ? 0 : settings["infoUpdate"];

        // Validate registration
        if (Sync.userID === "-1") {
            await XM.Connect.xmlHttpPromise({
                method: "POST",
                url: "https://re621.bitwolfy.com/sync/login",
                headers: { "User-Agent": window["re621"]["useragent"] },
                onload: async (data) => {
                    Debug.log(data.responseText);
                    const response = JSON.parse(data.responseText);
                    if (response["error"] !== undefined) return;
                    Sync.userID = response["userID"];
                }
            });
        }

        // Log environment data
        if (Sync.version !== false && Util.versionCompare(Sync.version as string, window["re621"]["version"]) !== 0) {

            // Force the changelog to be updated on script update
            Sync.infoUpdate = 0;

            // Refresh the environment data on the backend
            await XM.Connect.xmlHttpPromise({
                method: "POST",
                url: "https://re621.bitwolfy.com/sync/report",
                headers: { "User-Agent": window["re621"]["useragent"] },
                data: JSON.stringify(Sync.getEnvData()),
                onload: (data) => {
                    Debug.log(data.responseText);
                    Sync.version = window["re621"]["version"];
                }
            });
        }

        return Sync.saveSettings();
    }

    public static async saveSettings(): Promise<any> {
        return XM.Storage.setValue("re621.sync", {
            enabled: Sync.enabled,
            userID: Sync.userID,
            version: Sync.version,
            timestamp: Sync.timestamp,
            infoUpdate: Sync.infoUpdate,
        });
    }

    /**
     * Collect and return the script's environment data.  
     * This includes the names and versions of the browser, operating system, and script handler.
     */
    public static getEnvData(): EnvironmentData {
        const userAgent = UAParser(navigator.userAgent);
        return {
            userID: Sync.userID,
            browserName: userAgent.browser.name,
            browserVersion: userAgent.browser.major,
            osName: userAgent.os.name,
            osVersion: userAgent.os.version,
            handlerName: XM.info().scriptHandler,
            handlerVersion: XM.info().version,
            scriptVersion: window["re621"]["version"],
        };
    }

    public static async download(): Promise<any> {
        return new Promise((resolve) => {
            XM.Connect.xmlHttpPromise({
                method: "POST",
                url: "https://re621.bitwolfy.com/sync/data/download",
                headers: { "User-Agent": window["re621"]["useragent"] },
                data: JSON.stringify({
                    "userID": Sync.userID,
                }),
                onload: (data) => {
                    // Debug.log(data.responseText);
                    resolve(JSON.parse(data.responseText)["data"]);
                }
            });
        });
    }

    public static async upload(): Promise<any> {
        return new Promise((resolve) => {
            XM.Connect.xmlHttpPromise({
                method: "POST",
                url: "https://re621.bitwolfy.com/sync/data/upload",
                headers: { "User-Agent": window["re621"]["useragent"] },
                data: JSON.stringify({
                    "userID": Sync.userID,
                    "timestamp": Util.Time.now(),
                    "data": {
                        "CommentTracker": ModuleController.get(CommentTracker).fetchSettings("data"),
                        "ForumTracker": ModuleController.get(ForumTracker).fetchSettings("data"),
                        "PoolTracker": ModuleController.get(PoolTracker).fetchSettings("data"),
                        "TagTracker": ModuleController.get(TagTracker).fetchSettings("data"),
                    },
                }),
                onload: async (data) => {
                    // Debug.log(data.responseText);
                    const response = JSON.parse(data.responseText);
                    if (response.timestamp) {
                        Sync.timestamp = new Date(response.timestamp + "Z").getTime();
                        await Sync.saveSettings();
                    }
                    resolve(response);
                }
            });
        });
    }

}

interface EnvironmentData {
    userID: string;
    browserName: string;
    browserVersion: string;
    osName: string;
    osVersion: string;
    handlerName: string;
    handlerVersion: string;
    scriptVersion: string;
}
