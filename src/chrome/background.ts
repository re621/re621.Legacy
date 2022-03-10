/**
 * ===== Single-response functions =====
 * Executed upon being called, send a response, then terminate.  
 * Must be called from XM.Chrome.execBackgroundRequest()
 */

declare const chrome;

/** Function index */
const sRespFn = {
    "XM": {
        "Util": {
            "openInTab": (path, active): Promise<boolean> => {
                return new Promise((resolve) => {
                    chrome.tabs.query({ active: true, windowType: "normal", currentWindow: true }, function (data) {
                        chrome.tabs.create({
                            url: path,
                            active: active,
                            index: typeof data[0] === "undefined" ? undefined : data[0].index + 1,
                        }, () => { resolve(true); });
                    })
                });
            },
            "setClipboard": (data): void => {
                navigator.clipboard.writeText(data);
            }
        },
    },
}

async function handleBackgroundMessage(request, sender, sendResponse): Promise<void> {

    if (sRespFn[request.component] === undefined ||
        sRespFn[request.component][request.module] === undefined ||
        sRespFn[request.component][request.module][request.method] === undefined) {

        sendResponse({
            eventID: request.eventID,
            data: "RE6 Background - Invalid Request",
        });
        return;
    }

    sendResponse({
        eventID: request.eventID,
        data: await sRespFn[request.component][request.module][request.method](...request.args),
    });

    return;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // This has to be in a separate function because otherwise the port closes prematurely
    handleBackgroundMessage(request, sender, sendResponse);
    return true;
});

/**
 * ===== Multi-response functions =====
 * Establish a connection upon being called, then send multiple responses before terminating.
 * Must be called from XM.Chrome.execBackgroundConnection()
 */

/**
 * Process an xmlHttpRequest
 * @param {string} port 
 * @param {object} details 
 */
function xmlHttpNative(port, details: any): void {
    const request = new XMLHttpRequest();

    /** **onabort** callback to be executed if the request was aborted */
    request.onabort = (): void => { port.postMessage(createResponse("onabort", request)); }

    /** **onerror** callback to be executed if the request ended up with an error */
    request.onerror = (): void => { port.postMessage(createResponse("onerror", request)); }

    /** **onloadstart** callback to be executed if the request started to load */
    request.onloadstart = (): void => { port.postMessage(createResponse("onloadstart", request)); }

    /** **onprogress** callback to be executed if the request made some progress */
    request.onprogress = (event): void => {
        port.postMessage(createResponse("onprogress", request, {
            // Sometimes, total is 0. If it is, the length cannot be computed.
            lengthComputable: event.total > 0,
            loaded: event.loaded,
            total: event.total,
        }));
    }

    /** **onreadystatechange** callback to be executed if the request's ready state changed */
    request.onreadystatechange = (): void => { port.postMessage(createResponse("onreadystatechange", request)); };

    /** **ontimeout** callback to be executed if the request failed due to a timeout */
    request.ontimeout = (): void => { port.postMessage(createResponse("ontimeout", request)); }

    /** **onload** callback to be executed if the request was loaded. */
    request.onload = (): void => {
        if (request.readyState !== 4) return;
        if (request.status >= 200 && request.status < 300) {
            port.postMessage(createResponse("onload", request, {
                responseHeaders: request.getAllResponseHeaders(),
                response: (request.responseType === "blob") ? URL.createObjectURL(request.response) : request.response,
                responseXML: (request.responseType === "" || request.responseType === "document") ? request.responseXML : null,
                responseText: (request.responseType === "" || request.responseType === "document") ? request.responseText : null,
            }));
        } else {
            port.postMessage(createResponse("onerror", request));
        }
    }

    request.open(details.method, details.url, true, details.username, details.password);
    delete details.headers["User-Agent"];
    Object.keys(details.headers).forEach((header) => {
        request.setRequestHeader(header, details.headers[header]);
    });

    if (details.responseType) // ArrayBuffer gets fetched as a blob, for the sake of converting to ObjectURL
        request.responseType = (details.responseType === "arraybuffer") ? "blob" : details.responseType;

    if (details.overrideMimeType) request.overrideMimeType(details.overrideMimeType);

    request.send(details.data);

    function createResponse(event, request, data?: any): any {
        const result = {
            event: event,
            finalURL: request.finalURL,
            state: request.readyState,
            status: request.status,
            statusText: request.statusText,
        };

        if (data !== undefined)
            Object.keys(data).forEach((key) => { result[key] = data[key]; });

        return result;
    }
}

chrome.runtime.onConnect.addListener((port) => {

    if (port.name === "XHR") {
        port.onMessage.addListener((message) => { xmlHttpNative(port, message) });
        return;
    }

    port.postMessage({
        eventID: 0,
        data: "RE6 Background - Invalid Request",
    });

});
