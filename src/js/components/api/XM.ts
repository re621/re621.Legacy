import { XMChrome } from "./XMChrome";
import { XMConnect } from "./XMConnect";
import { XMStorage } from "./XMStorage";
import { XMUtil } from "./XMUtil";

declare const GM: any;
declare const unsafeWindow: Window;

export class XM {

    public static Storage = XMStorage;

    public static Connect = XMConnect;

    public static Util = XMUtil;

    public static Chrome = XMChrome;

    public static Window = typeof unsafeWindow === "undefined" ? window : unsafeWindow;

    /**
     * Returns the information provided by the script manager
     */
    public static info (): GMInfo {
        if (typeof GM === "undefined") {
            return {
                script: null,
                scriptMetaStr: null,
                scriptHandler: window["re621"].type,
                version: "1.0",
            };
        } else return GM.info;
    }

    /** Returns true if the current script instance is a userscript, false for extension */
    public static isUserscript (): boolean {
        return window["re621"].type == "script";
    }

}

interface GMInfo {
    /** Detailed script information */
    script: GMScript;

    /** Metadata block, as a raw string */
    scriptMetaStr: string;

    /** Script manager - Greasemonkey, Tampermonkey, etc */
    scriptHandler: string;

    /** Script manager version */
    version: string;
}

interface GMScript {
    /** Script "unique" id, i.e. 2c4772b3-431f-442b-bdc9-67c5b65fbb9c */
    uuid: string;

    /** Script name, i.e. re621 Injector */
    name: string;

    /** Script version, i.e. 1.0.3 */
    version: string;

    /** Script namespace, i.e. re621.github.io */
    namespace: string;

    /** Script description, i.e. "Injects re621 local files into the page" */
    description: string;

    /** Exclusions block, as an array of strings */
    excludes: string[];

    /** Inclusions block, as an array of strings */
    includes: string[];
}
