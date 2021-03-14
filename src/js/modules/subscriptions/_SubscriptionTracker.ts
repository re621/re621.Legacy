import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { SubscriptionCache, UpdateContent, UpdateData } from "./_SubscriptionCache";
import { SubscriptionManager } from "./_SubscriptionManager";

export class SubscriptionTracker extends RE6Module {

    protected batchSize = 100;              // maximum number of subscribed entries per API request

    protected trackerID: string;            // used in several places as a unique identifier

    private tabbtn: JQuery<HTMLElement>;    // tab button corresponding to this tracker

    private ctwrap: JQuery<HTMLElement>;    // container for the canvas and the status
    private canvas: JQuery<HTMLElement>;    // canvas onto which the updates are drawn
    private status: JQuery<HTMLElement>;    // used to display status updates

    private cache: SubscriptionCache;       // object containing update data

    private updateInProgress = false;       // the tracker is currently fetching updates

    public constructor() {
        super();
        this.cache = new SubscriptionCache(this);

        this.trackerID = this.getSettingsTag().replace("Tracker", "") + "s";

        // Fires every minute, refreshes the timers and triggers an update if necessary
        SubscriptionManager.on("heartbeat." + this.trackerID, () => {
            if (this.isUpdateRequired()) this.update();
        });

        // Fires several times when the update is underway:
        // - when an update starts
        // - on every API call
        // - when the update ends
        SubscriptionManager.on("inprogress." + this.trackerID, (event, data) => {
            if (data) this.pushSettings("lastUpdate", Util.Time.now());
            this.pushSettings("lastAttempt", data ? 0 : Util.Time.now());
        });
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            // User-customizable settings
            updateInterval: Util.Time.DAY,  // how often an update event occurs
            cacheMaxAge: 0,                 // cache entries older than this get trimmed
            cacheSize: 10,                  // how many subscription updates are kept

            // Utility values
            lastUpdate: 0,                  // last time an update has been completed
            lastAttempt: 0,                 // last time an update was attempted. 0 if not applicable.
        }
    }

    /** Returns the unique identifier for this tracker */
    public getTrackerID(): string { return this.trackerID; }

    /** Determines whether subscription updates need to be fetched */
    private async isUpdateRequired(): Promise<boolean> {

        // This is redundant, since `lastAttempt` should catch the same thing,
        // but this prevents fetching fresh settings and thus speeds up the process.
        if (this.updateInProgress) return false;

        const time = await this.fetchSettings(["lastUpdate", "lastAttempt", "updateInterval"], true);
        const now = Util.Time.now();

        if (time.updateInterval == -1) return false;            // Tracker set to manual updates only
        if (time.lastAttempt !== 0)                             // Either updating in another tab, or previous update failed
            return now - time.lastAttempt >= 5 * Util.Time.MINUTE;

        return now - time.lastUpdate >= time.updateInterval;    // Interval has elapsed
    }

    /** Returns the tab button corresponding to this tracker */
    public getOutputTab(): JQuery<HTMLElement> {
        if (this.tabbtn !== undefined) return this.tabbtn;

        this.tabbtn = $("<a>")
            .attr({
                loading: false,
                updates: 0,
            })
            .html(this.getTrackerID())
            .on("re621:update", () => {
                const ctwrap = this.getOutputContainer();
                this.tabbtn.attr({
                    loading: ctwrap.attr("state") == TrackerState.Load,
                    updates: ctwrap.children().length,
                });
                this.ctwrap.parents("tabbed").trigger("re621:update");
            });

        return this.tabbtn;
    }

    /** Returns the wrapper containing the canvas and status output */
    public getOutputContainer(): JQuery<HTMLElement> {
        if (this.ctwrap !== undefined) return this.ctwrap;

        this.ctwrap = $("<sb-ctwrap>")
            .attr({
                content: this.getTrackerID().toLowerCase(),
                state: TrackerState.Init,
            });

        this.canvas = $("<sb-canvas>")
            .appendTo(this.ctwrap);
        this.status = $("<sb-status>")
            .appendTo(this.ctwrap);

        this.writeStatus(". . . Initializing");

        return this.ctwrap;
    }

    /**
     * Calls the API and fetches the updated entries for this tracker.  
     * This method **must** be overridden by the child class.  
     * Only used within the cache's `fetch()` method.
     */
    public async fetchUpdatedEntries(): Promise<UpdateData> {
        return Promise.resolve({});
    }

    /** Sets up and executes a subscription update */
    public async update(): Promise<void> {
        this.ctwrap
            .attr("state", TrackerState.Load)
            .trigger("re621:update");
        this.updateInProgress = true;
        SubscriptionManager.trigger("inprogress." + this.trackerID);

        await this.cache.fetch();

        SubscriptionManager.trigger("inprogress." + this.trackerID, true);
        this.updateInProgress = false;
    }

    /** Outputs the items currently in cache onto the canvas */
    public async draw(): Promise<void> {

        // Debug only
        this.ctwrap
            .attr("state", TrackerState.Load)
            .trigger("re621:update");
        await this.cache.fetch();

        this.canvas.html("");
        this.ctwrap.attr("state", TrackerState.Draw);
        this.cache.forEach((data, timestamp) => {
            this.canvas.append(this.drawUpdateEntry(data, timestamp));
        });
        this.ctwrap
            .attr("state", TrackerState.Done)
            .trigger("re621:update");

    }

    /**
     * Takes in the update data, and returns an HTML object that will be drawn onto the canvas.  
     * This method **must** be overridden by the child class.  
     * @param data Subscription update data
     * @param timestamp Update timestamp
     * @returns JQuery HTML object based on provided data
     */
    protected drawUpdateEntry(data: UpdateContent, timestamp: number): JQuery<HTMLElement> {
        return $(`<subitem>post #${data.uid} (${timestamp}</subitem>`);
    }

    /** Clears the status screen of all entries */
    protected clearStatus(): void {
        this.status.html("");
    }

    /** Adds a status message to the list */
    protected writeStatus(text: string): JQuery<HTMLElement> {
        return $("<div>").html(text).appendTo(this.status);
    }

}

enum TrackerState {
    Init = "init",
    Load = "load",
    Draw = "draw",
    Done = "done",
}
