
// All endpoints must be registered here.
// Name is irrelevant, as long as it is unique.
// Path is the endpoint address, without https://e621.net/
// Don't forget to update the name in the E621 aliases below
const ENDPOINT_DEFS: EndpointDefinition[] = [
    { name: "posts", path: "posts", node: { list: "posts", id: "post" } },
    { name: "tags", path: "tags", },
    { name: "tag_aliases", path: "tag_aliases", },
    { name: "tag_implications", path: "tag_implications", },

    { name: "notes", path: "notes", },
    { name: "favorites", path: "favorites", node: { list: "posts" } },
    { name: "pools", path: "pools", },
    { name: "sets", path: "post_sets", },

    { name: "users", path: "users", },
    { name: "blips", path: "blips", },
    { name: "wiki_pages", path: "wiki_pages", },

    { name: "comments", path: "comments", },
    { name: "forum_posts", path: "forum_posts", },
    { name: "forum_topics", path: "forum_topics", },
];

class APIEndpoint {

    private queue: E621;
    private path: string;

    private name: string;
    private nodeDef: NodeDefinition;
    private nodeCur: NodeType;

    private param = "";

    public constructor(queue: E621, endpoint: EndpointDefinition) {
        this.queue = queue;
        this.path = endpoint.path;

        this.name = endpoint.name;
        this.nodeDef = endpoint.node === undefined ? {} : endpoint.node;
        this.nodeCur = "list";
    }

    /**
     * Set an endpoint parameter, if the current endpoint allows it.  
     * For example, to GET /users/12345.json, use E621.User.spec("12345").get(...);
     * @param param 
     */
    public find(param: string): APIEndpoint {
        this.param = param;
        this.nodeCur = "id";
        return this;
    }

