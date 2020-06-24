import { ModuleController } from "../../components/ModuleController";
import { RE6Module } from "../../components/RE6Module";
import { Util } from "../../components/structure/Util";
import { SubscriptionManager } from "./SubscriptionManager";

export interface Subscription extends RE6Module {

    /**
     * Parameter that contains various functions used to format subscription updates properly.  
     * @see UpdateActions
     */
    updateActions: UpdateActions;

    /**
     * Returns a display name of the Subscription, to be used in the selection tab.  
     * This may or may not be unique, and thus should not be used to differentiate subscription modules.  
     */
    getName(): string;

    // ===== Buttons =====

    /** Creates and returns a "subscribe" button */
    makeSubscribeButton(): JQuery<HTMLElement>;
    /** Creates and returns an "unsubscribe" button */
    makeUnsubscribeButton(): JQuery<HTMLElement>;

    /** Returns a set of elements to which subscribe / unsubscribe buttons should be attached. */
    getButtonAttachment(): JQuery<HTMLElement>;
    /** Insert the passed button to an attachment point from `getButtonAttachment()` */
    insertButton($attachment: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void;

    /**
     * Returns an subscription ID (i.e. pool_id), derived from an element on the page
     * @param $element attachment point from `getButtonAttachment()`
     */
    getSubscriberId($element: JQuery<HTMLElement>): string;

    /**
     * Returns an subscription name (i.e. pool name), derived from an element on the page
     * @param $element attachment point from `getButtonAttachment()`
     */
    getSubscriberName($element: JQuery<HTMLElement>): string;

    // ===== Updates =====

    /**
     * The maximum size of an API request batch.  
     * For subscriptions that are retrieved via numeric ID, this value is probably 100.  
     * For those that are retrieved by a string name, this value is (likely) set to 40.  
     */
    subBatchSize: number;

    /**
     * Returns the update cache for this subscription module
     */
    getCache(): UpdateCache;

    /**
     * Returns all entries which are considered to be updated,
     * i.e the api update date is larger than the last updated date
     * @param lastUpdate Timestamp of the previous update
     * @param status JQuery element to which status updates are to be appended
     */
    getUpdatedEntries(lastUpdate: number, status: JQuery<HTMLElement>): Promise<UpdateData>;

}

export interface UpdateActions {
    // What link should be opened when you click on the image? Leave empty for no action
    imageHref?: (data: UpdateContent) => string;
    // Image link which should be displayed on the left side of the entry
    imageSrc: (data: UpdateContent) => string;
    // Should the image be hidden, if it triggers the error event?
    imageRemoveOnError?: boolean;
    // Link to get to the update
    updateHref?: (data: UpdateContent) => string;
    // Text for the updatelink
    updateText: (data: UpdateContent) => string;
    // Text to display when clicking on sourceLink
    sourceHref?: (data: UpdateContent) => string;
    // Link to where the "first page" of the subscription
    sourceText: (data: UpdateContent) => string;
}

/** Handles the storage and organization of update cache */
export class UpdateCache {

    private instance: Subscription;

    private data: UpdateData;
    private index: number[];

    private lastUpdate: number;

    /**
     * Create a new UpdateCache for the specificed subscription
     * @param instance Subscription instance
     */
    public constructor(instance: Subscription) {
        this.instance = instance;
        this.data = {};
        this.updateIndex();
    }

    /** Refreshes update cache from stored data */
    public async load(): Promise<boolean> {
        this.data = await this.instance.fetchSettings("cache", true);
        this.lastUpdate = await this.instance.fetchSettings("cacheTimestamp", true);
        this.updateIndex();
        if (!this.lastUpdate) {
            const now = Util.getTime();
            this.lastUpdate = now;
            await this.instance.pushSettings("cacheTimestamp", now);
        }
        return Promise.resolve(true);
    }

