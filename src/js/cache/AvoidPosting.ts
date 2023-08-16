import LocalStorage from "../models/api/LocalStorage";
import { XM } from "../models/api/XM";
import { ErrorHandler } from "../utility/ErrorHandler";
import { Util } from "../utility/Util";

export default class AvoidPosting {

    private static baseURL = "https://re621.bitwolfy.com/cache/dnp/";
    public static get Version(): number { return LocalStorage.DNP.Version; }
    public static get CreatedAt(): number { return LocalStorage.DNP.CreatedAt; }

    private static CachedList: Set<string>;
    public static get Cache(): Set<string> {
        if (!this.CachedList) this.CachedList = LocalStorage.DNP.Cache;
        return new Set(this.CachedList);
    }
    public static get size(): number {
        return this.Cache.size;
    }
    public static has(value: string): boolean {
        return this.Cache.has(value);
    }

    public static async init(): Promise<void> {

        if (LocalStorage.DNP.Expires > Util.Time.now()) return;
        try {
            // Version data
            const versionData = await XM.Connect.xmlHttpPromise({
                url: this.baseURL + "version/",
                method: "GET",
            });

            let json: any;
            try { json = JSON.parse(versionData.responseText); }
            catch (error) { return passTime(); }

            if (!json.version || json.version < this.Version)
                return passTime();

            // DNP data
            const dnpData = await XM.Connect.xmlHttpPromise({
                url: this.baseURL,
                method: "GET",
            });

            try { json = JSON.parse(dnpData.responseText); }
            catch (error) { return passTime(); }

            if (!json.data || !Array.isArray) return passTime();

            LocalStorage.DNP.Version = json.version || 0;
            LocalStorage.DNP.CreatedAt = json.from || 0;
            LocalStorage.DNP.Cache = new Set(json.data);
            passTime();

        } catch (error) {
            ErrorHandler.log("[AvoidPosting] Failed to load assets", error);
            LocalStorage.DNP.Expires = Util.Time.now() + (5 * Util.Time.MINUTE);
        }

        function passTime(): void {
            LocalStorage.DNP.Expires = Util.Time.now() + Util.Time.DAY;
        }
    }

}