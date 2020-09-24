// E621 API Endpoint Wrapper
// Version 2.1

import { Debug } from "../utility/Debug";
import { Util } from "../utility/Util";

// All endpoints must be registered here.
// Name is irrelevant, as long as it is unique.
// Path is the endpoint address, without https://e621.net/
// Don't forget to update the name in the E621 aliases below
const ENDPOINT_DEFS: EndpointDefinition[] = [
    { name: "posts", path: "posts.json", node: "posts" },
    { name: "post", path: "posts/%ID%.json", node: "post" },
    { name: "post_votes", path: "posts/%ID%/votes.json" },
    { name: "tags", path: "tags.json" },
    { name: "tag", path: "tags/%ID%.json" },
    { name: "tag_aliases", path: "tag_aliases.json" },
    { name: "tag_implications", path: "tag_implications.json" },

    { name: "notes", path: "notes.json" },
    { name: "favorites", path: "favorites.json", node: "posts" },
    { name: "favorite", path: "favorites/%ID%.json" },
    { name: "pools", path: "pools.json" },
    { name: "pool", path: "pools/%ID%.json" },
    { name: "sets", path: "post_sets.json" },
    { name: "set", path: "post_sets/%ID%.json" },
    { name: "set_add_post", path: "post_sets/%ID%/add_posts.json" },
    { name: "set_remove_post", path: "post_sets/%ID%/remove_posts.json" },

    { name: "users", path: "users.json" },
    { name: "user", path: "users/%ID%.json" },
    { name: "blips", path: "blips.json" },
    { name: "wiki_pages", path: "wiki_pages.json" },

    { name: "comments", path: "comments.json" },
    { name: "comment", path: "comments/%ID%.json" },
    { name: "forum_posts", path: "forum_posts.json" },
    { name: "forum_post", path: "forum_posts/%ID%.json" },
    { name: "forum_topics", path: "forum_topics.json" },
    { name: "forum_topic", path: "forum_topics/%ID%.json" },

    { name: "dtext_preview", path: "dtext_preview" },
    { name: "iqdb_queries", path: "iqdb_queries.json" },
];

class APIEndpoint {

    private queue: E621;
    private path: string;

    private name: string;
    private node: string;

    private param: string;

    public constructor(queue: E621, endpoint: EndpointDefinition) {
        this.queue = queue;
        this.path = endpoint.path;

        this.name = endpoint.name;
        this.node = endpoint.node;
    }

    /**
     * Set an endpoint parameter, if the current endpoint allows it.  
     * For example, to GET /users/12345.json, use E621.User.spec("12345").get(...);
     * @param param 
     */
    public id(param: string | number): APIEndpoint {
        this.param = param + "";
        return this;
    }

    /**
     * Send a GET request to the endpoint
     * @param query Request query, either as a raw string or an APIQuery
     * @param delay Optional delay override, in milliseconds
     */
    public async get<T extends APIResponse>(query?: APIQuery, delay?: number): Promise<T[]> {
        return this.queue.createRequest(this.getParsedPath(), this.formatParam(query), "GET", {}, this.name, this.node, delay).then(
            (response) => {
                const result = this.formatData<T>(response[0], response[2]);
                return Promise.resolve(result);
            },
            (response) => {
                return Promise.reject(response[0]);
            }
        );
    }

    /**
     * Sends a GET request to the endpoint, and returns the first result found.  
     * If no results are found, returns null.
     * @param query Request query, either as a raw string or an APIQuery
     * @param delay Optional delay override, in milliseconds
     */
    public async first<T extends APIResponse>(query?: APIQuery, delay?: number): Promise<T> {
        return this.get<T>(query, delay).then((response) => {
            if (response.length > 0) return Promise.resolve(response[0]);
            else return Promise.resolve(null);
        });
    }

    /**
     * Send a POST request to the endpoint
     * @param data Data to be sent with the request
     * @param delay Optional delay override, in milliseconds
     */
    public async post(data?: APIQuery, delay?: number): Promise<any> {
        return this.queue.createRequest(this.getParsedPath(), {}, "POST", this.formatParam(data), this.name, this.node, delay).then(
            (data) => {
                return Promise.resolve(data);
            },
            (error) => { return Promise.reject(error); }
        );
    }

    public async delete(data?: APIQuery, delay?: number): Promise<any> {
        return this.queue.createRequest(this.getParsedPath(), {}, "DELETE", this.formatParam(data), this.name, this.node, delay).then(
            (data) => {
                return Promise.resolve(data);
            },
            (error) => { return Promise.reject(error); }
        );
    }

    public async put(data?: APIQuery, delay?: number): Promise<any> {
        return this.queue.createRequest(this.getParsedPath(), {}, "PUT", this.formatParam(data), this.name, this.node, delay).then(
            (data) => {
                return Promise.resolve(data);
            },
            (error) => { return Promise.reject(error); }
        );
    }

