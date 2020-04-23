/* Type definitions for the Tampermonkey methods */

declare const saveAs;

import { Util } from "../structure/Util";

declare const GM: any;
declare const GM_getResourceText: Function;
declare const GM_getResourceURL: Function;
declare const GM_xmlhttpRequest: Function;

declare const unsafeWindow: Window;

declare const chrome: any;

export enum ScriptManager {
    GM = "Greasemonkey",
    TM = "Tampermonkey",
}

export class XM {

    /**
     * Returns the information provided by the script manager
     */
    public static info(): GMInfo {
        if (typeof GM === "undefined") {
            return {
                script: null,
                scriptMetaStr: null,
                scriptHandler: "chrome/ext",
                version: "1.0",
            }
        } else return GM.info;
    }

    /**
     * Returns the unsafeWindow instance.  
     * Should be avoided as much as possible.
     */
    public static getWindow(): Window {
        if (typeof unsafeWindow === "undefined") return window;
        else return unsafeWindow;
    }

    /**
     * Adds the given style to the document and returns the injected style element
     * @param css string CSS styles
     */
    public static addStyle(css: string): JQuery<HTMLElement> {
        return $("<style>")
            .attr({
                "id": getID(),
                "type": "text/css"
            })
            .html(css)
            .appendTo("head");

        function getID(): string {
            let id: string;
            do { id = Util.makeID(); }
            while ($("style#" + id).length > 0);
            return id;
        }
    };

    /**
     * Saves the specified data to the storage
     * @param name Name of the data entry
     * @param value Data value
     */
    public static async setValue(name: string, value: any): Promise<void> {
        return new Promise(async (resolve) => {
            if (typeof GM === "undefined") {
                await new Promise((resolve) => {
                    chrome.storage.sync.set({ name: value }, () => {
                        resolve();
                    });
                });
            } else await GM.setValue(name, value);
            resolve();
        });
    };

    /**
     * Returns the value with the specified name  
     * If no such entry exists, returns the default value
     * @param name Name of the data entry
     * @param defaultValue Default value
     */
    public static async getValue(name: string, defaultValue: any): Promise<any> {
        return new Promise(async (resolve) => {
            if (typeof GM === "undefined") {
                chrome.storage.sync.get([name], (result: any) => {
                    if (result["name"] === undefined) resolve(defaultValue);
                    else resolve(result["name"]);
                });
            } else resolve(GM.getValue(name, defaultValue));
        });
    };

    /**
     * Deletes the entry with the specified name from storage
     * @param name Name of the data entry
     */
    public static async deleteValue(name: string): Promise<void> {
        return new Promise(async (resolve) => {
            if (typeof GM === "undefined") {
                await new Promise((resolve) => {
                    chrome.storage.sync.set({ name: undefined }, () => {
                        resolve();
                    });
                });
            } else await GM.deleteValue(name);
            resolve();
        });
    }

