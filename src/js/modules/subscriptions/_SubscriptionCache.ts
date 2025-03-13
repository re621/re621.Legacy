import { XM } from "../../components/api/XM";
import { Util } from "../../components/utility/Util";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

/** Handles the loading and caching of the subscription update data */
export class SubscriptionCache {

    // Instance of the tracker this cache belongs to
    // Needs to be here because fetching data is different between trackers
    private tracker: SubscriptionTracker;

    private storageTag: string;

    private extraTag: string;

    // Data cache, and an index of timestamps for quicker sorting
    private data: UpdateData;

    private index: number[];

    public constructor (tracker: SubscriptionTracker) {
        this.tracker = tracker;
        this.storageTag = "re621." + tracker.getSettingsTag() + ".cache";
        this.extraTag = "re621." + tracker.getSettingsTag() + ".extra";

        this.data = {};
        this.index = [];
    }

    public async init (): Promise<void> {
        // Cache isn't expected to be backwards compatible. Just delete it if the version differs.
        if (!await SubscriptionManager.isCacheValid()) {
            Util.LS.setItem(this.storageTag, "{}");
            Util.LS.setItem(this.extraTag, "{}");
        }

        this.load();
    }

    /** Loads the cache from local storage */
    public async load (): Promise<boolean> {
        try { this.data = JSON.parse(Util.LS.getItem(this.storageTag) || "{}"); } catch (error) {
            await this.clear();
            return Promise.resolve(false);
        }
        this.updateIndex();
        return Promise.resolve(true);
    }

    /** Saves update cache to storage */
    public async save (): Promise<boolean> {
        Util.LS.setItem(this.storageTag, JSON.stringify(this.data));
        return XM.Storage.setValue(this.storageTag, Util.Time.now());
    }

    /** Irreversibly clears the update cache */
    public async clear (): Promise<boolean> {
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
    public async fetch (): Promise<boolean> {
        const updates = await this.tracker.fetchUpdatedEntries();
        // console.log(`Sub${this.tracker.getTrackerID()}: ${Object.keys(updates).length} new, ${this.index.length} total`);
        if (Object.keys(updates).length == 0) Promise.resolve(false);

        Object.keys(updates).forEach((key) => {
            this.data[key] = updates[key];
        });
        this.updateIndex();
        this.trim();
        return this.save();
    }

    /**
     * Returns an item corresponding to the provided timestamp
     * @param timestamp Timestamp to look for
     */
    public getItem (timestamp: number): UpdateContent {
        return this.data[timestamp];
    }

    /**
     * Removes an item with the provided timestamp from cache
     * @param timestamp Timestamp to look for
     */
    public async deleteItem (timestamp: number): Promise<boolean> {
        const el = this.index.indexOf(timestamp);
        console.log("locating", timestamp, el);
        if (el == -1) return false;

        delete this.data[timestamp];
        this.updateIndex();
        return this.save();
    }

    /** Returns the number of items in cache */
    public count (): number {
        return this.index.length;
    }

    /** Strips all `new` entries of that status */
    public async purgeNew (): Promise<boolean> {
        for (const timestamp of this.index)
            delete this.data[timestamp].new;
        return this.save();
    }

    /** Re-creates the timestamp index from the stored data */
    private updateIndex (): void {
        this.index = Object.keys(this.data)
            .map(x => parseInt(x))
            .sort((a, b) => b - a); // newest to oldest
    }

    /**
     * Processes the cache, removing duplicate entries and trimming to match the maximum size.
     * Note that this method presumes that the cache index is already up to date.
     */
    private trim (): void {
        const params = this.tracker.fetchSettings(["cacheMaxAge", "cacheSize"]);

        // If cacheMaxAge is set to never, its value is 0
        const ageLimit = params.cacheMaxAge === 0 ? 0 : Util.Time.now() - params.cacheMaxAge;

        const uniqueKeys = new Set();
        const uniqueParentKeys = new Set();
        this.index.forEach((timestamp) => {
            const update: UpdateContent = this.data[timestamp];

            // Remove expired updates
            if (timestamp < ageLimit && !update.new) {
                delete this.data[timestamp];
                return;
            }

            // Remove all non-unique updates
            // Forum posts may get replies all the time, only the recent one is important
            if (uniqueKeys.has(update.uid))
                delete this.data[timestamp];
            else uniqueKeys.add(update.uid);

            // Remove entries with non-unique parent keys
            // This is mainly used for the comment tracker
            if (update.par) {
                if (uniqueParentKeys.has(update.par))
                    delete this.data[timestamp];
                else uniqueParentKeys.add(update.par);
            }

        });

        // Re-index the updated data
        this.updateIndex();

        // Trims the index to cacheSize, then removes the unwanted items from the data
        const chunks = Util.chunkArray(this.index, params.cacheSize, "split");
        this.index = chunks[0];
        chunks[1].forEach((entry: number) => { delete this.data[entry]; });
    }

    /**
     * Executes the provided function on every element in the cache.
     * If the function returns a value, said value will be assigned to the corresponding element.
     * @param fn Function to execute
     */
    public forEach (fn: (data: UpdateContent, timestamp: number) => void | UpdateContent): void {
        this.index.forEach((timestamp) => {
            const result = fn(this.data[timestamp], timestamp);
            if (typeof result !== "undefined") this.data[timestamp] = result;
        });
    }

}

export interface UpdateData {
    [timestamp: number]: UpdateContent;
}

export interface UpdateContent {
    uid: number;        // unique ID of the update entry
    md5?: string;       // md5 hash of the image, if available
    ext?: string;       // any extraneous information that needs to be stored
    par?: number;       // unique ID of the parent element, if available

    new?: boolean;
}
