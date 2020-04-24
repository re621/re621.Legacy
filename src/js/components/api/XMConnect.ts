import { XM } from "./XM";

declare const GM: any;
declare const GM_getResourceText: Function;
declare const GM_getResourceURL: Function;
declare const GM_xmlhttpRequest: Function;

declare const saveAs;

export class XMConnect {

    /**
     * Make a cross-domain xmlHttpRequest.  
     * For userscripts, the domain name MUST be defined in @resource tag.  
     * For extensions, the domain name MUST be listed in the permissions.
     * @param details Request details
     */
    public static xmlHttpRequest(details: XMConnectRequestFull): void {
        const validDetails = XMConnect.validateXHRDetails(details);
        if (typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function") GM.xmlHttpRequest(validDetails);
        else if (typeof GM_xmlhttpRequest === "function") GM_xmlhttpRequest(validDetails);
        else XM.Chrome.execBackgroundRequest("XM", "Connect", "xmlHttpRequest", [validDetails])
            .then((response: GMxmlHttpRequestChromeEvent) => { details[response.event](response); });
    };

    /**
     * Cross-domain xmlHttpRequest, wrapped in a Promise.  
     * For userscripts, the domain name MUST be defined in @resource tag.  
     * For extensions, the domain name MUST be listed in the permissions.
     * @param details Request details
     */
    public static xmlHttpPromise(details: XMConnectRequest): Promise<any> {
        const validDetails = XMConnect.validateXHRDetails(details);
        return new Promise((resolve, reject) => {
            validDetails.onabort = (event): void => { reject(event); }
            validDetails.onerror = (event): void => { reject(event); }
            validDetails.ontimeout = (event): void => { reject(event); }
            validDetails.onload = (event): void => { resolve(event); }
            XMConnect.xmlHttpRequest(validDetails);
        });
    }

    /**
     * Validates the xmlHttpRequest details, returning a valid set
     * @param details Request details
     */
    private static validateXHRDetails(details: XMConnectRequestFull): XMConnectRequestFull {
        if (details.headers === undefined) details.headers = {};
        if (details.headers["User-Agent"] === undefined) {
            details.headers["User-Agent"] = window["re621"]["useragent"];
            details.headers["X-User-Agent"] = window["re621"]["useragent"];
        }

        if (details.onabort === undefined) details.onabort = (): void => { return; };
        if (details.onerror === undefined) details.onerror = (): void => { return; };
        if (details.onload === undefined) details.onload = (): void => { return; };
        if (details.onloadstart === undefined) details.onloadstart = (): void => { return; };
        if (details.onprogress === undefined) details.onprogress = (): void => { return; };
        if (details.onreadystatechange === undefined) details.onreadystatechange = (): void => { return; };
        if (details.ontimeout === undefined) details.ontimeout = (): void => { return; };

        return details;
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
        if (typeof GM !== "undefined") return XMConnect.getResourceTextGM(name);

        // Extensions
        return XMConnect.xmlHttpPromise({
            url: window["resources"][name].startsWith("http") ? window["resources"][name] : XM.Chrome.getResourceURL(window["resources"][name]),
            method: "GET",
        }).then(
            (data: GMxmlHttpRequestResponse) => { return Promise.resolve(data.responseText); },
            (error: GMxmlHttpRequestEvent) => { return Promise.reject(error.status + " " + error.statusText); }
        );
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
                        "X-User-Agent": window["re621"]["useragent"],
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
        return XMConnect.getResourceText(name).then(
            (resolved) => { return Promise.resolve(JSON.parse(resolved) as T); },
            (rejected) => { return Promise.reject(rejected); }
        )
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

        if (a.headers === undefined) a.headers = {
            "User-Agent": window["re621"]["useragent"],
            "X-User-Agent": window["re621"]["useragent"],
        };

        if (a.onerror === undefined) a.onerror = (): void => { return; }
        if (a.onload === undefined) a.onload = (): void => { return; }
        if (a.onprogress === undefined) a.onprogress = (): void => { return; }
        if (a.ontimeout === undefined) a.ontimeout = (): void => { return; }

        let timer: number;
        XMConnect.xmlHttpRequest({
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

export interface XMConnectRequest {
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
}

export interface XMConnectRequestFull extends XMConnectRequest {

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

export interface GMDownloadDetails {
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