    /**
     * Open a new tab with this url.
     * @param url Page URL
     * @param options Tab options
     */
    public static openInTab(url: string, options?: GMOpenInTabOptions): GMOpenInTab;
    public static openInTab(url: string, loadInBackground?: boolean): GMOpenInTab;
    public static openInTab(a: any, b?: any): GMOpenInTab {
        if (typeof GM === "undefined") return null; // TODO Chrome function
        else return GM.openInTab(a, b);
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

    /**
     * Get contents of the resource as plain text.  
     * Note that the name must be defined in a @resource tag in the script header.
     * @param name Resource name
     */
    public static async getResourceText(name: string): Promise<string> {
        // Tampermonkey
        if (typeof GM_getResourceText === "function") return Promise.resolve(GM_getResourceText(name));

        // Greasemonkey / Violentmonkey
        if (typeof GM !== "undefined") return XM.getResourceTextGM(name);

        // Extensions
        return new Promise((resolve) => {
            XM.xmlHttpRequest({
                "url": window["resources"][name],
                method: "GET",
                onload: (event) => { resolve(event.responseText); }
            })
        });
    }

    /**
     * Gets the contents of the resource as plain text.  
     * This function presumes Greasemonkey is used.  
     * Note that the name must be defined in a @resource tag in the script header.
     * @param name Resource name
     */
    private static async getResourceTextGM(name: string): Promise<string> {
        const resource = (typeof GM.getResourceUrl === "function") ? await GM.getResourceUrl(name) : GM_getResourceURL(name);

        if (resource.startsWith("data:")) {
            return Promise.resolve(atob(resource.replace(/^data:(.*);base64,/g, "")));
        } else if (resource.startsWith("blob:")) {
            return new Promise(async (resolve, reject) => {
                const request = await fetch(resource, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": window["re621"]["useragent"],
                    },
                    method: "GET",
                    mode: "cors"
                });

                if (request.ok) { resolve(await request.text()); }
                else { reject(); }
            });
        } else { return Promise.reject(); }
    }

    /**
     * Get contents of the resource as JSON
     * Note that the name must be defined in a @resource tag in the script header.
     * @param name Resource name
     */
    public static async getResourceJSON<T>(name: string): Promise<T> {
        return XM.getResourceText(name).then(
            (resolved) => { return Promise.resolve(JSON.parse(resolved) as T); },
            (rejected) => { return Promise.reject(rejected); }
        )
    }

    /**
     * Make an xmlHttpRequest  
     * Important: requests can only be made to domains specified by the @connect tags in the script header.  
     * @param details Request details
     */
    public static xmlHttpRequest(details: GMxmlHttpRequestDetails): void {
        if (details.headers === undefined) details.headers = {};
        if (details.headers["User-Agent"] === undefined)
            details.headers["User-Agent"] = window["re621"]["useragent"];

        if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") GM.xmlHttpRequest(details);
        else if (typeof GM_xmlhttpRequest === "function") GM_xmlhttpRequest(details);
        else XM.xmlHttpChrome(details);
    };

    /**
     * Makes an xmlHttpRequest via chrome's background page. 
     * @param details Request details
     */
    public static xmlHttpChrome(details: GMxmlHttpRequestDetails): void {
        chrome.runtime.sendMessage(
            { fn: "xmlHttpRequest", args: details },
            (response: GMxmlHttpRequestChromeEvent) => { details[response.event](response); }
        );
    }

    /**
     * Downloads a given URL to the local disk.  
     * @param details Download details
     */
    public static download(url: string, name: string): void;
    public static download(defaults: GMDownloadDetails): void;
    public static download(a: any, b?: any): void {
        if (typeof a === "string") {
            a = {
                url: a,
                name: b,
            };
        }

        if (a.headers === undefined) a.headers = { "User-Agent": window["re621"]["useragent"] };

        if (a.onerror === undefined) a.onerror = (): void => { return; }
        if (a.onload === undefined) a.onload = (): void => { return; }
        if (a.onprogress === undefined) a.onprogress = (): void => { return; }
        if (a.ontimeout === undefined) a.ontimeout = (): void => { return; }

        let timer: number;
        XM.xmlHttpRequest({
            url: a.url,
            method: "GET",
            headers: a.headers,
            responseType: "blob",
            onerror: (event) => { a.onerror(event); },
            ontimeout: (event) => { a.ontimeout(event); },
            onprogress: (event) => {
                if (timer) clearTimeout(timer);
                timer = window.setTimeout(() => { a.onprogress(event) }, 500);
            },
            onload: (event) => {
                a.onload(event);
                saveAs(event.response as Blob, a.name);
            }
        });
    };
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

interface GMDownloadDetails {
    /** **url** - the URL from where the data should be downloaded (required) */
    url: string;

    /** **name** - the filename - for security reasons the file extension needs to be whitelisted at Tampermonkey's options page (required) */
    name: string;

    /** **headers** - see GM_xmlhttpRequest for more details */
    headers?: string;

    /** **onerror** callback to be executed if this download ended up with an error */
    onerror?(event: GMxmlHttpRequestEvent): void;

    /** **onprogress** callback to be executed if this download made some progress */
    onprogress?(event: GMxmlHttpRequestProgressEvent): void;

    /** **ontimeout** callback to be executed if this download failed due to a timeout */
    ontimeout?(event: GMxmlHttpRequestEvent): void;

    /** **onload** callback to be executed if this download finished */
    onload?(event: GMxmlHttpRequestResponse): void;
}

interface GMxmlHttpRequestDetails {
    /** **method** Request method - either GET, HEAD, or POST */
    method: "GET" | "HEAD" | "POST";

    /** **url** the destination URL */
    url: string;

    /** **headers** ie. user-agent, referer, ... */
    headers?: {} | string;

    /** **data** some string to send via a POST request */
    data?: string;

    /** **cookie** a cookie to be patched into the sent cookie set */
    cookie?: string;

    /** **binary** send the data string in binary mode */
    binary?: boolean;

    /** **timeout** a timeout in ms */
    timeout?: number;

    /** **context** a property which will be added to the response object */
    context?: any;

    /** **responseType** one of arraybuffer, blob, json */
    responseType?: "arraybuffer" | "blob" | "json";

    /** **overrideMimeType** a MIME type for the request */
    overrideMimeType?: string;

