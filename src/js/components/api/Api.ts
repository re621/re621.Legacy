import { RequestQueue } from "./RequestQueue";

/**
 * Conventient class to make e6 api requests
 */
export class Api {

    private static instance: Api;

    //needed to authenticate some post requests, for example when you modify user settings
    private authenticityToken: string;

    private queue: RequestQueue;

    private constructor() {
        this.authenticityToken = $("head meta[name=csrf-token]").attr("content");
        this.queue = new RequestQueue(2000);
    }

    /**
     * 
     * @param url e6 endpoint without the host, => /posts/123456.json
     * @param method either post or get
     * @param data Optional, only used when method is post
     */
    protected static async requestFunction(url: string, method: string, data = {}): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const requestInfo: RequestInit = {
                credentials: "include",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Header": "re621/1.0 userscript re621.github.io"
                },
                method: method,
                mode: "cors"
            };
            if (method !== "GET" && method !== "get") {
                const postData = [];
                data["authenticity_token"] = Api.getInstance().authenticityToken;
                for (const key of Object.keys(data)) {
                    postData.push(encodeURIComponent(key) + "=" + encodeURIComponent(data[key]));
                }
                requestInfo.body = postData.join("&");
            }
            const request = await fetch(location.protocol + "//" + location.host + url, requestInfo);
            if (request.status >= 200 && request.status < 400) {
                resolve(await request.text());
            } else {
                reject();
            }
        });
    }

    private static async request(url: string, method: string, ignoreQueue: boolean, data?: {}): Promise<string> {
        if (ignoreQueue === true) {
            return this.requestFunction(url, method, data);
        }
        const queue = this.getInstance().queue;
        const id = queue.getRequestId();
        queue.add(this.requestFunction, id, url, method, data);
        return await queue.getRequestResult(id);
    }

    /**
     * @todo better error handling
     * @param url e6 endpoint without the host, => /posts/123456.json
     * @returns the response as a string
     */
    public static async getUrl(url: string, ignoreQueue = false): Promise<string> {
        return await this.request(url, "GET", ignoreQueue);
    }

    /**
     * @todo better error handling
     * @param url e6 endpoint without the host, => /posts/123456.json
     * @returns the response as a string
     */
    public static async getJson(url: string, ignoreQueue = false): Promise<any> {
        const response = await this.getUrl(url, ignoreQueue);
        return JSON.parse(response);
    }

    /**
     * @todo better error handling
     * @param url e6 endpoint without the host, => /posts/123456.json
     * @returns the response as a string
     */
    public static async postUrl(url: string, json?: {}, ignoreQueue = false): Promise<string> {
        return await this.request(url, "POST", ignoreQueue, json);
    }

    /**
     * Returns a singleton instance of the class
     * @returns Api instance
     */
    public static getInstance(): Api {
        if (this.instance === undefined) this.instance = new Api();
        return this.instance;
    }
}