    /**
     * Same as `load()`, but gets data from the cache instead of remote storage.  
     * Should only be used on first load, as that data is guaranteed to be up to date.
     */
    public loadSync(): void {
        this.data = this.instance.fetchSettings("cache");
        this.lastUpdate = this.instance.fetchSettings("cacheTimestamp");
        this.updateIndex();
        if (!this.lastUpdate) {
            const now = Util.getTime();
            this.lastUpdate = now;
            this.instance.pushSettings("cacheTimestamp", now);
        }
    }

    /** Saves update cache to storage */
    public async save(): Promise<boolean> {
        const now = Util.getTime();
        await this.instance.pushSettings("cache", this.data);
        await this.instance.pushSettings("cacheTimestamp", now);
        this.lastUpdate = now;
        return Promise.resolve(true);
    }

    /** Irreversibly clears the update cache */
    public async clear(): Promise<boolean> {
        this.data = {};
        this.updateIndex();
        return this.save();
    }

    /**
     * Checks the stored cache timestamp against the remote cache.  
     * Returns true if the remote cache is newer, false otherwise
     */
    public async isOutdated(): Promise<boolean> {
        const remoteUpdate = await this.instance.fetchSettingsGently("cacheTimestamp");
        return Promise.resolve(this.lastUpdate < remoteUpdate);
    }

    /**
     * Returns the sorted index of cache's timestamps.  
     * Items are sorted in descending order (newest first).  
     */
    public getIndex(): number[] {
        return this.index;
    }

    /** Returns cache's current size */
    public getSize(): number {
        return this.index.length;
    }

    /**
     * Returns an item corresponding to the provided timestamp
     * @param timestamp Timestamp to look for
     */
    public getItem(timestamp: number): UpdateContent {
        return this.data[timestamp];
    }

    /**
     * Removes an item with the provded timestamp from cache
     * @param timestamp Timestamp to look for
     */
    public deleteItem(timestamp: number): void {
        const el = this.index.indexOf(timestamp);
        if (el !== -1) {
            this.index.splice(el, 1);
            delete this.data[timestamp];
        }
        this.lastUpdate = Util.getTime();
    }

    /**
     * Adds new data to cache.  
     * Note that all updates added through this method are flagged as "new".
     * @param newData Data to add to cache
     */
    public push(newData: UpdateData): void {
        Object.keys(newData).forEach((key) => {
            this.data[key] = newData[key];
        });
        this.updateIndex();
        this.trim();
        this.lastUpdate = Util.getTime();
    }

    /**
     * Refreshes the cache index.  
     * Should be executed every time an item is added to or removed from cache
     */
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
        const manager = ModuleController.get(SubscriptionManager),
            params = manager.fetchSettings(["cacheMaxAge", "cacheSize"]);    // TODO Make this async

        // If cacheMaxAge is set to never, its value is 0
        const ageLimit = params.cacheMaxAge === 0 ? 0 : new Date().getTime() - params.cacheMaxAge;

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
            if (uniqueKeys.indexOf(update.id) === -1)
                uniqueKeys.push(update.id);
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
    public forEach(fn: (n: UpdateContent) => void | UpdateContent): void {
        this.index.forEach((entry) => {
            const result = fn(this.data[entry]);
            if (typeof result !== "undefined") {
                this.data[entry] = result;
                this.lastUpdate = Util.getTime();
            }
        });
    }
}

/** Container for multiple `UpdateContent` entries */
export interface UpdateData {
    [timestamp: number]: UpdateContent;
}

/** Contains data as it is passed from a subscription module or stored in cache */
export interface UpdateContent {
    /** Entry's unique ID. This can be forum_id, pool_id, etc.*/
    id: number;

    /** Name of the entry - topic title, pool name, etc */
    name: string;

    /** Extra text added to the name, but outside of the link */
    nameExtra?: string;

    /** MD5 hash of the related image */
    md5: string;

    /** Any extra information that needs to be passed to the manager */
    extra?: any;

    /** True for items that have been added by the latest update */
    new?: boolean;
}
