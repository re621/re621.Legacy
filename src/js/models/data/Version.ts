import { ErrorHandler } from "../../utility/ErrorHandler";
import { Util } from "../../utility/Util";
import LocalStorage from "../api/LocalStorage";
import { XM } from "../api/XM";


export default class Version {

    private static updateURL = "https://re621.bitwolfy.com/cache/version";
    private static semverRegex = /\d+\.\d+\.\d+/;

    public static Local = GM_info.script.version;
    public static get Remote() { return LocalStorage.Version.Remote; }
    private static hasUpdateCached: boolean;
    public static get HasUpdate(): boolean {
        if (typeof this.hasUpdateCached == "undefined")
            this.hasUpdateCached = this.isRemoteAhead(this.Local, this.Remote);
        return this.hasUpdateCached;
    }

    public static async init() {
        if (LocalStorage.Version.Expires > Util.Time.now()) return;
        try {
            const data = await XM.Connect.xmlHttpPromise({
                url: this.updateURL,
                method: "GET",
            });

            const version = data.responseText;

            if (!version) return passTime();
            LocalStorage.Version.Remote = version;
            LocalStorage.Version.Expires = Util.Time.now() + Util.Time.HOUR;
        } catch (error) {
            ErrorHandler.log("[RE621] Unable to check for updates", error);
            passTime();
        }

        function passTime() {
            LocalStorage.Version.Expires = Util.Time.now() + Util.Time.DAY;
        }
    }

    private static isRemoteAhead(local: string, remote: string): boolean {
        if (!this.semverRegex.test(local) || !this.semverRegex.test(remote)) return false;

        const localParts = splitSemver(local),
            remoteParts = splitSemver(remote);

        for (let i = 0; i < localParts.length; i++) {
            if (remoteParts[i] > localParts[i]) return true;
            else if (remoteParts[i] < localParts[i]) return false;
        }
        return false;

        function splitSemver(input: string): number[] {
            const parts = input.split("."),
                result: number[] = [];
            for (const one of parts) {
                result.push(parseInt(one))
            }
            return result;
        }
    }

}
