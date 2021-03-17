import { Settings } from "../../components/RE6Module";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class ForumTracker extends SubscriptionTracker {

    public getDefaultSettings(): Settings {
        return {
            ...super.getDefaultSettings(),

            cacheSize: 20,                  // how many subscription updates are kept
        };
    }

}
