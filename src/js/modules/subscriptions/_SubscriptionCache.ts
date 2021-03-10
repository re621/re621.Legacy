import { XM } from "../../components/api/XM";
import { Util } from "../../components/utility/Util";
import { SubscriptionTracker } from "./_SubscriptionTracker";

/** Handles the loading and caching of the subscription update data */
export class SubscriptionCache {

    // Hard-coded cache version. If the stored value is different from this, the cache gets cleared
    private static cacheVersion = 3;
    private static cacheValid = false;

    // Instance of the tracker this cache belongs to
    // Needs to be here because fetching data is different between trackers
    private tracker: SubscriptionTracker;
    private storageTag: string;

    // Data cache, and an index of timestamps for quicker sorting
    private data: UpdateData;
    private index: number[];

    public constructor(tracker: SubscriptionTracker) {
        this.tracker = tracker;
        this.storageTag = "re621." + tracker.getSettingsTag() + ".cache";

        this.data = {}
        this.index = [];

        if (!SubscriptionCache.cacheValid) Util.LS.setItem(this.storageTag, "{}");
    }

    /** Loads the cache from local storage */
    private async load(): Promise<boolean> {
        try { this.data = JSON.parse(Util.LS.getItem(this.storageTag) || "{}"); }
        catch (error) {
            await this.clear();
            return Promise.resolve(false);
        }
        this.updateIndex();
        return Promise.resolve(true)
    }

    /** Saves update cache to storage */
    private async save(): Promise<boolean> {
        Util.LS.setItem(this.storageTag, JSON.stringify(this.data));
        return XM.Storage.setValue(this.storageTag, Util.Time.now());
    }

    /** Irreversibly clears the update cache */
    private async clear(): Promise<boolean> {
        this.data = {};
        this.index = [];
        return this.save();
    }

    /**
     * Fetches update data from the parent instance's `getUpdatedEntries` method
     * and appends it to the cache. If changes were made, saves cache to file.
     * @param lastUpdate Timestamp of the previous update
     * @param status JQuery element to which status updates are to be appended
     * @returns True if changes have been made, false otherwise
     */
    public async fetch(): Promise<boolean> {
        const updates = await this.tracker.fetchUpdatedEntries();
        if (Object.keys(updates).length > 0) {
            Object.keys(updates).forEach((key) => {
                this.data[key] = updates[key];
            });
            this.updateIndex();
            this.trim();
            return this.save();
        }
        return Promise.resolve(false);
    }

    /** Re-creates the timestamp index from the stored data */
    private updateIndex(): void {
        this.index = Object.keys(this.data)
            .map(x => parseInt(x))
            .sort((a, b) => b - a); // newest to oldest
    }

    /**
     * Processes the cache, removing duplicate entries and trimming to match the maximum size.  
     * Note that this method presumes that the cache index is already up to date.  
     */
    private trim(): void {
        const params = this.tracker.fetchSettings(["cacheMaxAge", "cacheSize"]);

        // If cacheMaxAge is set to never, its value is 0
        const ageLimit = params.cacheMaxAge === 0 ? 0 : Util.Time.now() - params.cacheMaxAge;

        const uniqueKeys = [];
        this.index.forEach((timestamp) => {
            const update: UpdateContent = this.data[timestamp];

            // Remove expired updates
            if (timestamp < ageLimit && !update.new) {
                delete this.data[timestamp];
                return;
            }

            // Remove all non-unique updates
            // Forum posts may get replies all the time, only the recent one is important
            if (uniqueKeys.indexOf(update.uid) === -1)
                uniqueKeys.push(update.uid);
            else delete this.data[timestamp];

        });

        // Re-index the updated data
        this.updateIndex();

        // Trims the index to cacheSize, then removes the unwanted items from the data
        const chunks = Util.chunkArray(this.index, params.cacheSize, true);
        this.index = chunks[0];
        chunks[1].forEach((entry: number) => { delete this.data[entry]; })
    }

    /**
     * Executes the provided function on every element in the cache.  
     * If the function returns a value, said value will be assigned to the corresponding element.
     * @param fn Function to execute
     */
    public forEach(fn: (data: UpdateContent, timestamp: number) => void | UpdateContent): void {
        this.index.forEach((timestamp) => {
            const result = fn(this.data[timestamp], timestamp);
            if (typeof result !== "undefined") this.data[timestamp] = result;
        });
    }

    public static validateCacheVersion(): boolean {
        if (SubscriptionCache.cacheVersion == (parseInt(Util.LS.getItem("re621.SubscriptionManager.cacheVersion")) || 0)) SubscriptionCache.cacheValid = true;
        else Util.LS.setItem("re621.SubscriptionManager.cacheVersion", SubscriptionCache.cacheVersion + "");
        return SubscriptionCache.cacheValid;
    }

}

export interface UpdateData {
    [timestamp: number]: UpdateContent;
}

export interface UpdateContent {
    uid: number;
    md5?: string;
    ext?: string;

    new?: boolean;
}
