import { XM } from "../../components/api/XM";
import { Page } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { SubscriptionCache, UpdateContent, UpdateData } from "./_SubscriptionCache";
import { SubscriptionList } from "./_SubscriptionList";
import { SubscriptionManager } from "./_SubscriptionManager";

export class SubscriptionTracker extends RE6Module {

    // When should the tracker re-attempt an update if the previous one failed
    public static readonly attemptCooldown = 5 * Util.Time.MINUTE;

    protected batchSize = 100;              // maximum number of subscribed entries per API request

    protected buttonSelect: {               // defines which elements should receive
        minor?: SubscribeButtonSelector;    // subscription buttons, and on what pages
        major?: SubscribeButtonSelector;
    } = {};

    protected trackerID: string;            // used in several places as a unique identifier

    private tabbtn: JQuery<HTMLElement>;    // tab button corresponding to this tracker

    private ctwrap: JQuery<HTMLElement>;    // container for the canvas and the status
    private canvas: JQuery<HTMLElement>;    // canvas onto which the updates are drawn
    private status: JQuery<HTMLElement>;    // used to display status updates

    private sblist: JQuery<HTMLElement>;    // displays a list of subscribed items
    private sbadge: JQuery<HTMLElement>;    // displays the total number of subscribed items

    protected cache: SubscriptionCache;     // object containing update data
    protected slist: SubscriptionList;      // object containing subscribed items

    private updateInProgress = false;       // tracker is currently fetching updates
    private isVisible = false;              // notifications tab is currently open
    private networkOffline = false;         // unable to connect to the internet

    protected loadLargeThumbs = false;        // thumbnail resolution - sample / preview

    public constructor() {
        super();

        this.cache = new SubscriptionCache(this);
        this.slist = new SubscriptionList(this);

        this.trackerID = this.getSettingsTag().replace("Tracker", "") + "s";
    }

