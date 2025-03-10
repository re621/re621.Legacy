import { E621 } from "../../components/api/E621";
import { APIPool } from "../../components/api/responses/APIPool";
import { APIPost, PostFlag } from "../../components/api/responses/APIPost";
import { XM } from "../../components/api/XM";
import { Page, PageDefinition } from "../../components/data/Page";
import { PostData } from "../../components/post/Post";
import { PostParts } from "../../components/post/PostParts";
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
            if (index == 10) this.writeStatus(`&nbsp; &nbsp; &nbsp; <span style="color:gold">connection throttled</span>`);
            if (subscriptionsChunks.length > 1)
                this.writeStatus(`&nbsp; &nbsp; - processing batch #${index} [<a href="/pools?search[id]=${chunk.join(",")}" target="_blank">${chunk.length}</a>]`);
            apiResponse.push(...await E621.Pools.get<APIPool>({ "search[id]": chunk.join(",") }, index < 10 ? 500 : 1000));

            // This should prevent the tracker from double-updating if the process takes more than 5 minutes
            // There are definitely users who are subscribed to enough tags to warrant this
            SubscriptionManager.trigger("inprogress." + this.trackerID, 1);
        }

        // Fetching associated data
        this.writeStatus(`. . . fetching post data`);
        const postData: Map<number, APIPost> = new Map();
        for (const pool of apiResponse) {

            if (pool.post_count == 0) continue;

            const poolExtra = this.slist.getExtraData(pool.id + "") || {};
            if (typeof poolExtra.data == "undefined") postData.set(pool.post_ids[0], null);
        }

        if (postData.size > 0) {
            const postsChunks = Util.chunkArray(Array.from(postData.keys()), 100, "chunk");
            for (const [index, chunk] of postsChunks.entries()) {

                // Processing batch #index
                if (index == 10) this.writeStatus(`&nbsp; &nbsp; &nbsp; <span style="color:gold">connection throttled</span>`);
                if (subscriptionsChunks.length > 1)
                    this.writeStatus(`&nbsp; &nbsp; - processing batch #${index} [<a href="/posts?tags=id:${chunk.join(",")}" target="_blank">${chunk.length}</a>]`);
                for (const post of await E621.Posts.get<APIPost>({ "tags": "id:" + chunk.join(","), "limit": 320 }, index < 10 ? 500 : 1000))
                    postData.set(post.id, post);

                // Same as below - trigger to avoid update collisions
                SubscriptionManager.trigger("inprogress." + this.trackerID, 1);
            }
        }

        // Parsing output, discarding irrelevant data
        this.writeStatus(`. . . formatting output`);
        // await Util.sleep(5000);
        for (const pool of apiResponse) {

            // Don't bother with empty pools
            const postCount = pool.post_count;
            if (postCount == 0) continue;

            const poolExtra = this.slist.getExtraData(pool.id + "") || {};
            poolExtra.name = pool.name.replace(/_/g, " ");
            if (typeof poolExtra.data == "undefined") {

                // If the scheduled fetching fails for whatever reason,
                // fall back to the old method of getting that data
                const postAPI = postData.get(pool.post_ids[0]) || await E621.Post.id(pool.post_ids[0]).first<APIPost>();
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

            // If no lastSeen value is set for pool, set it to the second to last post in the pool
            // This doesn't account for if more than 1 post gets added to the pool before the first lastSeen value is set
            if (!poolExtra.lastSeen) poolExtra.lastSeen = pool.post_ids.slice(-2)[0];

            if ((pool.post_ids.length - 1) > pool.post_ids.indexOf(poolExtra.last)) {
                result[new Date(pool.updated_at).getTime()] = {
                    uid: pool.id,
                    md5: poolExtra.data,
                    ext: encodeURIComponent(pool.name.replace(/_/g, " ")) + "|" + pool.post_count,
                    new: true,
                }

                // Handle cases where lastSeen post is removed from pool
                // This could be handled better if you saved pool post IDs for comparison
                if (pool.post_ids.indexOf(poolExtra.lastSeen) == -1) poolExtra.lastSeen = pool.post_ids.slice(-1)[0];

                poolExtra.numBehind = (pool.post_ids.length - 1) - pool.post_ids.indexOf(poolExtra.lastSeen);
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
                "new": data.new,    // Output ordering
                "uid": timestamp,   // Needed for dynamic rendering

                // Necessary data for the HoverZoom
                "data-id": data.uid,
                "data-md5": imageData[0],
                "data-preview-url": getPreviewLink(imageData[0]),
                "data-large-url": getSampleLink(imageData[0], imageData[1] == "true", imageData[2]),
                "data-file-ext": imageData[2],
                "data-rating": imageData[3] || "e",
                "data-created-at": new Date(timestamp).toString(),

                "data-width": imageData[4],
                "data-height": imageData[5],
                "data-size": imageData[6],

                "hztrigger": "img",
            })
            .on("re621:render", () => {

                console.log("rendering");

                const link = $("<a>")
                    .addClass("img-link")
                    .attr({ href: "/pools/" + data.uid, })
                    .appendTo(result);

                PostParts.bootstrapDoubleClick(link, () => {
                    XM.Util.openInTab(window.location.origin + link.attr("href"), false);
                });

                const image = $("<img>")
                    .attr({
                        src: getPreviewLink(imageData[0]),
                        hztarget: "subitem",
                    })
                    .one("load", () => {
                        // This is a workaround to avoid empty thumbnails
                        // The preview gets loaded first, then a sample replaces it if necessary
                        if (this.loadLargeThumbs) image.attr("src", getSampleLink(imageData[0], imageData[1] == "true", imageData[2]));
                    })
                    .one("error", () => {
                        image.attr("src", "https://e621.net/images/deleted-preview.png");
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
                    .attr({ "href": getLastSeenHref() })
                    .on("click", () => {
                        // Update the last seen post to the newest post in pool
                        extraData.lastSeen = extraData.last;
                        extraData.numBehind = 0;
                        this.slist.addExtraData(data.uid + "", extraData);
                        this.slist.pushSubscriptions();
                    })
                    .appendTo(mainSection);

                $("<div>")
                    .html(extraData.numBehind > 0
                        ? extraData.numBehind === 1
                            ? `Updated ${Util.Time.ago(timestamp)} (${extraData.numBehind} post behind)`
                            : `Updated ${Util.Time.ago(timestamp)} (${extraData.numBehind} posts behind)`
                        : `Updated ${Util.Time.ago(timestamp)}`
                    )
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

        function getLastSeenHref(): string {
            if (extraData.lastSeen) return `/posts/${extraData.lastSeen}?pool_id=${data.uid}`;
            // This is only needed for the edge case where the pool is still in the notifications list,
            // but hasn't been updated/clicked since this feature was added
            if (extraData.last) return `/posts/${extraData.last}?pool_id=${data.uid}`;
            return `/pools/${data.uid}`;
        }

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
