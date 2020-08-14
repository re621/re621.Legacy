import { E621 } from "../api/E621";
import { APIPost } from "../api/responses/APIPost";
import { User } from "../data/User";
import { Util } from "../utility/Util";

export class FavoriteCache {

    private static checkOverride = false;       // force cache validation on page load

    private static cache: Set<number>;
    private static enabled: boolean;

    private static storedFavNumber: number;     // number of favorites on e621, not in cache

    public static isEnabled(): boolean {
        if (typeof FavoriteCache.enabled == "undefined")
            FavoriteCache.enabled = window.localStorage.getItem("re621.favcache.enabled") !== "false";
        return FavoriteCache.enabled;
    }

    public static setEnabled(state: boolean): void {
        FavoriteCache.enabled = state;
        window.localStorage.setItem("re621.favcache.enabled", state + "");
    }

    /**
     * Returns the set containing cached items.  
     * Loads the data from local storage if necessary.
     */
    private static getCache(): Set<number> {
        if (typeof FavoriteCache.cache === "undefined")
            FavoriteCache.cache = FavoriteCache.isEnabled()
                ? new Set<number>(JSON.parse(window.localStorage.getItem("re621.favcache.data") || "[]"))
                : new Set();
        return FavoriteCache.cache;
    }

    /** Saves the cached items to local storage */
    private static save(): void {
        window.localStorage.setItem("re621.favcache.data", JSON.stringify(Array.from(FavoriteCache.getCache())));
    }

    /** Permanently removes all data from cache */
    public static clear(): void {
        FavoriteCache.cache = new Set();
        FavoriteCache.save();
        window.localStorage.removeItem("re621.favcache.update");
        window.localStorage.removeItem("re621.favcache.invalid");
    }

    /** Returns the number of items in the cache */
    public static size(): number {
        return FavoriteCache.getCache().size;
    }

    /** Returns true if the parameter is present in cache */
    public static has(post: number): boolean {
        return FavoriteCache.getCache().has(post);
    }

    /** Adds the provided item to cache */
    public static add(post: number, save = true): void {
        if (!FavoriteCache.isEnabled()) return;
        FavoriteCache.getCache().add(post);
        if (save) FavoriteCache.save();
    }

    /**
     * Removes the provided item to cache
     * @param post Item to remove
     * @returns true if the item was present in the cache, false otherwise
     */
    public static remove(post: number): boolean {
        if (!FavoriteCache.isEnabled() || !FavoriteCache.has(post)) return false;
        FavoriteCache.getCache().delete(post);
        FavoriteCache.save();
        return true;
    }

    /**
     * Iterates over the current user's favorites and adds their IDs to cache
     * @param status DOM element for the status messages
     */
    public static async update(status?: JQuery<HTMLElement>): Promise<number> {
        if (!status) status = $("<span>");

        FavoriteCache.clear();
        let result: APIPost[] = [],
            page = 0;
        const totalPages = Math.ceil((await User.getCurrentSettings()).favorite_count / 320);

        do {
            page++;
            status.html(`<i class="fas fa-circle-notch fa-spin"></i> Processing favorites: batch ${page} / ${totalPages}`)
            result = await E621.Posts.get<APIPost>({ tags: `fav:${User.getUsername()} status:any`, page: page, limit: 320 }, 1000);
            for (const entry of result) FavoriteCache.add(entry.id, false);
        } while (result.length == 320);

        FavoriteCache.save();
        status.html(`<i class="far fa-check-circle"></i> Cache reloaded: ${FavoriteCache.size()} entries`);

        window.localStorage.setItem("re621.favcache.update", Util.Time.now() + "")
        window.localStorage.setItem("re621.favcache.invalid", "false");

        return Promise.resolve(FavoriteCache.size());
    }

    /**
     * Attempt to recover from a cache integrity failure by fetching the newest page of favorites
     * @param status DOM element for the status messages
     */
    public static async quickUpdate(status?: JQuery<HTMLElement>): Promise<boolean> {
        if (!status) status = $("<span>");

        status.html(`<i class="fas fa-circle-notch fa-spin"></i> Attempting recovery . . .`);
        for (const entry of await E621.Favorites.get<APIPost>({ user_id: `${User.getUserID()}`, limit: 320 }, 1000))
            FavoriteCache.add(entry.id, false);

        FavoriteCache.save();
        status.html(`<i class="far fa-check-circle"></i> Recovery complete: ${FavoriteCache.size()} entries`);

        if ((await FavoriteCache.getStoredFavNumber()) == FavoriteCache.size()) {

            window.localStorage.setItem("re621.favcache.update", Util.Time.now() + "")
            window.localStorage.setItem("re621.favcache.invalid", "false");

            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }

    /** Returns the timestamp for the last time cache state was verified */
    public static getUpdateTime(): number {
        return parseInt(window.localStorage.getItem("re621.favcache.update")) || 0;
    }

    /** Returns true if the cache needs to be reloaded */
    public static async isUpdateRequired(): Promise<boolean> {
        if (FavoriteCache.checkOverride || FavoriteCache.getUpdateTime() + Util.Time.DAY < Util.Time.now()) {
            const updateRequired = (await FavoriteCache.getStoredFavNumber()) !== FavoriteCache.size();
            window.localStorage.setItem("re621.favcache.update", Util.Time.now() + "");
            window.localStorage.setItem("re621.favcache.invalid", updateRequired + "");
            return Promise.resolve(updateRequired);
        }
        return Promise.resolve(window.localStorage.getItem("re621.favcache.invalid") == "true");
    }

    public static async getStoredFavNumber(force = false): Promise<number> {
        if (force || FavoriteCache.storedFavNumber == undefined)
            FavoriteCache.storedFavNumber = (await User.getCurrentSettings()).favorite_count;
        return Promise.resolve(FavoriteCache.storedFavNumber);
    }

}
