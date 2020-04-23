import { Util } from "../structure/Util";

declare const chrome;

export class XMChrome {

    private static requests: string[] = [];

    /**
     * Executes the specified function in the background script
     * @param component Component to run the script on, ex. Danbooru
     * @param module Component module, ex. Blacklist
     * @param method Function to execute, ex. apply
     * @param args Optional arguments to pass to the function
     * @returns Promise that is fulfilled when a response is received
     */
    public static async execBackgroundRequest(component: string, module: string, method: string, args?: any[]): Promise<any> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                XMChrome.formatRequestData(component, module, method, args),
                (response: MessageResponse) => {
                    XMChrome.requests = XMChrome.requests.filter(e => e !== response.eventID);
                    resolve(response.data);
                }
            );
        });
    }

    /**
     * Executes the specified function in the injector script
     * @param component Component to run the script on, ex. Danbooru
     * @param module Component module, ex. Blacklist
     * @param method Function to execute, ex. apply
     * @param args Optional arguments to pass to the function
     * @returns Promise that is fulfilled when a response is received
     */
    public static async execInjectorRequest(component: string, module: string, method: string, args?: any[]): Promise<any> {
        return new Promise((resolve) => {
            const request = XMChrome.formatRequestData(component, module, method, args);
            const callback = function (event: any): void {
                const response: MessageResponse = event.detail;
                document.removeEventListener("re621.chrome.message.response-" + response.eventID, callback);
                XMChrome.requests = XMChrome.requests.filter(e => e !== response.eventID);
                resolve(response.data);
            };
            document.addEventListener("re621.chrome.message.response-" + request.eventID, callback);
            document.dispatchEvent(new CustomEvent("re621.chrome.message", { detail: request }));
        });
    }

    /**
     * Formats the provided arguments into a valid request
     * @param component Component to run the script on, ex. Danbooru
     * @param module Component module, ex. Blacklist
     * @param method Function to execute, ex. apply
     * @param args Optional arguments to pass to the function
     */
    private static formatRequestData(component: string, module: string, method: string, args?: any[]): MessageRequest {
        return {
            component: component,
            module: module,
            method: method,
            eventID: this.makeRequestID(),
            args: (args === undefined) ? [] : args,
        };
    }

    /**
     * Returns a unique ID for the request
     */
    private static makeRequestID(): string {
        let id: string;
        do { id = Util.makeID(); }
        while (this.requests.includes(id));
        this.requests.push(id);
        return id;
    }

    /**
     * Returns the URL for the specified resource.  
     * Note that the resource must be specified in the manifest.
     * @param name Resource name
     */
    public static getResourceURL(name: string): string {
        return chrome.extension.getURL(name);
    }

}

interface MessageRequest {
    component: string;
    module: string;
    method: string;
    eventID: string;
    args?: any[];
}

interface MessageResponse {
    eventID: string;
    data: any;
}
