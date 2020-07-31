import { E621 } from "../api/E621";
import { APIPost } from "../api/responses/APIPost";
import { Util } from "../utility/Util";
import { User } from "./User";

export class FavoriteCache {

    private static cache: Set<number>;

    private static getCache(): Set<number> {
        if (typeof FavoriteCache.cache === "undefined")
            FavoriteCache.cache = new Set<number>(JSON.parse(window.localStorage.getItem("re621.favcache.data") || "[]"))
        return FavoriteCache.cache;
    }

    private static save(): void {
        window.localStorage.setItem("re621.favcache.data", JSON.stringify(Array.from(FavoriteCache.getCache())));
    }

    public static clear(): void {
        FavoriteCache.cache = new Set();
        FavoriteCache.save();
    }

    public static size(): number {
        return FavoriteCache.getCache().size;
    }

    public static has(post: number): boolean {
        return FavoriteCache.getCache().has(post);
    }

    public static add(post: number): void {
        FavoriteCache.getCache().add(post);
        FavoriteCache.save();
    }

    public static remove(post: number): boolean {
        if (!FavoriteCache.has(post)) return false;
        FavoriteCache.getCache().delete(post);
        FavoriteCache.save();
        return true;
    }

    public static async sync(status: JQuery<HTMLElement>): Promise<number> {
        FavoriteCache.clear();
        let result: APIPost[] = [],
            page = 0;
        const totalPages = Math.ceil((await User.getCurrentSettings()).favorite_count / 320);

        do {
            page++;
            status.html(`<i class="fas fa-circle-notch fa-spin"></i> Processing favorites: batch ${page} / ${totalPages}`)
            result = await E621.Posts.get<APIPost>({ tags: `fav:${User.getUsername()} status:any`, page: page, limit: 320 }, 1000);
            for (const entry of result) FavoriteCache.add(entry.id);
        } while (result.length == 320);

        status.html(`<i class="far fa-check-circle"></i> Cache reloaded: ${FavoriteCache.size()} entries`);

        window.localStorage.setItem("re621.favcache.sync", Util.Time.now() + "")
        window.localStorage.setItem("re621.favcache.req", "false");

        return Promise.resolve(FavoriteCache.size());
    }

    public static getSyncTime(): number {
        return parseInt(window.localStorage.getItem("re621.favcache.sync")) || 0;
    }

    public static async isSyncRequired(): Promise<boolean> {
        if (FavoriteCache.getSyncTime() + Util.Time.DAY < Util.Time.now()) {
            const updateRequired = (await User.getCurrentSettings()).favorite_count !== FavoriteCache.size();
            window.localStorage.setItem("re621.favcache.req", updateRequired + "");
            window.localStorage.setItem("re621.favcache.sync", Util.Time.now() + "");
            return Promise.resolve(updateRequired);
        }
        return Promise.resolve(window.localStorage.getItem("re621.favcache.req") == "true");
    }

}