    /** Performs the initialization and setup of the tracker */
    public async init(): Promise<void> {
        await this.slist.fetchSubscriptions();

        // Fires every minute, refreshes the timers and triggers an update if necessary
        SubscriptionManager.on("heartbeat." + this.trackerID, async () => {
            // console.log(`Sub[${this.trackerID}]: heartbeat`, await this.isUpdateRequired());
            if (await this.isUpdateRequired())
                await this.update();
            SubscriptionManager.trigger("timer." + this.trackerID);
        });

        // Fires several times when the update is underway
        // Receives a status code through the event, corresponding to the following situations:
        // - 0: when an update starts
        // - 1: on every API call
        // - 2: when the update ends
        // - 3: if the update fails
        SubscriptionManager.on("inprogress." + this.trackerID, (event, statusCode) => {

            // console.log(`Sub[${this.trackerID}]: inprogress`, statusCode);
            if (statusCode == 2) this.pushSettings("lastUpdate", Util.Time.now());
            this.pushSettings("lastAttempt", statusCode == 2 ? 0 : Util.Time.now());

            // Skip the API calls to avoid timer spam
            if (statusCode != 1) SubscriptionManager.trigger("timer." + this.trackerID);
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

            this.isVisible = isIntersecting;

            // Just in case the wrapper does not exist yet, somehow
            this.getOutputContainer();

            for (const el of this.canvas.find("subitem").get()) {
                const $el = $(el);
                if (isIntersecting && $el.attr("new") == "true") $el.attr("new", "maybe");
                else if ($el.attr("new") == "maybe")
                    $el.removeAttr("new");
            }

            if (isIntersecting) {
                if (document.hasFocus() && parseInt(this.ctwrap.attr("added")) > 0)
                    this.cache.purgeNew();
                this.canvas.children("subitem").trigger("re621:render");
            } else this.canvas.children("subitem").trigger("re621:reset");

            await Util.sleep(500);
            SubscriptionManager.trigger("attributes." + this.trackerID);
        });

        // Fires when the tracker updates in another tab
        XM.Storage.addListener(
            "re621." + this.getSettingsTag() + ".cache",
            async (name, oldValue, newValue, remote) => {
                if (!remote) return;
                // console.log(`Sub[${this.trackerID}]: Cache Sync`);
                this.clearStatus();
                this.writeStatus("... synchronizing data");
                this.ctwrap.attr({ state: TrackerState.Sync });
                this.networkOffline = false;

                await Util.sleep(100);

                await this.cache.load();
                this.draw();

                // This is here to synchronize the timer if an update happened in another tab
                SubscriptionManager.trigger("timer." + this.trackerID);
            }
        )

        // Fires when the tracker settings update
        // Used to refresh the subscriptions list
        SubscriptionManager.on("listupdate." + this.trackerID, () => {
            this.getSubscriptionList().trigger("re621:update");
            this.getSubscriptionBadge().trigger("re621:update");
            $("a.subscribe-button-major, a.subscribe-button-minor").trigger("re621:update");
        });
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            // User-customizable settings
            updateInterval: Util.Time.HOUR, // how often an update event occurs
            cacheMaxAge: 0,                 // cache entries older than this get trimmed
            cacheSize: 50,                  // how many subscription updates are kept

            // Utility values
            lastUpdate: 0,                  // last time an update has been completed
            lastAttempt: 0,                 // last time an update was attempted. 0 if not applicable.
        }
    }

    /** Returns the unique identifier for this tracker */
    public getTrackerID(): string { return this.trackerID; }

    /** Returns the current network status */
    public isNetworkOffline(): boolean { return this.networkOffline; }

    /** Returns true if the update is currently in progress */
    public isUpdateInProgress(): boolean { return this.updateInProgress; }

    /** Determines whether subscription updates need to be fetched */
    private async isUpdateRequired(): Promise<boolean> {

        // This is redundant, since `lastAttempt` should catch the same thing,
        // but this prevents fetching fresh settings and thus speeds up the process.
        if (this.updateInProgress) return false;

        const time = await this.fetchSettings(["lastUpdate", "lastAttempt", "updateInterval"], true);
        const now = Util.Time.now();

        if (time.updateInterval == -1) return false;            // Tracker set to manual updates only
        if (time.lastAttempt !== 0)                             // Either updating in another tab, or previous update failed
            return now - time.lastAttempt >= SubscriptionTracker.attemptCooldown;

        return now - time.lastUpdate >= time.updateInterval;    // Interval has elapsed
    }

    /** Append sub / unsub buttons to pages */
    public appendSubscribeButton(): void {

        if (this.buttonSelect.minor && Page.matches(this.buttonSelect.minor.regex)) {
            for (const el of $(this.buttonSelect.minor.selector).get()) {
                const $el = $(el);
                this.createSubscribeMinorButton(
                    this.fetchMinorSubscriptionName($el),
                    (id) => { this.slist.subscribe(id); },
                    (id) => { this.slist.unsubscribe(id); }
                ).appendTo($el);
            }
        }

        if (this.buttonSelect.major && Page.matches(this.buttonSelect.major.regex)) {
            for (const el of $(this.buttonSelect.major.selector).get()) {
                const $el = $(el);
                this.createSubscribeMajorButton(
                    this.fetchMajorSubscriptionName($el),
                    (id) => { this.slist.subscribe(id); },
                    (id) => { this.slist.unsubscribe(id); }
                ).appendTo($el);
            }
        }
    }

    /** Generated and return a styled sub / unsub button */
    protected createSubscribeMinorButton(id: string, subscribe: SubscribeFunction, unsubscribe: SubscribeFunction): JQuery<HTMLElement> {
        const result = $("<a>")
            .attr("name", id)
            .addClass("subscribe-button-minor")
            .on("click", (event) => {
                event.preventDefault();
                if (result.attr("subscribed") == "true")
                    unsubscribe(result.attr("name"));
                else subscribe(result.attr("name"));

            })
            .on("re621:update", () => {
                result.attr("subscribed", this.slist.isSubscribed(id) + "");
            });
        result.trigger("re621:update");
        return result;
    }

    /**
     * Takes in the parent element defined in `buttonSelect` and returns the corresponding subscription ID.  
     * Needless to say, this has to be overridden by the child class
     * @param parent Parent element
     * @returns Subscription name, as a string
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected fetchMinorSubscriptionName(parent: JQuery<HTMLElement>): string {
        return "unknown";
    }

    /** Generated and return a styled sub / unsub button */
    protected createSubscribeMajorButton(id: string, subscribe: SubscribeFunction, unsubscribe: SubscribeFunction): JQuery<HTMLElement> {
        let eventLock = false;
        const result = $("<a>")
            .attr("name", id)
            .addClass("subscribe-button-major")
            .on("click", async (event) => {
                event.preventDefault();

                if (eventLock) return;
                eventLock = true;

                if (result.attr("subscribed") == "true")
                    unsubscribe(result.attr("name"));
                else subscribe(result.attr("name"));

                eventLock = false;
            })
            .on("re621:update", () => {
                const subscribed = this.slist.isSubscribed(id);
                result
                    .html(subscribed ? "Unsubscribe" : "Subscribe")
                    .attr("subscribed", subscribed + "");
            });
        result.trigger("re621:update");
        return result;
    }

    /**
     * Takes in the parent element defined in `buttonSelect` and returns the corresponding subscription ID.  
     * Needless to say, this has to be overridden by the child class
     * @param parent Parent element
     * @returns Subscription name, as a string
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected fetchMajorSubscriptionName(parent: JQuery<HTMLElement>): string {
        return "unknown";
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
        SubscriptionManager.trigger("inprogress." + this.trackerID, 0);

        if (ModuleController.fetchSettings(SubscriptionManager, "skipPreflightChecks") || await Util.Network.isOnline()) {
            this.execPreUpdate();
            await this.cache.fetch();
            this.execPostUpdate();
            this.networkOffline = false;
            this.updateInProgress = false;
            SubscriptionManager.trigger("inprogress." + this.trackerID, 2);
        } else {
            this.networkOffline = true;
            this.updateInProgress = false;
            SubscriptionManager.trigger("inprogress." + this.trackerID, 3);
        }

        await this.draw();
    }

    /** Executed just before the update runs */
    protected execPreUpdate(): void { return; }
    /** Executed just after the update runs */
    protected execPostUpdate(): void { return; }

    /** Outputs the items currently in cache onto the canvas */
    public async draw(): Promise<void> {

        // console.log(`Sub${this.trackerID}: Drawing ${this.cache.count()}`);

        // Reset the canvas to base state
        this.canvas.html("");
        this.ctwrap.attr({ state: TrackerState.Draw });
        SubscriptionManager.trigger("attributes." + this.trackerID);

        this.execPreDraw();
        // this.loadLargeThumbs = ModuleController.fetchSettings(BetterSearch, "imageLoadMethod") !== ImageLoadMethod.Disabled;
        this.canvas.append(this.drawNewUpdatesDivider());
        this.cache.forEach((data, timestamp) => {
            const entry = this.drawUpdateEntry(data, timestamp, (timestamp, result) => {
                this.cache.deleteItem(timestamp);
                result.remove();
                // console.log(`Sub${this.trackerID}: Deleting ${timestamp}`);
                SubscriptionManager.trigger("attributes." + this.trackerID);
            });

            if (!document.hasFocus() && this.isVisible)
                entry.trigger("re621:render");

            this.canvas.append(entry);
        });
        this.execPostDraw();

        this.ctwrap.attr({ state: TrackerState.Done });
        SubscriptionManager.trigger("attributes." + this.trackerID);
    }

    /** Executed just before the update runs */
    protected execPreDraw(): void { return; }
    /** Executed just after the update runs */
    protected execPostDraw(): void { return; }

    /** Clears all update entries from cache */
    public async clear(): Promise<void> {
        await this.cache.clear();

        this.slist.clearExtraData();
        this.slist.pushSubscriptions();

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction: DeleteEntryFunction): JQuery<HTMLElement> {
        const result = $(`<subitem uid="${data.uid}">post #${data.uid} (${timestamp})</subitem>`);
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
                const value = (search.val() + "").toLowerCase();
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
                let list = [];
                for (const name of this.slist.get())
                    list.push(this.formatSubscriptionListEntry(name, (this.slist.getExtraData(name) || {}), (name: string) => {
                        this.slist.unsubscribe(name);
                    }));

                list = list.sort((a, b) => {
                    return $(a).attr("sort").localeCompare($(b).attr("sort"));
                });
                sbcont.append(list);
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
            this.sbadge.html(this.slist.count() + "");
        });
        this.sbadge.trigger("re621:update");

        return this.sbadge;
    }

}

enum TrackerState {
    Init = "init",
    Load = "load",
    Sync = "sync",
    Draw = "draw",
    Done = "done",
}

type DeleteEntryFunction = (timestamp: number, result: JQuery<HTMLElement>) => void;
export type SubscribeFunction = (name: string) => void;

type SubscribeButtonSelector = {
    regex: RegExp | RegExp[];
    selector: string;
}
