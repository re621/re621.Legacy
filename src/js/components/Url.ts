export class Url {

    private static instance: Url;

    private location: Location;
    private queryParameter: Map<string, string> = new Map<string, string>();

    private constructor() {
        this.location = document.location;
        this.initQueryParams();
    }

    private initQueryParams() {
        const paramString = this.location.href.split("?")[1];
        //Check if there are any query params
        if (paramString === undefined) {
            return;
        }
        //Add each paramter to the map
        for (const param of paramString.split("&")) {
            const split = param.split("=")
            this.queryParameter.set(split[0], split[1] !== undefined ? split[1] : "");
        }
    }

    /**
     * Checks if the url the user is currently on satisfies the filter
     * @param filter Pipe seperated list of filters the current location has to satisfy
     *               Matches are by default on a startsWith basis, but if the url must match
     *               you can prepend =
     * @returns true if at least on filter is fullfilled
     */
    public static matches(filter: string) {
        const instance = this.getInstance();
        const domain = instance.location.protocol + "//" + instance.location.host;
        let result = false;
        for (const constraint of filter.split("|")) {
            if (constraint.startsWith("=")) {
                result = result || instance.location.href === domain + constraint.substring(1);
            } else {
                result = result || instance.location.href.startsWith(domain + constraint);
            }
        }
        return result;
    }

    /**
     * @return returns the query parameter, or undefined if the key doesn't exist
     */
    public static getQueryParameter(key: string) {
        return this.getInstance().queryParameter.get(key);
    }

    /**
     * Removes a querystring from the url
     */
    public static removeQueryParameter(key: string) {
        this.getInstance().queryParameter.delete(key);
        this.refreshCurrentUrl();
    }

    /**
     * Replaces the current url without reloading or pushing the old one to the history
     */
    private static refreshCurrentUrl() {
        let newSearch = [];
        this.getInstance().queryParameter.forEach((value, key) => {
            value = value !== undefined ? value : "";
            newSearch.push(key + "=" + value);
        });
        const location = this.getInstance().location;
        const searchPrefix = newSearch.length === 0 ? "" : "?"
        history.replaceState({}, "", location.protocol + "//" + location.host + location.pathname + searchPrefix + newSearch.join("&"));
    }

    /**
     * Returns a singleton instance of the class
     * @returns Url instance
     */
    public static getInstance(): Url {
        if (this.instance === undefined) this.instance = new Url();
        return this.instance;
    }
}
