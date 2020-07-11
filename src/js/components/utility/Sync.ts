import { XM } from "../api/XM";
import { Debug } from "./Debug";
import { Util } from "./Util";

declare const UAParser: any;

export class Sync {

    private static userID: string;
    public static version: string | boolean;

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

    public static async validateRegistration(): Promise<any> {
        Sync.userID = await XM.Storage.getValue("re621.userID", undefined);
        if (Sync.userID !== undefined && Sync.userID !== "undefined") return Promise.resolve();

        return new Promise(async (resolve) => {
            XM.Connect.xmlHttpPromise({
                method: "POST",
                url: "https://re621.bitwolfy.com/sync/register",
                headers: { "User-Agent": window["re621"]["useragent"] },
                onload: async (data) => {
                    const response = JSON.parse(data.responseText);
                    Debug.log(data.responseText);
                    if (response["error"] !== undefined) resolve();
                    Sync.userID = response["userID"];
                    await XM.Storage.setValue("re621.userID", Sync.userID);
                    resolve();
                }
            });
        });
    }

    public static async report(): Promise<any> {
        Sync.version = await XM.Storage.getValue("re621.report", "0.0.1");
        if (!Sync.version || Util.versionCompare(Sync.version as string, window["re621"]["version"]) == 0) return;
        XM.Storage.setValue("re621.report", window["re621"]["version"]);

        return XM.Connect.xmlHttpPromise({
            method: "POST",
            url: "https://re621.bitwolfy.com/sync/report",
            headers: { "User-Agent": window["re621"]["useragent"] },
            data: JSON.stringify(Sync.getEnvData()),
            onload: (data) => { Debug.log(data.responseText); }
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
