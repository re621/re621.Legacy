import { E621 } from "../api/E621";
import { APITagImplication } from "../api/responses/APITagImplication";
import { Util } from "../utility/Util";

export class AvoidPosting {

    private static cache: Set<string>;

    /**
     * Returns the set containing cached items.  
     * Loads the data from local storage if necessary.
     */
    private static getCache(): Set<string> {
        if (typeof AvoidPosting.cache === "undefined")
            AvoidPosting.cache = new Set<string>(JSON.parse(window.localStorage.getItem("re621.dnpcache.data") || "[]"))
        return AvoidPosting.cache;
    }

    /** Saves the cached items to local storage */
    private static save(): void {
        window.localStorage.setItem("re621.dnpcache.data", JSON.stringify(Array.from(AvoidPosting.getCache())));
    }

    /** Permanently removes all data from cache */
    private static clear(): void {
        AvoidPosting.cache = new Set();
        AvoidPosting.save();
    }

    /** Returns the number of items in the cache */
    public static size(): number {
        return AvoidPosting.getCache().size;
    }

    /** Returns true if the parameter is present in cache */
    public static has(tag: string): boolean {
        return AvoidPosting.getCache().has(tag);
    }

    /** Adds the provided item to cache */
    private static add(tag: string): void {
        AvoidPosting.getCache().add(tag);
        AvoidPosting.save();
    }

    /**
     * Fetches the tags aliased to `avoid_posting` from the API and adds them to cache
     * @param status DOM element for the status messages
     */
    public static async update(status?: JQuery<HTMLElement>): Promise<number> {
        if (!status) status = $("<span>");

        AvoidPosting.clear();
        let result: APITagImplication[] = [],
            page = 0;

        do {
            page++;
            status.html(`<i class="fas fa-circle-notch fa-spin"></i> Processing tags: batch ${page} / ?`)
            result = await E621.TagImplications.get<APITagImplication>({ "search[consequent_name]": "avoid_posting", page: page, limit: 1000 }, 500);
            for (const entry of result) AvoidPosting.add(entry["antecedent_name"]);
        } while (result.length == 320);

        status.html(`<i class="far fa-check-circle"></i> Cache reloaded: ${AvoidPosting.size()} entries`);

        window.localStorage.setItem("re621.dnpcache.update", Util.Time.now() + "")

        return Promise.resolve(AvoidPosting.size());
    }

    /** Returns the timestamp for the last time cache was updated */
    public static getUpdateTime(): number {
        return parseInt(window.localStorage.getItem("re621.dnpcache.update")) || 0;
    }

    /** Returns true if the cache needs to be reloaded */
    public static isUpdateRequired(): boolean {
        return (AvoidPosting.getUpdateTime() + Util.Time.DAY < Util.Time.now()) || AvoidPosting.size() == 0;
    }

}