    /** **anonymous** don't send cookies with the requests */
    anonymous?: boolean;

    /** **fetch** (beta) use a fetch instead of a xhr request */
    fetch?: boolean;

    /** **username** a username for authentication */
    username?: string;

    /** **password** a password */
    password?: string;

    /** **onabort** callback to be executed if the request was aborted */
    onabort?(event: GMxmlHttpRequestEvent): void;

    /** **onerror** callback to be executed if the request ended up with an error */
    onerror?(event: GMxmlHttpRequestEvent): void;

    /** **onloadstart** callback to be executed if the request started to load */
    onloadstart?(event: GMxmlHttpRequestEvent): void;

    /** **onprogress** callback to be executed if the request made some progress */
    onprogress?(event: GMxmlHttpRequestProgressEvent): void;

    /** **onreadystatechange** callback to be executed if the request's ready state changed */
    onreadystatechange?(event: GMxmlHttpRequestEvent): void;

    /** **ontimeout** callback to be executed if the request failed due to a timeout */
    ontimeout?(event: GMxmlHttpRequestEvent): void;

    /**
     * **onload** callback to be executed if the request was loaded.  
     *   It gets one argument with the following attributes:
     *   - **finalUrl** - the final URL after all redirects from where the data was loaded
     *   - **readyState** - the ready state
     *   - **status** - the request status
     *   - **statusText** - the request status text
     *   - **responseHeaders** - the request response headers
     *   - **response** - the response data as object if details.responseType was set
     *   - **responseXML** - the response data as XML document
     *   - **responseText** - the response data as plain string
     */
    onload?(event: GMxmlHttpRequestResponse): void;
}

export interface GMxmlHttpRequestEvent {
    /** **finalUrl** - the final URL after all redirects from where the data was loaded */
    finalURL: string;

    /**
     * **readyState** - returns the state an XMLHttpRequest client is in:  
     * 0	UNSENT              client has been created, open() not called yet  
     * 1	OPENED	            open() has been called  
     * 2	HEADERS_RECEIVED	send() has been called, headers and status available  
     * 3	LOADING             downloading; responseText holds partial data  
     * 4	DONE	            the operation is complete  
     */
    readyState: 0 | 1 | 2 | 3 | 4;

    /**
     * **status** - returns the numberical HTTP status code of the response.  
     * Before the request completes, the value of **status** is always 0.  
     * Browsers also report a status of 0 in case of XMLHttpRequest errors.
     */
    status: number;

    /**
     * **statusText** - returns a DOMString containing the response's status message.  
     * Unlike **status**, this property contains the _text_ of the reponse status, such as "OK" or "Not Found".
     */
    statusText: string;
}

export interface GMxmlHttpRequestChromeEvent extends GMxmlHttpRequestEvent {
    /** **event** which event caused the provided feedback */
    event: string;
}

export interface GMxmlHttpRequestProgressEvent extends GMxmlHttpRequestEvent {
    /** **lengthComputable** - absolutely no idea when it would be false */
    lengthComputable: boolean;

    /** **loaded** - size of data loaded, in bytes */
    loaded: number;

    /** **total** - total size of the download, in bytes */
    total: number;
}

export interface GMxmlHttpRequestResponse extends GMxmlHttpRequestEvent {
    /** **responseHeaders** - the request response headers */
    responseHeaders: string;

    /**
     * **response** -  returns the response's body content as an ArrayBuffer, Blob, Document, JavaScript Object, or DOMString,
     * depending on the value of the request's responseType property.
     */
    response: object;

    /**
     * **responseXML** - returns a Document containing the HTML or XML retrieved by the request;
     * or null if the request was unsuccessful, has not yet been sent, or if the data can't be parsed as XML or HTML.  
     * **Note:** The name responseXML is an artifact of this property's history; it works for both HTML and XML.
     */
    responseXML: Document;

    /**
     * **responseText** - Returns a DOMString that contains the response to the request as text,
     * or null if the request was unsuccessful or has not yet been sent.
     */
    responseText: string;
}

interface GMOpenInTabOptions {
    /** **active** decides whether the new tab should be focused */
    active?: boolean;

    /** **insert** that inserts the new tab after the current one */
    insert?: boolean;

    /** **setParent** makes the browser re-focus the current tab on close */
    setParent?: boolean;

    /** **incognito** makes the tab being opened inside a incognito mode/private mode window.*/
    incognito?: boolean;
}

interface GMOpenInTab {
    /** Closes the open tab */
    close(): void;

    /** Listener that executes when the tab is closed */
    onclosed(): void;

    /** Tab's current state */
    closed: boolean;
}
