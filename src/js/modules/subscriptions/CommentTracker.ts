import { E621 } from "../../components/api/E621";
import { APIComment } from "../../components/api/responses/APIComment";
import { APIPost } from "../../components/api/responses/APIPost";
import { Page, PageDefinition } from "../../components/data/Page";
import { Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { UpdateContent, UpdateData } from "./_SubscriptionCache";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class CommentTracker extends SubscriptionTracker {

    protected buttonSelect = {
        major: {
            regex: [PageDefinition.post],
            selector: "section#comments > div.comments-for-post > div.row.notices:first",
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
            if (data.get(comment.post_id) == undefined || data.get(comment.post_id).created_at < comment.created_at)
                data.set(comment.post_id, comment);
        }

        // Parsing output, discarding irrelevant data
        const lastUpdate = this.fetchSettings<number>("lastUpdate") || 0;
        this.writeStatus(`. . . formatting output`);
        for (const [commentID, comment] of data.entries()) {

            const postExtra = this.slist.getExtraData(comment.post_id + "") || {};
            if (typeof postExtra.data == "undefined") {
                // TODO It would be better to just gather the post IDs, then
                // search for all of them at once. But these are only used
                // on the first run, so it is not that critical
                const post = await E621.Post.id(comment.post_id).first<APIPost>();
                postExtra.data = post.flags.deleted ? null : post.file.md5;
            }

            const createdAt = new Date(comment.created_at).getTime();
            if (createdAt > lastUpdate) {
                result[createdAt] = {
                    uid: commentID,
                    md5: postExtra.data,
                    ext: encodeURIComponent(comment.body.slice(0, 256)) + "|" + comment.post_id + "|" + comment.creator_name,
                    new: true,
                };
            }

            this.slist.addExtraData(comment.post_id + "", postExtra);
        }

        this.slist.pushSubscriptions();
        this.writeStatus(`. . . displaying results`);

        return result;
    }

    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction): JQuery<HTMLElement> {

        const commentData = data.ext.split("|");
        const result = $("<subitem>")
            .attr({ new: data.new, })
            .on("re621:render", () => {

                const link = $("<a>")
                    .addClass("img-link")
                    .attr({ href: "/posts/" + commentData[1], })
                    .appendTo(result);

                const img = $("<img>")
                    .attr({ src: data.md5 ? getPreviewLink(data.md5) : "https://e621.net/images/deleted-preview.png", })
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
                    // TODO Does this link actually work?
                    .attr({ "href": this.slist.getExtraData(data.uid + "").last, })
                    .appendTo(mainSection);

                $("<div>")
                    .addClass("comment-body")
                    .html(decodeURIComponent(commentData[0]))
                    .appendTo(mainSection);

                $("<div>")
                    .html("Updated " + Util.Time.ago(timestamp))
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
            return `https://static1.e621.net/data/preview/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`
        }
    }

}
