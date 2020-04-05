import { RequestQueue } from "./RequestQueue";

/**
 * Conventient class to make e6 api requests
 */
export class Api {

    private static instance: Api;
    private defaultDelay = 2000;

    //needed to authenticate some post requests, for example when you modify user settings
    private authenticityToken: string;

    private queue = new Map<number, RequestQueue>();

    private constructor() {
        this.authenticityToken = $("head meta[name=csrf-token]").attr("content");
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

    private static async request(url: string, method: string, delay?: number, data?: {}): Promise<string> {
        const instance = this.getInstance();
        if (!delay) {
            delay = instance.defaultDelay;
        }
        let queue = instance.queue.get(delay);
        if(!queue) {
            const newQueue = new RequestQueue(delay);
            instance.queue.set(delay, newQueue);
            queue = newQueue;
        }
        const id = queue.getRequestId();
        queue.add(this.requestFunction, id, url, method, data);
        return await queue.getRequestResult(id);
    }

    /**
     * @todo better error handling
     * @param url e6 endpoint without the host, => /posts/123456.json
     * @returns the response as a string
     */
    public static async getUrl(url: string, delay?: number): Promise<string> {
        return await this.request(url, "GET", delay);
    }

    /**
     * @todo better error handling
     * @param url e6 endpoint without the host, => /posts/123456.json
     * @returns the response as a string
     */
    public static async getJson(url: string, delay?: number): Promise<any> {
        const response = await this.getUrl(url, delay);
        return JSON.parse(response);
    }

    /**
     * @todo better error handling
     * @param url e6 endpoint without the host, => /posts/123456.json
     * @returns the response as a string
     */
    public static async postUrl(url: string, json?: {}, delay?: number): Promise<string> {
        return await this.request(url, "POST", delay, json);
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
