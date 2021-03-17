import { Settings } from "../../components/RE6Module";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class CommentTracker extends SubscriptionTracker {

    public getDefaultSettings(): Settings {
        return {
            ...super.getDefaultSettings(),

            cacheSize: 20,                  // how many subscription updates are kept
        };
    }


}
