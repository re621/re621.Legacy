import { XM } from "../api/XM";
import { Util } from "./Util";

declare const UAParser: any;

export class Sync {

    public static version: string;              // current script version
    public static infoUpdate: number;           // last time changelog info was fetched

    public static async init(): Promise<any> {
        // Load settings
        const settings = await XM.Storage.getValue("re621.sync", {});
        Sync.version = typeof settings["version"] === "undefined" ? "0.0.1" : settings["version"];
        Sync.infoUpdate = typeof settings["infoUpdate"] === "undefined" ? 0 : settings["infoUpdate"];

        // Replacement script version
        const scriptVersion = Util.LS.getItem("re621.version") || window["re621"]["version"];

        // Force the changelog to be updated on script update
        if ((scriptVersion as string).includes("dev")) Sync.version = scriptVersion;
        else if (Util.versionCompare(Sync.version as string, scriptVersion) !== 0)
            Sync.infoUpdate = 0;

        return Sync.saveSettings();
    }

    public static async saveSettings(): Promise<any> {
        return XM.Storage.setValue("re621.sync", {
            version: Sync.version,
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
            // userID: Sync.userID,
            browserName: userAgent.browser.name,
            browserVersion: userAgent.browser.major,
            osName: userAgent.os.name,
            osVersion: userAgent.os.version,
            handlerName: XM.info().scriptHandler,
            handlerVersion: XM.info().version,
            scriptVersion: Util.LS.getItem("re621.version") || window["re621"]["version"],
        };
    }

}

interface EnvironmentData {
    // userID: string;
    browserName: string;
    browserVersion: string;
    osName: string;
    osVersion: string;
    handlerName: string;
    handlerVersion: string;
    scriptVersion: string;
}
