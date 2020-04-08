
// All endpoints must be registered here.
// Name is irrelevant, as long as it is unique.
// Path is the endpoint address, without https://e621.net/
const ENDPOINT_DEFS: EndpointDefinition[] = [
    { name: "posts", path: "posts", },
    { name: "tags", path: "tags" },
    { name: "tag_aliases", path: "tag_aliases" },
    { name: "tag_implications", path: "tag_implications" },

    { name: "notes", path: "notes" },
    { name: "favorites", path: "favorites", },
    { name: "pools", path: "pools", },
    { name: "sets", path: "sets", },

    { name: "users", path: "users" },
    { name: "blips", path: "blips" },
    { name: "wiki_pages", path: "wiki_pages" },

    { name: "comments", path: "comments" },
    { name: "forum_index", path: "forum_posts" },
    { name: "forum_topics", path: "forum_topics" },
];

class APIEndpoint {

    private queue: E621;
    private path: string;

    private param = "";

    public constructor(queue: E621, endpoint: EndpointDefinition) {
        this.queue = queue;
        this.path = endpoint.path;
    }

    /**
     * Set an endpoint parameter, if the current endpoint allows it.  
     * For example, to GET /users/12345.json, use E621.User.spec("12345").get(...);
     * @param param 
     */
    public spec(param: string): APIEndpoint {
        this.param = param;
        return this;
    }

    /**
     * Send a GET request to the endpoint
     * @param query Request query, either as a raw string or an APIQuery
     * @param delay Optional delay override, in milliseconds
     */
    public async get(query: string | APIQuery, delay?: number): Promise<any> {
        return this.queue.createRequest(this.getParsedPath(), this.queryToString(query), "GET", "", delay);
    }

    /**
     * Send a POST request to the endpoint
     * @param data Data to be sent with the request
     * @param delay Optional delay override, in milliseconds
     */
    public async post(data: {}, delay?: number): Promise<any> {
        return this.queue.createRequest(this.getParsedPath(), "", "POST", this.queryToString(data), delay);
    }

    /** Returns the endpoint path, accounting for the possible parameter */
    private getParsedPath(): string {
        if (this.param === "") return this.path + ".json";
        const newPath = this.path + "/" + this.param;
        this.param = "";
        return newPath + ".json";
    }

    /** Converts APIQuery into a raw string */
    private queryToString(query: string | APIQuery): string {
        if (typeof query === "string") return query;

        const keys = Object.keys(query);
        if (keys.length === 0) return "";

        const queryString = [];
        keys.forEach((key) => {
            let value = query[key];
            if (Array.isArray(value)) value = (value as string[]).join(",");
            queryString.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
        });
        return queryString.join("&");
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
     * @param path Endpoint path, i.e. posts.json
     * @param query Raw query string, i.e. ?tags=horse,male,solo
     * @param method Request method, either GET or POST
     * @param data Data to POST
     */
    public async createRequest(path: string, query: string, method: "GET" | "POST", data = "", delay?: number): Promise<any> {
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
        const final = new Promise<any>((resolve) => {
            $(document).on("api.re621.result-" + index, (event, data) => {
                $(document).off("api.re621.result-" + index);
                resolve(data);
            });
        });

        this.queue.push({ request: entry, index: index, delay: delay });
        this.run();

        return final;
    }

    /** Starts the queue processing, if it has not happened already */
    private async run(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            const data = await fetch(item.request);
            $(document).trigger("api.re621.result-" + item.index, await data.json());
            await new Promise((resolve) => { setTimeout(() => { resolve(); }, item.delay) });
        }
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
     * ex. posts, forum_posts, comments, etc.
     */
    path: string;
}

type APIQuery = {
    [prop: string]: string | string[];
};

interface QueueItem {
    request: Request;
    index: number;
    delay: number;
}
