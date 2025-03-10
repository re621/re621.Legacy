import { XM } from "../../components/api/XM";
import { Util } from "../../components/utility/Util";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class SubscriptionList {

    private instance: SubscriptionTracker;

    private storageTag: string;                 // XM // primary storage for subscriptions
    private extraTag: string;                   // LS // subscription extra data

    private subscriptions: Set<string>;
    private extra: { [id: string]: ExtraData };

    public constructor(instance: SubscriptionTracker) {
        this.instance = instance;
        this.storageTag = "re621." + instance.getSettingsTag() + ".list";
        this.extraTag = "re621." + instance.getSettingsTag() + ".extra";

        this.subscriptions = new Set();
        this.extra = {};

        XM.Storage.addListener(this.storageTag, async () => {
            console.log(`Sub${this.instance.getTrackerID()}: List Update`);
            await this.fetchSubscriptions();
            SubscriptionManager.trigger("listupdate." + this.instance.getTrackerID());
        });
    }

    /**
     * Fetches the fresh list of subscriptions from storage.  
     * Note that due to its asynchronous nature, this method is not executed
     * in the constructor - it needs to be run separately after initialization
     */
    public async fetchSubscriptions(): Promise<void> {

        // This is the dumbest thing ever, but the event listener won't trigger
        // unless the data actually changes. So, an extraneous element is added
        // to the list every time subscriptions are saved, and get removed here
        let data: string[] = await XM.Storage.getValue(this.storageTag, []);

        // Fix for the weird issue hanekiwi was having - TM returns an object
        // instead of an array. Not 100% sure why, but this should fix it.
        if (!Array.isArray(data)) {
            XM.Storage.setValue(this.storageTag + ".backup", data);
            console.error("An error occurred while de-serializing subscriptions. Data has been recovered, but old values are still available on " + this.storageTag + ".backup");

            const recovery = Array.from(data);
            if (recovery.length != 0) data = recovery as string[];
            else if (data[0]) data = Object.values(data);
            else data = [];
        }

        // Push that bad boy back in, in case someone fucked with the settings
        // and removed the key. This will prevent them from losing data.
        const extracted = data.pop();
        if (extracted && !extracted.startsWith("re621:")) data.push(extracted);

        this.subscriptions = new Set(data);
        this.extra = JSON.parse(Util.LS.getItem(this.extraTag) || "{}");
    }

    /**
     * Saves the current list of subscriptions to storage.  
     * Take care to fetch the current subscriptions list first,
     * to avoid overwriting changes made in other tabs.
     */
    public async pushSubscriptions(): Promise<void> {
        Util.LS.setItem(this.extraTag, JSON.stringify(this.extra));

        // See `fetchSubscriptions()` for an explanation
        const data = Array.from(this.subscriptions);
        data.push("re621:" + Util.ID.rand());
        await XM.Storage.setValue(this.storageTag, data);
    }

    /**
     * Returns the current list of subscriptions.  
     * This might not be equivalent to the stored lists
     */
    public get(): Set<string> {
        return this.subscriptions;
    }

    /**
     * Returns the settings tag used for subscription storage
     * @returns Storage tag, as string
     */
    public getStorageTag(): string {
        return this.storageTag;
    }

    /** Returns the number of subscribed items */
    public count(): number {
        return this.subscriptions.size;
    }

    /**
     * Returns true if the user is subscribed to the specified item.  
     * Note that this might not be correct due to changes in other tabs.
     * @param id Item to check for
     */
    public isSubscribed(id: string): boolean {
        return this.subscriptions.has(id);
    }

    /** Adds the provided item to the list of subscriptions */
    public async subscribe(id: string): Promise<void> {
        this.subscriptions.add(id);
        return this.pushSubscriptions();
    }

    /** Deletes the provided item from the list of subscriptions */
    public async unsubscribe(id: string): Promise<void> {
        this.subscriptions.delete(id);
        delete this.extra[id];
        return this.pushSubscriptions();
    }

    public getExtraData(name: string): ExtraData {
        return this.extra[name];
    }

    public addExtraData(uid: string, data: ExtraData): void {
        this.extra[uid] = data;
    }

    public deleteExtraData(name: string): void {
        delete this.extra[name];
    }

    public clearExtraData(): void {
        this.extra = {};
    }

}

type ExtraData = {
    name?: string;
    data?: string;
    last?: number;
    lastSeen?: number;
    numBehind?: number;
}
