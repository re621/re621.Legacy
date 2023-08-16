import { ErrorHandler } from "../../utility/ErrorHandler";

declare const GM: any;

export class XMUtil {

    /**
     * Open a new tab with this url.
     * @param url Page URL
     * @param options Tab options
     */
    public static openInTab(path: string, active = true): void {
        if(typeof GM_openInTab === "function") GM_openInTab(path, { active: active });
        else if (typeof GM !== "undefined" && typeof GM.openInTab === "function") GM.openInTab(path, { active: active, });
        else ErrorHandler.write("No openInTab method found");
    }

    /**
     * Copies data into the clipboard
     * @param data Data to be copied
     * @param info object like "{ type: 'text', mimetype: 'text/plain'}" or a string expressing the type ("text" or "html")
     */
    public static setClipboard(data: any, info?: { type: string; mimetype: string } | string): void {
        if(typeof GM_setClipboard === "function") GM_setClipboard(data, info);
        else if (typeof GM !== "undefined" && typeof GM.openInTab === "function") GM.setClipboard(data, info);
        else ErrorHandler.write("No setClipboard method found");
    };
}
