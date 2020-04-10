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

    /**
     * Adds the given style to the document and returns the injected style element
     * @param css string CSS styles
     */
    public static addStyle(css: string): HTMLStyleElement {
        return GM_addStyle(css);
    };

    /**
     * Saves the specified data to the storage
     * @param name Name of the data entry
     * @param value Data value
     */
    public static setValue(name: string, value: any): void {
        return GM_setValue(name, value);
    };

    /**
     * Returns the value with the specified name  
     * If no such entry exists, returns the default value
     * @param name Name of the data entry
     * @param defaultValue Default value
     */
    public static getValue(name: string, defaultValue: any): any {
        return GM_getValue(name, defaultValue);
    };

    /**
     * Deletes the entry with the specified name from storage
     * @param name Name of the data entry
     */
    public static deleteValue(name: string): void {
        GM_deleteValue(name);
    }

    /**
     * Get the content of a predefined @resource tag at the script header
     * @param name Resource name
     */
    public static getResourceText(name: string): string {
        return GM_getResourceText(name);
    };

    /**
     * Open a new tab with this url.
     * @param url Page URL
     * @param options Tab options
     */
    public static openInTab(url: string, options?: GMOpenInTabOptions): GMOpenInTab;
    public static openInTab(url: string, loadInBackground?: boolean): GMOpenInTab;
    public static openInTab(a: any, b?: any): GMOpenInTab {
        return GM_openInTab(a, b);
    }

    /**
     * Make an xmlHttpRequest  
     * Important: requests can only be made to domains specified by the @connect tags in the script header.  
     * @param details Request details
     * @returns an object with the following property:
     *  - **abort**: function to be called to cancel this request
     */
    public static xmlHttpRequest(details: GMxmlHttpRequestDetails): void {
        return GM_xmlhttpRequest(details);
    };

    /**
     * Downloads a given URL to the local disk.  
     * @param details Download details
     */
    public static download(url: string, name: string): Function;
    public static download(defaults: GMDownloadDetails): Function;
    public static download(a: any, b?: any): Function {
        return GM_download(a, b);
    };

    /**
     * Copies data into the clipboard
     * @param data Data to be copied
     * @param info object like "{ type: 'text', mimetype: 'text/plain'}" or a string expressing the type ("text" or "html")
     */
    public static setClipboard(data: any, info?: GMSetClipboardInfo): void {
        return GM_setClipboard(data, info);
    };
}

interface GMDownloadDetails {
    /** **url** - the URL from where the data should be downloaded (required) */
    url: string;

    /** **name** - the filename - for security reasons the file extension needs to be whitelisted at Tampermonkey's options page (required) */
    name: string;

    /** **headers** - see GM_xmlhttpRequest for more details */
    headers?: string;

    /** **saveAs** - boolean value, show a saveAs dialog */
    saveAs?: boolean;

    /** **onerror** callback to be executed if this download ended up with an error */
    onerror?(error: GMDownloadError): void;

    /** **onload** callback to be executed if this download finished */
    onload?(): void;

    /** **onprogress** callback to be executed if this download made some progress */
    onprogress?(): void;

    /** **ontimeout** callback to be executed if this download failed due to a timeout */
    ontimeout?(): void;
}

interface GMDownloadError {
    /** **error** - error reason */
    error: GMDownladErrorTypes;

    /** **details** - detail about that error */
    details: string;
}

interface GMDownladErrorTypes {
    /** **not_enabled** - the download feature isn't enabled by the user */
    not_enabled: boolean;

    /** **not_whitelisted** - the requested file extension is not whitelisted */
    not_whitelisted: boolean;

    /** **not_permitted** - the user enabled the download feature, but did not give the downloads permission */
    not_permitted: boolean;

    /** **not_supported** - the download feature isn't supported by the browser/version */
    not_supported: boolean;

    /** **not_succeeded** - the download wasn't started or failed, the details attribute may provide more information */
    not_succeeded: boolean;
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

interface GMSetClipboardInfo {
    info: {
        type: string;
        mimetype: string;
    } | string;
}
