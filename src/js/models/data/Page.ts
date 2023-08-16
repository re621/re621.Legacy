export class Page {

    private static instance: Page;

    private url: URL;

    private constructor() {
        this.url = new URL(window.location.toString());
    }

    /**
     * Checks if the url the user is currently on satisfies the filter
     * @param filter Pipe separated list of filters the current location has to satisfy
     *               Matches are by default on a startsWith basis, but if the url must match
     *               you can prepend =
     * @returns true if at least on filter is fulfilled
     */
    public static matches(filter: RegExp | RegExp[]): boolean {
        if (filter instanceof RegExp) filter = [filter];
        const pathname = this.getInstance().url.pathname.replace(/[/?]$/g, "");
        let result = false;
        filter.forEach(function (constraint) {
            result = result || constraint.test(pathname);
        });
        return result;
    }

    /** Returns a URL object */
    public static getURL(): URL {
        return this.getInstance().url;
    }

    /**
     * Returns the query parameter, or null if the key does not exist
     * @return string Query parameter
     */
    public static getQueryParameter(key: string): string {
        return this.getInstance().url.searchParams.get(key);
    }

    /**
     * Returns true if the search parameters has the provided key, false otherwise
     * @param key 
     */
    public static hasQueryParameter(key: string): boolean {
        return this.getInstance().url.searchParams.has(key);
    }

    /**
     * Sets a query parameter in the current url  
     * If there is already one with the same key, it will get overridden
     * @param key 
     * @param value 
     */
    public static setQueryParameter(key: string, value: string): void {
        this.getInstance().url.searchParams.set(key, value);
        this.refreshCurrentUrl();
    }

    /**
     * Removes a querystring from the url
     */
    public static removeQueryParameter(keys: string | string[]): void {
        if (!Array.isArray(keys)) keys = [keys];
        for (const key of keys)
            this.getInstance().url.searchParams.delete(key);
        this.refreshCurrentUrl();
    }

    /**
     * Replaces the current url without reloading or pushing the old one to the history
     */
    private static refreshCurrentUrl(): void {
        const url = this.getInstance().url;
        const searchPrefix = url.searchParams.toString().length === 0 ? "" : "?";
        history.replaceState({}, "", url.origin + url.pathname + searchPrefix + url.searchParams.toString() + url.hash);
    }

    /**
     * Returns the name of the current site
     * @returns e621 or e926
     */
    public static getSiteName(): string {
        return this.getInstance().url.hostname.replace(/\.net/g, "");
    }

    /**
     * Returns the ID from the second part of the pathname
     */
    public static getPageID(): string {
        return this.getInstance().url.pathname.split("/")[2];
    }

    /**
     * Returns a singleton instance of the class
     * @returns Url instance
     */
    public static getInstance(): Page {
        if (this.instance === undefined) this.instance = new Page();
        return this.instance;
    }

    /**
     * Returns the type of the page, according to the definitions below
     * @returns Page type, as a string
     */
    public static getPageName(): string {
        for (const [name, value] of Object.entries(PageDefinition as RegExpList)) {
            if (typeof value.test == "function")
                if (Page.matches(value as RegExp)) return name;
                else continue;

            for (const [sub, regex] of Object.entries(value))
                if (Page.matches(regex)) return name + "." + sub;
        }
        return null;
    }
}

// 1: Pages that allow alphanumeric params
export const PageDefinition = {
    root: /^\/?$/,

    // Posts
    posts: {
        list: /^\/posts\/?$/,
        view: /^\/posts\/\d+\/?(show_seq)?$/
    },
    popular: /^\/popular\/?$/,
    favorites: /^\/favorites\/?$/,
    upload: /\/uploads\/new\/?/,
    changes: /^\/post_versions\/?$/,
    iqdb: /^\/iqdb_queries\/?$/,
    deleted_posts: /^\/deleted_posts\/?$/,
    postConfirmDelete: /^\/moderator\/post\/posts\/.+\/confirm_delete.*/,

    // Interactions
    users: {
        list: /^\/users\/?$/,
        view: /^\/users\/.+/,           // 1
        settings: /^\/users\/\.+\/edit\/?$/,
    },
    forums: {
        any: /^\/forum_topics.*$/,
        list: /^\/forum_topics\/?$/,
        view: /^\/forum_topics\/\d+\/?$/,
        post: /^\/posts\/\d+\/?$/,
    },
    comments: {
        list: /^\/comments\/?$/,
        view: /^\/comments\/\d+\/?$/,
    },
    tickets: {
        list: /^\/tickets\/?$/,
        view: /^\/tickets\/\d+\/?$/,
    },
    blips: {
        list: /^\/blips\/?/,
        view: /^\/blips\/\d+\/?$/,
    },

    // Post groups
    pools: {
        list: /^\/pools\/?$/,
        view: /^\/pools\/\d+\/?$/,
    },
    sets: {
        list: /^\/post_sets\/?$/,
        view: /^\/post_sets\/\d+\/?$/,
    },

    // Wikis
    wiki: {
        list: /^\/wiki_pages\/?$/,
        view: /^\/wiki_pages\/.+/,      // 1
    },
    artists: {
        list: /^\/artists\/?$/,
        view: /^\/artists\/.+/,         // 1
    },
    help: {
        list: /^\/help\/?4/,
        view: /^\/help\/.*/,            // 1
    },

    // Custom
    pluginSettings: /^\/plugins\/re621.*/,
};
type RegExpList = {
    [name: string]: RegExp | RegExpList;
}

export const IgnoredPages = [
    PageDefinition.root,
    /\.json/,
    /sidekiq/,
];
