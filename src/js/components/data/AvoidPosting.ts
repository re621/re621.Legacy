import { E621 } from "../api/E621";
import { APITagImplication } from "../api/responses/APITagImplication";

/**
 * Manages the Avoid Posted list
 */
export class AvoidPosting {

    /* How often should the DNP cache be updated */
    private static cacheLife = 24 * 60 * 60 * 1000; // daily

    private static cache: string[];
    private static cacheReady = false;

    /** Returns the cached DNP data. */
    private static async getCache(): Promise<string[]> {
        // Cache has already been fetched
        if (this.cacheReady) return Promise.resolve(this.cache);

        // Cache has not been fetched, but a copy has been stored earlier
        const storedCache = JSON.parse(window.localStorage.getItem("re621.dnp.cache") || `{ "expires": 0, "content": [] }`) as StoredCache;
        if (storedCache.expires > new Date().getTime()) {
            this.cache = storedCache.content;
            this.cacheReady = true;
            return Promise.resolve(this.cache);
        }

        // Cache does not exist, or has expired
        this.cache = [];
        let lookup: APITagImplication[], page = 1;
        do {
            lookup = await E621.TagImplications.get<APITagImplication>({ "search[consequent_name]": "avoid_posting", "limit": "320", "page": page });
            lookup.forEach((entry) => { this.cache.push(entry["antecedent_name"]); })
            page++;
        } while (lookup.length === 320);

        window.localStorage.setItem(
            "re621.dnp.cache",
            JSON.stringify({
                "expires": (new Date().getTime() + this.cacheLife),
                "content": this.cache,
            })
        );

        this.cacheReady = true;
        return Promise.resolve(this.cache);
    }

    /**
     * Returns true if the provided tag name is on the DNP list, false otherwise
     * @param name Tag name
     */
    public static async contains(name: string): Promise<boolean> {
        return this.getCache().then((cache) => {
            return Promise.resolve(cache.includes(name));
        });
    }

}

interface StoredCache {
    expires: number;
    content: string[];
}
