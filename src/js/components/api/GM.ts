/* Type definitions for the Tampermonkey methods */

declare const GM_getResourceText;
declare const GM_addStyle;
declare const GM_download;
declare const GM_setValue;
declare const GM_getValue;
declare const GM_deleteValue;
declare const GM_xmlhttpRequest;
declare const GM_openInTab;
declare const GM_setClipboard;

export class GM {

    public static getResourceText(name: string): string {
        return GM_getResourceText(name);
    };
    public static addStyle(css: string): HTMLStyleElement {
        return GM_addStyle(css);
    };
    public static download(url: string, name: string): Function;
    public static download(defaults: GMDownloadDetails): Function;
    public static download(a: any, b?: any): Function {
        return GM_download(a, b);
    };
    public static setValue(name: string, value: any): void {
        return GM_setValue(name, value);
    };
    public static getValue(name: string, defaultValue: any): any {
        return GM_getValue(name, defaultValue);
    };
    public static deleteValue(name: string): void {
        GM_deleteValue(name);
    }
    public static xmlhttpRequest(details: GMxmlhttpRequestDetails): void {
        return GM_xmlhttpRequest(details);
    };
    public static openInTab(url: string, options?: GMOpenInTabOptions): GMOpenInTab;
    public static openInTab(url: string, loadInBackground?: boolean): GMOpenInTab;
    public static openInTab(a: any, b?: any): GMOpenInTab {
        return GM_openInTab(a, b);
    }
    public static setClipboard(data: any, info?: GMSetClipboardInfo): void {
        return GM_setClipboard(data, info);
    };
}

interface GMDownloadDetails {
    url: string;
    name: string;
    headers?: string;
    saveAs?: boolean;
    onerror?(error: GMDownloadError): void;
    onload?(): void;
    onprogress?(): void;
    ontimeout?(): void;
}

interface GMDownloadError {
    error: GMDownladErrorTypes;
    details: string;
}

interface GMDownladErrorTypes {
    not_enabled: boolean;
    not_whitelisted: boolean;
    not_permitted: boolean;
    not_supported: boolean;
    not_succeeded: boolean;
}

interface GMxmlhttpRequestDetails {
    method: "GET" | "HEAD" | "POST";
    url: string;
    headers?: string;
    data?: string;
    cookie?: string;
    binary?: boolean;
    timeout?: number;
    context?: any;
    responseType?: "arraybuffer" | "blob" | "json";
    overrideMimeType?: string;
    anonymous?: boolean;
    fetch?: boolean;
    username?: string;
    password?: string;
    onabort?(): void;
    onerror?(): void;
    onloadstart?(): void;
    onprogress?(): void;
    onreadystatechange?(): void;
    ontimeout?(): void;
    onload?(details: GMxmlhttpRequestLoadDetails): void;
}

interface GMxmlhttpRequestLoadDetails {
    finalURL: string;
    readyState: number;
    status: number;
    statusText: string;
    responseHeaders: string;
    response: object;
    responseXML: XMLDocument;
    responseText: string;
}

interface GMOpenInTabOptions {
    active?: boolean;
    insert?: boolean;
    setParent?: boolean;
    incognito?: boolean;
}

interface GMOpenInTab {
    close(): void;
    onclosed(): void;
    closed: boolean;
}

interface GMSetClipboardInfo {
    info: { type: string; mimetype: string } | string;
}
