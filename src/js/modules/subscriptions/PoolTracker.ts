import { E621 } from "../../components/api/E621";
import { APIPool } from "../../components/api/responses/APIPool";
import { APIPost } from "../../components/api/responses/APIPost";
import { Page, PageDefinition } from "../../components/data/Page";
import { Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { UpdateContent, UpdateData } from "./_SubscriptionCache";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class PoolTracker extends SubscriptionTracker {

    protected buttonSelect = {
        major: {
            regex: [PageDefinition.pool],
            selector: "#c-pools > #a-show > h2:first",
        }
    };

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            // User-customizable settings
            updateInterval: -1,
            cacheMaxAge: 0,                 // cache entries older than this get trimmed
            cacheSize: 20,                  // how many subscription updates are kept

            // Utility values
            lastUpdate: 0,                  // last time an update has been completed
            lastAttempt: 0,                 // last time an update was attempted. 0 if not applicable.
        }
    }

    protected fetchMajorSubscriptionName(): string {
        return Page.getPageID();
    }

    public async fetchUpdatedEntries(): Promise<UpdateData> {

        const result: UpdateData = {};
        this.clearStatus();
        this.writeStatus("Updating Pool Subscriptions");

        // Fetching the list of subscriptions
        this.writeStatus(`. . . retrieving settings`);
        const subscriptions = this.slist.get();
        if (subscriptions.size == 0) return result;

        // Splitting subscriptions into batches and sending API requests
        this.writeStatus(`. . . sending an API request`);
        const subscriptionsChunks = Util.chunkArray(subscriptions, this.batchSize);
        const apiResponse: APIPool[] = [];

        for (const [index, chunk] of subscriptionsChunks.entries()) {

            // Processing batch #index
            if (subscriptionsChunks.length > 1) this.writeStatus(`&nbsp; &nbsp; &nbsp; - processing batch #${index}`);
            apiResponse.push(...await E621.Pools.get<APIPool>({ "search[id]": chunk.join(",") }, 500));

            // This should prevent the tracker from double-updating if the process takes more than 5 minutes
            // There are definitely users who are subscribed to enough tags to warrant this
            SubscriptionManager.trigger("inprogress." + this.trackerID);
        }

        // Parsing output, discarding irrelevant data
        this.writeStatus(`. . . formatting output`);
        for (const pool of apiResponse) {

            // Don't bother with empty pools
            const postCount = pool.post_count;
            if (postCount == 0) return;

            const poolExtra = this.slist.getExtraData(pool.id + "") || {};
            poolExtra.name = pool.name.replace(/_/g, " ");
            if (!poolExtra.data) {
                const post = await E621.Post.id(pool.post_ids[0]).first<APIPost>();
                poolExtra.data = post.file.md5;
            }
            if (!poolExtra.last) poolExtra.last = pool.post_ids.slice(-1)[0];

            if ((pool.post_ids.length - 1) > pool.post_ids.indexOf(poolExtra.last)) {
                result[new Date(pool.updated_at).getTime()] = {
                    uid: pool.id,
                    md5: poolExtra.data,
                    ext: pool.name.replace(/_/g, " ") + "|" + pool.post_count,
                    new: true,
                }
                poolExtra.last = pool.post_ids.slice(-1)[0];
            }

            this.slist.addExtraData(pool.id + "", poolExtra);
        }

        console.log("adding", result);

        this.slist.pushSubscriptions();
        this.writeStatus(`. . . displaying results`);

        return result;
    }

    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction): JQuery<HTMLElement> {

        const postData = data.ext.split("|");
        const result = $("<subitem>")
            .attr({ "new": data.new, });

        const link = $("<a>")
            .addClass("img-link")
            .attr({ href: "/pools/" + data.uid, })
            .appendTo(result);

        $("<img>")
            .attr({ src: getPreviewLink(data.md5), })
            .appendTo(link);

        const mainSection = $("<div>")
            .addClass("info-section")
            .appendTo(result);

        $("<a>")
            .html(postData[0])
            .attr({ "href": this.slist.getExtraData(data.uid + "").last, })
            .appendTo(mainSection);

        $("<div>")
            .html("Updated " + Util.Time.ago(timestamp))
            .appendTo(mainSection);

        $("<a>")
            .addClass("all-link")
            .html(`View all ${postData[1]} posts`)
            .appendTo(result);

        $("<a>")
            .addClass("delete-link")
            .html(`<span><i class="fas fa-times"></i></span>`)
            .appendTo(result)
            .on("click", (event) => {
                event.preventDefault;
                deleteFunction(timestamp, result);
            });

        return result;

        function getPreviewLink(md5: string): string {
            return `https://static1.e621.net/data/preview/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`
        }
    }

    protected formatSubscriptionListEntry(id: string, value: any, unsub: (name: string) => void): JQuery<HTMLElement> {

        const poolData = this.slist.getExtraData(id) || {};
        const result = $("<sb-enitem>")
            .attr({ content: id + (poolData.name ? (" " + poolData.name) : ""), });

        $("<a>")
            .addClass("sb-unsub")
            .html(`<i class="fas fa-times"></i>`)
            .attr({ "title": "Unsubscribe", })
            .appendTo(result)
            .on("click", (event) => {
                event.preventDefault();
                unsub(id);
            });

        $("<a>")
            .html(poolData.name ? poolData.name : `pool #${id}`)
            .attr({ "href": "/wiki_pages/show_or_new?title=" + id })
            .appendTo(result);

        return result;
    }

}
