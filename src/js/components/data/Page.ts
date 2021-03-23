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
        const pathname = this.getInstance().url.pathname.replace(/[\/?]$/g, "");
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
        return this.getInstance().url.hostname.replace(/\.net/g, "");;
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
    public static getPageType(): string {
        for (const [name, regex] of Object.entries(PageDefinition))
            if (Page.matches(regex)) return name;
        return null;
    }
}

export const PageDefinition = {
    title: /^(\/)?$/,
    search: /^\/posts\/?$/,
    post: /^\/posts\/\d+\/?(show_seq)?$/,
    upload: /\/uploads\/new\/?/,
    forum: /^\/forum_topics\/?.*/,
    forumPost: /^\/forum_topics\/\d+.*/,
    pool: /^\/pools\/.+/,
    set: /^\/post_sets\/.+/,
    popular: /^\/explore\/posts\/popular.?/,
    favorites: /^\/favorites\/?.*/,
    wiki: /^\/wiki_pages\/[0-9]+/,
    wikiNA: /^\/wiki_pages\/show_or_new.*/,
    artist: /^\/artists\/[0-9]+/,
    comments: /^\/comments\??.*/,
    settings: /^\/users\/\d+\/edit$/,
    changes: /^\/post_versions.*/,
    tickets: /^\/tickets.*/,
    profile: /^\/users\/\d+$/,
    iqdb: /^\/iqdb_queries.*/,
    deleted_posts: /^\/deleted_posts.*/,
    blips: /^\/blips.*/,
    help: /^\/help.*/,
};