    /**
     * Send a GET request to the endpoint
     * @param query Request query, either as a raw string or an APIQuery
     * @param delay Optional delay override, in milliseconds
     */
    public async get<T extends APIResponse>(query?: string | APIQuery, delay?: number): Promise<T[]> {
        return this.queue.createRequest(this.getParsedPath(), this.queryToString(query), "GET", "", this.name, this.getNode(), delay).then(
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
     * Send a POST request to the endpoint
     * @param data Data to be sent with the request
     * @param delay Optional delay override, in milliseconds
     */
    public async post(data?: string | APIQuery, delay?: number): Promise<any> {
        return this.queue.createRequest(this.getParsedPath(), "", "POST", this.queryToString(data), this.name, this.getNode(), delay).then(
            (data) => {
                return Promise.resolve(data);
            },
            (error) => { return Promise.reject(error); }
        );
    }

    /** Returns the endpoint path, accounting for the possible parameter */
    private getParsedPath(): string {
        if (this.param === "") return this.path + ".json";
        const newPath = this.path + "/" + this.param + ".json";
        this.param = "";
        return newPath;
    }

    /** Converts APIQuery into a raw string */
    private queryToString(query: string | APIQuery): string {
        if (query === undefined) return "";
        if (typeof query === "string") return query;

        const keys = Object.keys(query);
        if (keys.length === 0) return "";

        const queryString = [];
        keys.forEach((key) => {
            if (key.includes("search")) this.nodeCur = "search";
            let value = query[key];
            if (Array.isArray(value)) value = (value as string[]).join("+");
            queryString.push(encodeURIComponent(key) + "=" + encodeURIComponent(value).replace(/%2B/g, "+"));
        });
        return queryString.join("&");
    }

    /**
     * Returns the current node type, then resets it to the default state, to avoid conflicts.
     */
    private getNode(): NodeType {
        const node = this.nodeCur;
        this.nodeCur = "list";
        return node;
    }

    /**
     * Returns the correct data node depending on the endpoint's definition and parameter
     * @param data Data to select the node from
     * @param hasParam Whether or not the endpoint had a parameter
     */
    private formatData<T extends APIResponse>(data: any, node: NodeType): T[] {
        const selectedNode = this.nodeDef[node];
        if (selectedNode !== undefined && selectedNode !== "") data = data[selectedNode];

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
    public static Posts: APIEndpoint = E621.getEndpoint("posts");
    public static Tags: APIEndpoint = E621.getEndpoint("tags");
    public static TagAliases: APIEndpoint = E621.getEndpoint("tag_aliases");
    public static TagImplications: APIEndpoint = E621.getEndpoint("tag_implications");

    public static Notes: APIEndpoint = E621.getEndpoint("notes");
    public static Favorites: APIEndpoint = E621.getEndpoint("favorites");
    public static Pools: APIEndpoint = E621.getEndpoint("pools");
    public static Sets: APIEndpoint = E621.getEndpoint("sets");

    public static Users: APIEndpoint = E621.getEndpoint("users");
    public static Blips: APIEndpoint = E621.getEndpoint("blips");
    public static Wiki: APIEndpoint = E621.getEndpoint("wiki_pages");

    public static Comments: APIEndpoint = E621.getEndpoint("comments");
    public static ForumPosts: APIEndpoint = E621.getEndpoint("forum_posts");
    public static ForumTopics: APIEndpoint = E621.getEndpoint("forum_topics");

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
    public async createRequest(path: string, query: string, method: "GET" | "POST", data: string, endpoint: string, node: NodeType, delay: number): Promise<any> {
        if (delay === undefined) delay = E621.requestRateLimit;
        else if (delay < 500) delay = 500;

        const requestInfo: RequestInit = {
            credentials: "include",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Header": "re621/1.0 userscript re621.github.io"
            },
            method: method,
            mode: "cors"
        };

        if (method === "POST") requestInfo.body = data + ((data.length > 0) ? "&" : "") + "authenticity_token=" + this.authToken;

        const entry = new Request(location.origin + "/" + path + ((query.length > 0) ? "?" : "") + query, requestInfo);
        const index = this.requestIndex++;
        const final = new Promise<any>((resolve, reject) => {
            this.emitter.one("api.re621.result-" + index, (e, data, status, endpoint, node) => {
                // This happens if you use find() on an item that does not exist
                if (data === null) data = [];

                // This happens if you search for an item that does not exist through a query
                if (data[endpoint] !== undefined) data = [];

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
            // console.log("processing " + item.request.url);
            const request = await fetch(item.request);

            if (request.ok) {
                this.emitter.trigger(
                    "api.re621.result-" + item.index,
                    [
                        await request.json(),
                        request.status,
                        item.endpoint,
                        item.node,
                    ]
                );
            } else {
                this.emitter.trigger(
                    "api.re621.result-" + item.index,
                    [
                        { "error": request.status + " " + request.statusText },
                        request.status,
                        item.endpoint,
                        item.node,
                    ]
                );
            }
            await new Promise((resolve) => { setTimeout(() => { resolve(); }, item.delay) });
        }

        this.processing = false;
    }
}

/** Describes an API endpoint */
interface EndpointDefinition {
    /**
     * **name** - irrelevant, as long as it's unique  
     * ex. posts, forum_posts, comments, etc
     */
    name: string;

    /**
     * **path** - endpoint path, without origin or extension  
     * ex. posts, forum_posts, comments, etc.
     */
    path: string;

    node?: NodeDefinition;
}

/**
 * Specifies which node to look for in various situations.  
 * - list: default, normal output
 * - id: usage of find()
 * - search: usage of search[] in a query
 */
interface NodeDefinition {
    list?: string;
    id?: string;
    search?: string;
}

type NodeType = "list" | "id" | "search";

/**
 * Any number of query strings to be passed to the endpoint.
 * Stringified into "key1=value1A+value1B+value1C&key2=value2A..."
 */
type APIQuery = {
    [prop: string]: string | string[];
};

/** A queueued request, waiting to be processed */
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
    node: NodeType;
}
