import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { SubscriptionCache, UpdateContent, UpdateData } from "./_SubscriptionCache";

export class SubscriptionTracker extends RE6Module {

    protected batchSize = 100;

    private tabTitle: string;

    private tabbtn: JQuery<HTMLElement>;    // Tab button corresponding to this tracker

    private ctwrap: JQuery<HTMLElement>;    // Container for the canvas and the status
    private canvas: JQuery<HTMLElement>;    // Canvas onto which the updates are drawn
    private status: JQuery<HTMLElement>;    // Used to display status updates

    private cache: SubscriptionCache;

    public constructor() {
        super();
        this.cache = new SubscriptionCache(this);
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
            inProgress: false,              // true if an update is currently in progress
        }
    }

    public getOutputTab(): JQuery<HTMLElement> {
        if (this.tabbtn !== undefined) return this.tabbtn;

        this.tabbtn = $("<a>")
            .attr({
                loading: false,
                updates: 0,
            })
            .html(this.getTabTitle())
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

    public getOutputContainer(): JQuery<HTMLElement> {
        if (this.ctwrap !== undefined) return this.ctwrap;

        this.ctwrap = $("<sb-ctwrap>")
            .attr({
                content: this.getTabTitle().toLowerCase(),
                state: TrackerState.Init,
            });

        this.canvas = $("<sb-canvas>")
            .appendTo(this.ctwrap);
        this.status = $("<sb-status>")
            .appendTo(this.ctwrap);

        this.writeStatus(". . . Initializing");

        return this.ctwrap;
    }

    public getTabTitle(): string {
        if (!this.tabTitle)
            this.tabTitle = this.getSettingsTag().replace("Tracker", "") + "s"
        return this.tabTitle;
    }

    public async fetchUpdatedEntries(): Promise<UpdateData> {
        return Promise.resolve({});
    }

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

    protected drawUpdateEntry(data: UpdateContent, timestamp: number): JQuery<HTMLElement> {
        return $(`<subitem>post #${data.uid} (${timestamp}</subitem>`);
    }

    protected clearStatus(): void {
        this.status.html("");
    }

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
