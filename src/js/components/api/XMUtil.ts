import { XM } from "./XM";

declare const GM: any;

export class XMUtil {

    /**
     * Open a new tab with this url.
     * @param url Page URL
     * @param options Tab options
     */
    public static openInTab(path: string, loadInBackground?: boolean): void {
        if (typeof GM === "undefined") XM.Chrome.execBackgroundRequest("XM", "Util", "openInTab", [path, loadInBackground]);
        else GM.openInTab(path, loadInBackground);
    }

    /**
     * Copies data into the clipboard
     * @param data Data to be copied
     * @param info object like "{ type: 'text', mimetype: 'text/plain'}" or a string expressing the type ("text" or "html")
     */
    public static setClipboard(data: any, info?: { type: string; mimetype: string } | string): void {
        if (typeof GM === "undefined") return null; // TODO Chrome function
        else return GM.setClipboard(data, info);
    };
}
