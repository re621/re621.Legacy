import { Settings } from "../../components/RE6Module";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class PoolTracker extends SubscriptionTracker {

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            // User-customizable settings
            updateInterval: -1,
            cacheMaxAge: 0,                 // cache entries older than this get trimmed
            cacheSize: 60,                  // how many subscription updates are kept

            // Utility values
            lastUpdate: 0,                  // last time an update has been completed
            lastAttempt: 0,                 // last time an update was attempted. 0 if not applicable.
        }
    }

}
