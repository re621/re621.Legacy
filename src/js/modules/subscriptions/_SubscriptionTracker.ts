import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { SubscriptionCache, UpdateContent, UpdateData } from "./_SubscriptionCache";

export class SubscriptionTracker extends RE6Module {

    protected batchSize = 100;

    private tabTitle: string;
    private canvas: JQuery<HTMLElement>;

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

    public getCanvas(): JQuery<HTMLElement> {
        if (this.canvas !== undefined) return this.canvas;
        this.canvas = $("<subscription-canvas>")
            .attr("content-type", this.getTabTitle().toLowerCase())
            .html("Loading . . .");
        return this.canvas;
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
        await this.cache.fetch();

        this.canvas.html("");
        this.cache.forEach((data, timestamp) => {
            this.canvas.append(this.drawUpdateEntry(data, timestamp));
        });

    }

    protected drawUpdateEntry(data: UpdateContent, timestamp: number): JQuery<HTMLElement> {
        return $(`<subitem>post #${data.uid} (${timestamp}</subitem>`);
    }

}