    /** Returns the endpoint path, accounting for the possible parameter */
    private getParsedPath(): string {
        if (this.param) {
            const output = this.path.replace(/%ID%/g, this.param);
            this.param = undefined;     // Clear the param to avoid contaminating the next query
            return output;
        }
        return this.path;
    }

    /**
     * Ensures that the provided APIQuery is in the correct format.  
     * Flattens objects and arrays in order to return a list of key-value pairs.
     * @param input APIQuery to format
     * @param encode If true, the values are URI encoded
     */
    private formatParam(input: APIQuery): FormattedAPIQuery {
        Debug.log("input", input);
        if (input === undefined || input === null) return {};

        const response: FormattedAPIQuery = {};
        for (const [key, value] of Object.entries(input)) {
            if (value === undefined || value === null) continue;

            if (Array.isArray(value)) {
                for (const [index, elem] of value.entries())
                    value[index] = cleanURIComponent(elem);
                response[key] = value.join("+");
            } else if (typeof value == "object") {
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (Array.isArray(subValue)) {
                        for (const [index, subElement] of subValue.entries())
                            subValue[index] = cleanURIComponent(subElement);
                        response[`${key}[${subKey}]`] = subValue.join("+");
                    } else response[`${key}[${subKey}]`] = cleanURIComponent(subValue);
                }
            } else {
                response[key] = cleanURIComponent(value);
            }
        }

        Debug.log("output", response);
        return response;

        /** Prevent double-encoding the values */
        function cleanURIComponent(value: APIQueryEntry): string {
            return encodeURIComponent(decodeURIComponent(value + ""));
        }
    }

    /**
     * Returns the correct data node depending on the endpoint's definition and parameter
     * @param data Data to select the node from
     * @param hasParam Whether or not the endpoint had a parameter
     */
    private formatData<T extends APIResponse>(data: any, node: string): T[] {
        if (node !== undefined) data = data[node];

        if (Array.isArray(data)) return data as T[];
        else return [data as T];
    }

}

export class E621 {

    // Singleton instance, to avoid queue desynchronization
    private static instance: E621;

    // How often the script can send requests to the API, in milliseconds.
    // It can be as low as 500ms, but to stay on the safe side, we keep it at 1000.
    private static requestRateLimit = 1000;

    // Needed to authenticate some post requests, for example when you modify user settings
    private authToken: string;

    //used to notify the original request function of the requests completion
    private emitter = $({});

    // Request queue variables
    private queue: QueueItem[];
    private processing = false;
    private requestIndex = 0;

    // Endpoint Definitions
    private endpoints = {};

    // Endpoint Aliases
    public static Posts = E621.getEndpoint("posts");
    public static Post = E621.getEndpoint("post");
    public static PostVotes = E621.getEndpoint("post_votes");
    public static Tags = E621.getEndpoint("tags");
    public static Tag = E621.getEndpoint("tag");
    public static TagAliases = E621.getEndpoint("tag_aliases");
    public static TagImplications = E621.getEndpoint("tag_implications");

    public static Notes = E621.getEndpoint("notes");
    public static Favorites = E621.getEndpoint("favorites");
    public static Favorite = E621.getEndpoint("favorite");
    public static Pools = E621.getEndpoint("pools");
    public static Pool = E621.getEndpoint("pool");
    public static Sets = E621.getEndpoint("sets");
    public static Set = E621.getEndpoint("set");
    public static SetAddPost = E621.getEndpoint("set_add_post");
    public static SetRemovePost = E621.getEndpoint("set_remove_post");

    public static Users = E621.getEndpoint("users");
    public static User = E621.getEndpoint("user");
    public static Blips = E621.getEndpoint("blips");
    public static Wiki = E621.getEndpoint("wiki_pages");

    public static Comments = E621.getEndpoint("comments");
    public static Comment = E621.getEndpoint("comment");
    public static ForumPosts = E621.getEndpoint("forum_posts");
    public static ForumPost = E621.getEndpoint("forum_post");
    public static ForumTopics = E621.getEndpoint("forum_topics");
    public static ForumTopic = E621.getEndpoint("forum_topic");

    public static DTextPreview = E621.getEndpoint("dtext_preview");
    public static IQDBQueries = E621.getEndpoint("iqdb_queries");

    /** Constructor - should be kept private */
    private constructor() {
        this.authToken = $("head meta[name=csrf-token]").attr("content");
        this.queue = [];
        ENDPOINT_DEFS.forEach((definition) => {
            this.endpoints[definition.name] = new APIEndpoint(this, definition);
        });
    }

    /**
     * Returns an endpoint by name.  
     * Names are defined in ENDPOINT_DEFS constant
     * @param name Endpoint name
     */
    private static getEndpoint(name: string): APIEndpoint {
        if (this.instance === undefined) this.instance = new E621();
        return this.instance.endpoints[name];
    }

