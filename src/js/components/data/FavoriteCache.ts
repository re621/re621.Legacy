
export class FavoriteCache {

    private static cache: Set<number> = new Set<number>(JSON.parse(window.localStorage.getItem("re621.favorites") || "[]"));

    private static save(): void {
        window.localStorage.setItem("re621.favorites", JSON.stringify(Array.from(FavoriteCache.cache)));
    }

    public static has(post: number): boolean {
        return FavoriteCache.cache.has(post);
    }

    public static add(post: number): void {
        FavoriteCache.cache.add(post);
        FavoriteCache.save();
    }

    public static remove(post: number): boolean {
        if (!FavoriteCache.has(post)) return false;
        FavoriteCache.cache.delete(post);
        FavoriteCache.save();
        return true;
    }

    public static size(): number {
        return FavoriteCache.cache.size;
    }

    public static clear(): void {
        FavoriteCache.cache = new Set();
        FavoriteCache.save();
    }

}
