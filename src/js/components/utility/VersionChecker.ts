import { XM } from "../api/XM";
import { GMxmlHttpRequestResponse } from "../api/XMConnect";
import { Debug } from "./Debug";
import { Util } from "./Util";

export class VersionChecker {

    public static scriptBuild = "0.0.1";        // actual, hard-coded version of the script
    public static latestBuild = "0.0.1";        // version of the latest release on github
    public static cachedBuild = "0.0.1";        // cached version of the script

    public static wasUpdated = false;           // the script has been updated - `currentBuild` and `scriptBuild` do not match
    public static hasUpdate = false;            // new version is available - `currentBuild` and `latestBuild` do not match

    public static lastUpdated = 0;               // last time the script pinged github to check for a new version
    public static changesText = "_~ Changelog not available ~_";
    public static changesHTML = "";

    public static async init(): Promise<any> {

        // Load the hard-coded script version
        // For debugging purposes it can be emulated via a localStorage value
        const emVersion = Util.LS.getItem("re621.version");
        VersionChecker.scriptBuild = emVersion ? emVersion : window["re621"]["version"];

        // Load settings
        const settings: VersionSettings = await XM.Storage.getValue("re621.VersionChecker", {});
        if (settings.latestBuild !== undefined) VersionChecker.latestBuild = settings.latestBuild;
        if (settings.cachedBuild !== undefined) VersionChecker.cachedBuild = settings.cachedBuild;

        if (VersionChecker.cachedBuild !== VersionChecker.scriptBuild) VersionChecker.wasUpdated = true;
        if (Util.versionCompare(VersionChecker.cachedBuild, VersionChecker.latestBuild) < 0) VersionChecker.hasUpdate = true;

        if (settings.lastUpdated !== undefined) VersionChecker.lastUpdated = settings.lastUpdated;
        if (settings.changesText !== undefined) VersionChecker.changesText = settings.changesText;

        // If this is a dev build, version checking is skipped
        // Otherwise, either the script version mismatch has been detected, or an hour has passed since last check
        if (VersionChecker.scriptBuild.includes("dev")) {
            VersionChecker.wasUpdated = false;
            VersionChecker.hasUpdate = false;
        } else if (VersionChecker.wasUpdated || VersionChecker.lastUpdated + Util.Time.HOUR < Util.Time.now()) {
            const latestRelease = await VersionChecker.getGithubData("latest");

            VersionChecker.latestBuild = latestRelease.name;
            VersionChecker.cachedBuild = VersionChecker.scriptBuild;

            VersionChecker.hasUpdate = Util.versionCompare(VersionChecker.scriptBuild, VersionChecker.latestBuild) < 0;

            VersionChecker.lastUpdated = Util.Time.now();
            VersionChecker.changesText = latestRelease.body;
        }

        VersionChecker.changesHTML = Util.quickParseMarkdown(VersionChecker.changesText);

        Debug.log("VersionChecker", {
            scriptBuild: VersionChecker.scriptBuild,
            latestBuild: VersionChecker.latestBuild,
            cachedBuild: VersionChecker.cachedBuild,

            wasUpdated: VersionChecker.wasUpdated,
            hasUpdate: VersionChecker.hasUpdate,

            lastUpdated: VersionChecker.lastUpdated,
            changesText: VersionChecker.changesText,
            changesHTML: VersionChecker.changesHTML,
        });

        await XM.Storage.setValue("re621.VersionChecker", {
            latestBuild: VersionChecker.latestBuild,
            cachedBuild: VersionChecker.cachedBuild,
            lastUpdated: VersionChecker.lastUpdated,
            changesText: VersionChecker.changesText,
        });
    }

    /**
     * Fetches the release data from Github's API
     * @param node Version number, or "latest"
     */
    private static async getGithubData(node: string): Promise<any> {
        return XM.Connect.xmlHttpPromise({ url: "https://api.github.com/repos/re621/re621/releases/" + node, method: "GET" }).then(
            (response: GMxmlHttpRequestResponse) => { return Promise.resolve(JSON.parse(response.responseText)); },
            () => {
                console.error("Failed to fetch Github release data");
                return {
                    name: "0.0.0",
                    body: "Error: Unable to fetch the changelog",
                };
            }
        );
    }

}

interface VersionSettings {
    latestBuild: string;
    cachedBuild: string;
    lastUpdated: number;
    changesText: string;
}
