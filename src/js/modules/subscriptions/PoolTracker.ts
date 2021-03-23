import { E621 } from "../../components/api/E621";
import { APIPool } from "../../components/api/responses/APIPool";
import { APIPost, PostFlag } from "../../components/api/responses/APIPost";
import { Page, PageDefinition } from "../../components/data/Page";
import { PostData } from "../../components/post/Post";
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
            method: "before",
        }
    };

    public getDefaultSettings(): Settings {
        return {
            ...super.getDefaultSettings(),

            cacheSize: 20,                  // how many subscription updates are kept
        };
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
            SubscriptionManager.trigger("inprogress." + this.trackerID, 1);
        }

        // Parsing output, discarding irrelevant data
        this.writeStatus(`. . . formatting output`);
        for (const pool of apiResponse) {

            // Don't bother with empty pools
            const postCount = pool.post_count;
            if (postCount == 0) return;

            const poolExtra = this.slist.getExtraData(pool.id + "") || {};
            poolExtra.name = pool.name.replace(/_/g, " ");
            if (typeof poolExtra.data == "undefined") {
                // TODO It would be better to just gather the post IDs, then
                // search for all of them at once. But these are only used
                // on the first run, so it is not that critical
                const postAPI = await E621.Post.id(pool.post_ids[0]).first<APIPost>();
                if (postAPI) {
                    const post = PostData.fromAPI(postAPI);
                    poolExtra.data = ((post.file.ext == "swf" || post.flags.has(PostFlag.Deleted)) ? "" : post.file.md5)
                        + "|" + post.has.sample     // sample       boolean
                        + "|" + post.file.ext       // extension    string
                        + "|" + post.rating         // rating       E | Q | S
                        + "|" + post.img.width      // width        int
                        + "|" + post.img.height     // height       int
                        + "|" + post.file.size      // filesize     int
                        ;
                }
            }
            if (!poolExtra.last) poolExtra.last = pool.post_ids.slice(-1)[0];

            if ((pool.post_ids.length - 1) > pool.post_ids.indexOf(poolExtra.last)) {
                result[new Date(pool.updated_at).getTime()] = {
                    uid: pool.id,
                    md5: poolExtra.data,
                    ext: encodeURIComponent(pool.name.replace(/_/g, " ")) + "|" + pool.post_count,
                    new: true,
                }
                poolExtra.last = pool.post_ids.slice(-1)[0];
            }

            this.slist.addExtraData(pool.id + "", poolExtra);
        }

        this.slist.pushSubscriptions();
        this.writeStatus(`. . . displaying results`);

        return result;
    }

    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction): JQuery<HTMLElement> {

        const poolData = data.ext.split("|");
        const imageData = data.md5.split("|");

        let extraData = this.slist.getExtraData(data.uid + "") || {};
        const result = $("<subitem>")
            .attr({
                // Output ordering
                "new": data.new,

                // Necessary data for the HoverZoom
                "data-id": data.uid,
                "data-md5": imageData[0],
                "data-preview-url": getPreviewLink(imageData[0]),
                "data-large-file-url": getSampleLink(imageData[0], imageData[1] == "true", imageData[2]),
                "data-file-ext": imageData[2],
                "data-rating": imageData[3] || "e",
                "data-created-at": new Date(timestamp).toString(),

                "data-width": imageData[4],
                "data-height": imageData[5],
                "data-filesize": imageData[6],
            })
            .on("re621:render", () => {

                console.log("rendering");

                const link = $("<a>")
                    .addClass("img-link")
                    .attr({ href: "/pools/" + data.uid, })
                    .appendTo(result);

                const img = $("<img>")
                    .attr({
                        src: this.loadLargeThumbs
                            ? getSampleLink(imageData[0], imageData[1] == "true", imageData[2])
                            : getPreviewLink(imageData[0]),
                        hztarget: "subitem",
                    })
                    .one("error", () => {
                        img.attr("src", "https://e621.net/images/deleted-preview.png");
                        extraData = this.slist.getExtraData(data.uid + "") || {};
                        delete extraData.data;
                        this.slist.addExtraData(data.uid + "", extraData);
                        this.slist.pushSubscriptions();
                    })
                    .appendTo(link);

                const mainSection = $("<div>")
                    .addClass("info-section")
                    .appendTo(result);

                $("<a>")
                    .html(decodeURIComponent(poolData[0]))
                    .attr({ "href": extraData.last ? `/posts/${extraData.last}?pool_id=${data.uid}` : `/pools/${data.uid}`, })
                    .appendTo(mainSection);

                $("<div>")
                    .html("Updated " + Util.Time.ago(timestamp))
                    .appendTo(mainSection);

                $("<a>")
                    .addClass("all-link")
                    .attr("href", `/pools/${data.uid}`)
                    .html(`View all ${poolData[1]} posts`)
                    .appendTo(result);

                $("<a>")
                    .addClass("delete-link")
                    .html(`<span><i class="fas fa-times"></i></span>`)
                    .appendTo(result)
                    .on("click", (event) => {
                        event.preventDefault;
                        deleteFunction(timestamp, result);
                    });

            })
            .on("re621:reset", () => {
                result.html("");
            });

        return result;

        function getPreviewLink(md5: string): string {
            if (!md5) return "https://e621.net/images/deleted-preview.png";
            return `https://static1.e621.net/data/preview/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`;;
        }

        function getSampleLink(md5: string, hasSample: boolean, ext = "jpg"): string {
            if (!md5) return "https://e621.net/images/deleted-preview.png";
            return hasSample
                ? `https://static1.e621.net/data/sample/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`
                : `https://static1.e621.net/data/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.${ext}`;
        }
    }

    protected formatSubscriptionListEntry(id: string, value: any, unsub: (name: string) => void): JQuery<HTMLElement> {

        const poolData = this.slist.getExtraData(id) || {};
        const result = $("<sb-enitem>")
            .attr({
                content: id + (poolData.name ? (" " + poolData.name.toLowerCase()) : ""),
                sort: poolData.name ? poolData.name.toLowerCase() : id,
            });

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
            .attr({ "href": `/pools/${id}` })
            .appendTo(result);

        return result;
    }

}