    /**
     * Adds a new request to the queue based on provided data.  
     * This should only be called from endpoint get() or post() methods.
     * @param hasParam Whether or not the endpoint had a parameter  
     * @param path Endpoint path, i.e. posts.json
     * @param query Raw query string, i.e. ?tags=horse,male,solo
     * @param method Request method, either GET or POST
     * @param data Data to POST
     * @param delay How quickly the next request can be sent, in ms
     */
    public async createRequest(path: string, query: FormattedAPIQuery, method: "GET" | "POST" | "PUT" | "DELETE", requestBody: FormattedAPIQuery, endpoint: string, node: string, delay: number): Promise<any> {
        if (delay === undefined) delay = E621.requestRateLimit;
        else if (delay < 500) delay = 500;

        const requestInfo: RequestInit = {
            credentials: "include",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": window["re621"]["useragent"],
                "X-User-Agent": window["re621"]["useragent"],
            },
            method: method,
            mode: "cors"
        };

        if (method !== "GET") {
            this.authToken = $("meta[name=csrf-token]").attr("content");
            requestBody["authenticity_token"] = encodeURIComponent(this.authToken);
            requestInfo.body = FormattedAPIQuery.stringify(requestBody);
        }

        // Append query parameters to the URL
        query["_client"] = window["re621"]["useragent"];

        const entry = new Request(location.origin + "/" + path + "?" + FormattedAPIQuery.stringify(query), requestInfo);
        const index = this.requestIndex++;
        const final = new Promise<any>((resolve, reject) => {
            this.emitter.one("api.re621.result-" + index, (e, data, status, endpoint, node) => {
                // This happens if you use find() on an item that does not exist
                if (data === null) data = [];

                // This happens if you search for an item that does not exist through a query
                // Posts endpoint does not count, because it is one special little snowflake.
                if (data[endpoint] !== undefined && !["posts", "post"].includes(endpoint)) data = [];

                // "Normal" error handling
                if (data["error"] === undefined) resolve([data, status, node]);
                else reject([data, status, node]);
            });
        });

        this.add({ request: entry, index: index, delay: delay, endpoint: endpoint, node: node, });

        return final;
    }

    /**
     * Adds an item to the queue and starts processing it
     * @param newItem Item to add
     */
    private async add(newItem: QueueItem): Promise<void> {
        this.queue.push(newItem);

        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            Debug.connectLog(item.request.url);

            await new Promise(async (resolve) => {
                fetch(item.request).then(
                    async (response) => {
                        if (response.ok) {
                            let responseText = await response.text();
                            if (!responseText) responseText = "[]";

                            this.emitter.trigger(
                                "api.re621.result-" + item.index,
                                [
                                    JSON.parse(responseText),
                                    response.status,
                                    item.endpoint,
                                    item.node,
                                ]
                            );
                        } else {
                            this.emitter.trigger(
                                "api.re621.result-" + item.index,
                                [
                                    { error: response.status + " " + response.statusText },
                                    response.status,
                                    item.endpoint,
                                    item.node,
                                ]
                            );
                        }
                        resolve();
                    },
                    (error) => {
                        this.emitter.trigger(
                            "api.re621.result-" + item.index,
                            [
                                { error: (error && error[0]) ? error[1] + " " + error[0].error : "unknown error" },
                                (error && error[0]) ? error[1] : 500,
                                item.endpoint,
                                item.node,
                            ]
                        );
                        resolve();
                    }
                );
            });
            await Util.sleep(item.delay);
        }

        this.processing = false;
    }
}

interface EndpointDefinition {

    /**
     * **name** - irrelevant, as long as it's unique  
     * ex. posts, forum_posts, comments, etc
     */
    name: string;

    /**
     * **path** - endpoint path, without origin or extension  
     * ex. posts.json, forum_posts.json, comments.json, etc.  
     * May include %ID% that is replaced by a user-provided variable.
     * ex. posts/%ID%.json
     */
    path: string;

    /**
     * **node** - defined special cases for endpoint nodes  
     * Mainly used to get rid of the wrapper around posts results
     */
    node?: string;

}

/**
 * Any number of query strings to be passed to the endpoint.
 * Stringified into "key1=value1A+value1B+value1C&key2=value2A..."
 */
interface APIQuery {
    [prop: string]: APIQueryEntry | APIQueryEntry[] | APIQuerySubentry;
};

interface FormattedAPIQuery {
    [prop: string]: string;
}

namespace FormattedAPIQuery {
    export function stringify(input: FormattedAPIQuery): string {
        const result = [];
        for (const [key, value] of Object.entries(input))
            result.push(key + "=" + value);
        return result.join("&");
    }
}

type APIQueryEntry = string | number | boolean;
interface APIQuerySubentry {
    [prop: string]: APIQueryEntry | APIQueryEntry[];
}

/** A queued request, waiting to be processed */
interface QueueItem {
    /** Request body */
    request: Request;

    /** Auto-incremented index, used to receive the resulting data */
    index: number;

    /** Delay before the next request is sent */
    delay: number;

    /** Endpoint from which the request originated */
    endpoint: string;

    /** Whether or not the endpoint had parameters */
    node: string;
}
