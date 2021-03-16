import { XM } from "../../components/api/XM";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
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

    private sblist: JQuery<HTMLElement>;    // displays a list of subscribed items
    private sbadge: JQuery<HTMLElement>;    // displays the total number of subscribed items

    protected cache: SubscriptionCache;     // object containing update data

    private updateInProgress = false;       // the tracker is currently fetching updates

    public constructor() {
        super();
        this.cache = new SubscriptionCache(this);

        this.trackerID = this.getSettingsTag().replace("Tracker", "") + "s";

        // Fires every minute, refreshes the timers and triggers an update if necessary
        SubscriptionManager.on("heartbeat." + this.trackerID, async () => {
            Debug.log(`Sub[${this.trackerID}]: heartbeat`, await this.isUpdateRequired());
            if (await this.isUpdateRequired())
                await this.update();
        });

        // Fires several times when the update is underway
        // - when an update starts
        // - on every API call
        // - when the update ends
        // Receives data through the event - if set to `true`,
        // the update is considered concluded, and update timer is set.
        SubscriptionManager.on("inprogress." + this.trackerID, (event, isUpdateFinished) => {
            if (isUpdateFinished) this.pushSettings("lastUpdate", Util.Time.now());
            this.pushSettings("lastAttempt", isUpdateFinished ? 0 : Util.Time.now());
        });

        // Fires whenever the number of entries changes
        // - when a subscription update starts and ends
        // - when the user deletes a post from cache
        SubscriptionManager.on("attributes." + this.trackerID, () => {
            const ctwrap = this.getOutputContainer();

            ctwrap.attr({
                posts: this.canvas.find("subitem").length,
                added: this.canvas.find("subitem[new]").length,
            });

            this.tabbtn.attr({
                loading: ctwrap.attr("state") == TrackerState.Load,
                updates: this.canvas.find("subitem[new=true]").length,
            });

            SubscriptionManager.trigger("notification")
        });

        // Fires when the user sees the tracker's canvas
        // Receives data through the event as a boolean value.
        // True means that the user opened the page, false that they closed it
        SubscriptionManager.on("intersect." + this.trackerID, async (event, isIntersecting) => {

            // Just in case the wrapper does not exist yet, somehow
            this.getOutputContainer();

            for (const el of this.canvas.find("subitem").get()) {
                const $el = $(el);
                if (isIntersecting && $el.attr("new") == "true") $el.attr("new", "maybe");
                else if ($el.attr("new") == "maybe")
                    $el.removeAttr("new");
            }

            if (isIntersecting) this.cache.purgeNew();

            await Util.sleep(500);
            SubscriptionManager.trigger("attributes." + this.trackerID);
        });

        // Fires when the tracker updates in another tab
        XM.Storage.addListener(
            "re621." + this.getSettingsTag() + ".cache",
            async (name, oldValue, newValue, remote) => {
                console.log(name, oldValue, newValue, remote);
                if (!remote) return;
                Debug.log(`Sub[${this.trackerID}]: Cache Updated`);
                await this.cache.load();
                this.draw();
            }
        )
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            // Legacy storage medium
            data: "{}",

            // User-customizable settings
            updateInterval: Util.Time.MINUTE, //Util.Time.DAY,  // how often an update event occurs
            cacheMaxAge: 0,                 // cache entries older than this get trimmed
            cacheSize: 60,                  // how many subscription updates are kept

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
            .addClass("notification")
            .html(this.getTrackerID());

        return this.tabbtn;
    }

    /** Returns the wrapper containing the canvas and status output */
    public getOutputContainer(): JQuery<HTMLElement> {
        if (this.ctwrap !== undefined) return this.ctwrap;

        this.ctwrap = $("<sb-ctwrap>")
            .attr({
                content: this.getTrackerID(),
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
     * Returns the actual canvas element corresponding to this tracker.  
     * Should not normally be used - this is only here for the benefit of
     * the IntersectionObserver, since viewing the wrapper can cause issues
     * @returns JQuery DOM object
     */
    public getCanvasElement(): JQuery<HTMLElement> {
        if (this.canvas == undefined) this.getOutputContainer();
        return this.canvas;
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
        this.ctwrap.attr("state", TrackerState.Load);
        SubscriptionManager.trigger("attributes." + this.trackerID);
        this.updateInProgress = true;
        SubscriptionManager.trigger("inprogress." + this.trackerID);

        await this.cache.fetch();

        this.updateInProgress = false;
        SubscriptionManager.trigger("inprogress." + this.trackerID, true);
        await this.draw();
    }

    /** Outputs the items currently in cache onto the canvas */
    public async draw(): Promise<void> {
        this.canvas.html("");
        this.ctwrap.attr({ state: TrackerState.Draw });
        SubscriptionManager.trigger("attributes." + this.trackerID);

        this.canvas.append(this.drawNewUpdatesDivider());
        this.cache.forEach((data, timestamp) => {
            this.canvas.append(this.drawUpdateEntry(data, timestamp, (timestamp, result) => {
                this.cache.deleteItem(timestamp);
                result.remove();
                Debug.log(`Sub${this.trackerID}: Deleting ${timestamp}`);
                SubscriptionManager.trigger("attributes." + this.trackerID);
            }));
        });

        this.ctwrap.attr({ state: TrackerState.Done });
        SubscriptionManager.trigger("attributes." + this.trackerID);
    }

    /** Clears all update entries from cache */
    public async clear(): Promise<void> {
        await this.cache.clear();
        this.canvas.html("");
        this.ctwrap.attr({ state: TrackerState.Done });
        SubscriptionManager.trigger("attributes." + this.trackerID);
    }

    /**
     * Takes in the update data, and returns an HTML object that will be drawn onto the canvas.  
     * This method **must** be overridden by the child class.  
     * @param data Subscription update data
     * @param timestamp Update timestamp
     * @returns JQuery DOM object based on provided data
     */
    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction: DeleteEntryFunction): JQuery<HTMLElement> {
        const result = $(`<subitem>post #${data.uid} (${timestamp})</subitem>`);
        deleteFunction(timestamp, result);
        return result;
    }

    /**
     * Returns a divider that splits older updates from ones just added
     * @returns JQuery DOM object
     */
    protected drawNewUpdatesDivider(): JQuery<HTMLElement> {
        return $("<subdivider>Older Updates</subdivider>");
    }

    /** Clears the status screen of all entries */
    protected clearStatus(): void {
        this.status.html("");
    }

    /** Adds a status message to the list */
    protected writeStatus(text: string): JQuery<HTMLElement> {
        return $("<div>").html(text).appendTo(this.status);
    }

    /**
     * Outputs a list of items to which the user is currently subscribed.  
     * Note that this reads the subscriptions currently loaded into memory,
     * not taking into account changes made in other tabs.
     */
    public getSubscriptionList(): JQuery<HTMLElement> {
        if (this.sblist !== undefined) return this.sblist;

        const sbcont = $("<sb-encont>");
        const search = $("<input>")
            .addClass("sb-enfind")
            .attr({
                placeholder: "Search",
            })
            .on("input", () => {
                const value = search.val() + "";
                if (value == "") {
                    this.sblist.find("sb-enitem").each((index, el) => {
                        $(el).removeClass("display-none");
                    });
                } else {
                    this.sblist.find("sb-enitem").each((index, el) => {
                        $(el).addClass("display-none");
                    });
                    this.sblist.find(`sb-enitem[content*="${value}"]`).removeClass("display-none");
                }
            });

        this.sblist = $("<sb-enwrap>")
            .attr("content", this.trackerID)
            .append(search)
            .append(sbcont)
            .on("re621:update", () => {
                sbcont.html("");
                const subscriptions = this.fetchSettings<SubscriptionList>("data") || {};
                for (const [name, value] of Object.entries(subscriptions))
                    this.formatSubscriptionListEntry(name, value, (name: string) => {
                        console.log("Unsubscribing from", name);
                    }).appendTo(sbcont);
            });

        this.sblist.trigger("re621:update");

        return this.sblist;
    }

    /** Creates and returns an entry for the subscription list */
    protected formatSubscriptionListEntry(id: string, value: any, unsub: SubscribeFunction): JQuery<HTMLElement> {
        const result = $("<sb-enitem>")
            .attr({ content: id + (value.text ? value.text : ""), })
            .html(value.text ? value.text : id);

        $("<a>")
            .addClass("sb-unsub")
            .html(`<i class="fas fa-times"></i>`)
            .attr({ "title": "Unsubscribe", })
            .prependTo(result)
            .on("click", (event) => {
                event.preventDefault();
                unsub(id);
            });

        return result;
    }

    /**
     * REturns the 
     */
    public getSubscriptionBadge(): JQuery<HTMLElement> {
        if (this.sbadge !== undefined) return this.sbadge;

        this.sbadge = $("<sb-badge>").html("0").on("re621:update", () => {

            console.log(this.fetchSettings<SubscriptionList>("data"));
            this.sbadge.html(Object.keys(this.fetchSettings<SubscriptionList>("data") || {}).length + "");
        });
        console.log(this.sbadge);
        this.sbadge.trigger("re621:update");

        return this.sbadge;
    }

}

enum TrackerState {
    Init = "init",
    Load = "load",
    Draw = "draw",
    Done = "done",
}

type DeleteEntryFunction = (timestamp: number, result: JQuery<HTMLElement>) => void;
type SubscribeFunction = (name: string) => void;
type SubscriptionList = {
    [name: string]: {
        text?: string;
        data?: any;
    };
}
