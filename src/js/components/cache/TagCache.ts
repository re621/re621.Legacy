import { Debug } from "../utility/Debug";
import { Util } from "../utility/Util";

export class TagCache {

    private static cache: Map<string, TagData>;

    /**
     * Returns the tag cache.  
     * Should be used instead of accessing the variable directly, for safety.
     */
    private static getCache(): Map<string, TagData> {
        if (TagCache.cache == undefined) TagCache.load();
        return TagCache.cache;
    }

    /** Loads the cache from local storage */
    public static load(): void {
        TagCache.cache = new Map(JSON.parse(Util.LS.getItem("re621.tagcache") || "[]"));
        const now = Util.Time.now();
        let pruned = 0;
        for (const [name, data] of TagCache.cache)
            if (data.expires < now) {
                TagCache.cache.delete(name);
                pruned++;
            }
        Debug.log(`TagCache loaded, ${TagCache.cache.size}, ${pruned} pruned`);
    }

    /** Saves the cache to local storage */
    public static save(): void {
        Util.LS.setItem("re621.tagcache", JSON.stringify(Array.from(TagCache.getCache().entries())));
        Debug.log(`TagCache saved, ${TagCache.cache.size}`);
    }

    /** Removes all items from cache */
    public static clear(): void {
        TagCache.getCache().clear();
        TagCache.save();
    }

    /** Returns true if the tag is present in cache, false otherwise */
    public static has(tag: string): boolean {
        return TagCache.getCache().has(tag);
    }

    /** Returns the cached tag data */
    public static get(tag: string): TagData {
        if (TagCache.getCache().has(tag)) return TagCache.getCache().get(tag);
        return null;
    }

    /** Adds the tag data to cache */
    public static add(tag: string, count: number, category: number): void {
        TagCache.getCache().set(tag, { count: count, category: category, expires: Util.Time.now() + Util.Time.DAY });
    }

}

interface TagData {
    count: number;
    category: number;
    expires: number;
}
