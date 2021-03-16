import { XM } from "../../components/api/XM";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class SubscriptionList {

    private instance: SubscriptionTracker;
    private settingsTag: string;

    private subscriptions: Set<string>;

    public constructor(instance: SubscriptionTracker) {
        this.instance = instance;
        this.settingsTag = "re621." + instance.getSettingsTag() + ".list";

        this.subscriptions = new Set();

        XM.Storage.addListener(this.settingsTag, async () => {
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
        this.subscriptions = new Set(await XM.Storage.getValue(this.settingsTag, []));
    }

    /**
     * Saves the current list of subscriptions to storage.  
     * Take care to fetch the current subscriptions list first,
     * to avoid overwriting changes made in other tabs.
     */
    public async pushSubscriptions(): Promise<void> {
        await XM.Storage.setValue(this.settingsTag, Array.from(this.subscriptions));
    }

    /**
     * Returns the current list of subscriptions.  
     * This might not be equivalent to the stored lists
     */
    public get(): Set<string> {
        return this.subscriptions;
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
        return this.pushSubscriptions();
    }

}
