function xmlHttpNative(port, details) {
    const request = new XMLHttpRequest();

    /** **onabort** callback to be executed if the request was aborted */
    request.onabort = () => { port.postMessage(createResponse("onabort", request)); }

    /** **onerror** callback to be executed if the request ended up with an error */
    request.onerror = () => { port.postMessage(createResponse("onerror", request)); }

    /** **onloadstart** callback to be executed if the request started to load */
    request.onloadstart = () => { port.postMessage(createResponse("onloadstart", request)); }

    /** **onprogress** callback to be executed if the request made some progress */
    request.onprogress = (event) => {
        port.postMessage(createResponse("onprogress", request, {
            // Sometimes, total is 0. If it is, the length cannot be computed.
            lengthComputable: event.total > 0,
            loaded: event.loaded,
            total: event.total,
        }));
    }

    /** **onreadystatechange** callback to be executed if the request's ready state changed */
    request.onreadystatechange = () => { port.postMessage(createResponse("onreadystatechange", request)); };

    /** **ontimeout** callback to be executed if the request failed due to a timeout */
    request.ontimeout = () => { port.postMessage(createResponse("ontimeout", request)); }

    /** **onload** callback to be executed if the request was loaded. */
    request.onload = () => {
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

    if (details.overrideMimeType) request.overrideMimeType();

    if (details.binary) request.sendAsBinary();
    else request.send();

    function createResponse(event, request, data) {
        let result = {
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

const fn = {
    "XM": {
        "Util": {
            "openInTab": (path, loadInBackground) => {
                return new Promise((resolve) => {
                    chrome.tabs.query({ active: true, windowType: "normal", currentWindow: true }, function(data) {
                        chrome.tabs.create({
                            url: path,
                            active: loadInBackground,
                            index: typeof data[0] === "undefined" ? undefined : data[0].index + 1,
                        }, () => { resolve(true); });
                    })
                });
            },
            "setClipboard": (data) => {
                var copyFrom = document.createElement("textarea");
                copyFrom.textContent = data;
                document.body.appendChild(copyFrom);
                copyFrom.select();
                document.execCommand("copy");
                copyFrom.blur();
                document.body.removeChild(copyFrom);
            }
        },
    },
}

async function handleMessage(request, sender, sendResponse) {

    if (fn[request.component] === undefined ||
        fn[request.component][request.module] === undefined ||
        fn[request.component][request.module][request.method] === undefined) {

        sendResponse({
            eventID: request.eventID,
            data: "RE6 Background - Invalid Request",
        });
        return;
    }

    sendResponse({
        eventID: request.eventID,
        data: await fn[request.component][request.module][request.method](...request.args),
    });

    return;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true;
});

chrome.runtime.onConnect.addListener((port) => {

    if (port.name === "XHR") {
        port.onMessage.addListener((message) => { xmlHttpNative(port, message) });
        return;
    }

    sendResponse({
        eventID: request.eventID,
        data: "RE6 Background - Invalid Request",
    });

});
