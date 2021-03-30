import { E621 } from "../../components/api/E621";
import { APIComment } from "../../components/api/responses/APIComment";
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

export class CommentTracker extends SubscriptionTracker {

    protected buttonSelect = {
        major: {
            regex: [PageDefinition.post],
            selector: "menu#post-sections",
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
        const apiResponse: APIComment[] = [];

        for (const [index, chunk] of subscriptionsChunks.entries()) {

            // Processing batch #index
            if (subscriptionsChunks.length > 1) this.writeStatus(`&nbsp; &nbsp; &nbsp; - processing batch #${index}`);
            apiResponse.push(...await E621.Comments.get<APIComment>({ "group_by": "comment", "search[post_id]": chunk.join(",") }, 500));

            // This should prevent the tracker from double-updating if the process takes more than 5 minutes
            // There are definitely users who are subscribed to enough tags to warrant this
            SubscriptionManager.trigger("inprogress." + this.trackerID, 1);
        }

        // Flattening the results into a map
        this.writeStatus(`. . . sorting results`);
        const data: Map<number, APIComment> = new Map();
        for (const comment of apiResponse) {
            if (!data.has(comment.post_id) || data.get(comment.post_id).created_at < comment.created_at)
                data.set(comment.post_id, comment);
        }

        // Fetching associated data
        this.writeStatus(`. . . fetching post data`);
        const postData: Map<number, APIPost> = new Map();
        for (const postID of data.keys()) {

            const postExtra = this.slist.getExtraData(postID + "") || {};
            if (typeof postExtra.data == "undefined") postData.set(postID, null);
        }

        if (postData.size > 0) {
            const postsChunks = Util.chunkArray(Array.from(postData.keys()), 100, "chunk");
            for (const [index, chunk] of postsChunks.entries()) {

                // Processing batch #index
                if (postsChunks.length > 1) this.writeStatus(`&nbsp; &nbsp; &nbsp; - processing batch #${index}`);
                for (const post of await E621.Posts.get<APIPost>({ "tags": "id:" + chunk.join(","), "limit": 320 }, index < 10 ? 500 : 1000))
                    postData.set(post.id, post);

                // Same as below - trigger to avoid update collisions
                SubscriptionManager.trigger("inprogress." + this.trackerID, 1);
            }
        }

        // Parsing output, discarding irrelevant data
        const lastUpdate = this.fetchSettings<number>("lastUpdate") || 0;
        this.writeStatus(`. . . formatting output`);
        for (const [postID, comment] of data.entries()) {

            const postExtra = this.slist.getExtraData(postID + "") || {};
            if (typeof postExtra.data == "undefined") {

                // If the scheduled fetching fails for whatever reason,
                // fall back to the old method of getting that data
                const postAPI = postData.get(postID) || await E621.Post.id(postID).first<APIPost>();
                if (postAPI) {
                    const post = PostData.fromAPI(postAPI);
                    postExtra.data = ((post.file.ext == "swf" || post.flags.has(PostFlag.Deleted)) ? "" : post.file.md5)
                        + "|" + post.has.sample     // sample       boolean
                        + "|" + post.file.ext       // extension    string
                        + "|" + post.rating         // rating       E | Q | S
                        + "|" + post.img.width      // width        int
                        + "|" + post.img.height     // height       int
                        + "|" + post.file.size      // filesize     int
                        ;
                }
            }

            const createdAt = new Date(comment.created_at).getTime();
            if (createdAt > lastUpdate) {
                result[createdAt] = {
                    uid: comment.id,
                    md5: postExtra.data,
                    ext: encodeURIComponent(Util.stripDText(comment.body).slice(0, 256)) + "|" + postID + "|" + comment.creator_name,
                    par: postID,
                    new: true,
                };
            }

            this.slist.addExtraData(postID + "", postExtra);
        }

        this.slist.pushSubscriptions();
        this.writeStatus(`. . . displaying results`);

        return result;
    }

    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction): JQuery<HTMLElement> {

        const commentData = data.ext.split("|");
        const imageData = data.md5.split("|");

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

                "hztrigger": "img",
            })
            .on("re621:render", () => {

                const link = $("<a>")
                    .addClass("img-link")
                    .attr({ href: "/posts/" + commentData[1], })
                    .appendTo(result);

                PostParts.bootstrapDoubleClick(link, () => {
                    XM.Util.openInTab(window.location.origin + link.attr("href"), false);
                });

                const img = $("<img>")
                    .attr({
                        src: this.loadLargeThumbs
                            ? getSampleLink(imageData[0], imageData[1] == "true", imageData[2])
                            : getPreviewLink(imageData[0]),
                        hztarget: "subitem",
                    })
                    .one("error", () => {
                        img.attr("src", "https://e621.net/images/deleted-preview.png");
                        this.slist.deleteExtraData(commentData[1]);
                        this.slist.pushSubscriptions();
                    })
                    .appendTo(link);

                const mainSection = $("<div>")
                    .addClass("info-section")
                    .appendTo(result);

                $("<a>")
                    .html(commentData[2] + " said:")
                    .attr({ "href": `/posts/${commentData[1]}#comment-${data.uid}`, })
                    .appendTo(mainSection);

                $("<div>")
                    .addClass("comment-body")
                    .html(decodeURIComponent(commentData[0]))
                    .appendTo(mainSection);

                $("<div>")
                    .html("Posted " + Util.Time.ago(timestamp))
                    .appendTo(mainSection);

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

        const result = $("<sb-enitem>")
            .attr({
                content: "post #" + id,
                sort: id,
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
            .html(`post #${id}`)
            .attr({ "href": `/posts/${id}` })
            .appendTo(result);

        return result;
    }

}
