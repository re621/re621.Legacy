import { XM } from "./XM";

declare const GM: any;

export class XMUtil {

    /**
     * Open a new tab with this url.
     * @param url Page URL
     * @param options Tab options
     */
    public static openInTab (path: string, active = true): void {
        if (typeof GM === "undefined") XM.Chrome.execBackgroundRequest("XM", "Util", "openInTab", [path, active]);
        else GM.openInTab(path, { active: active });
    }

    /**
     * Copies data into the clipboard
     * @param data Data to be copied
     * @param info object like "{ type: 'text', mimetype: 'text/plain'}" or a string expressing the type ("text" or "html")
     */
    public static setClipboard (data: any, info?: { type: string; mimetype: string } | string): void {
        if (typeof GM === "undefined") XM.Chrome.execBackgroundRequest("XM", "Util", "setClipboard", [data]);
        else GM.setClipboard(data, info);
    }
}
