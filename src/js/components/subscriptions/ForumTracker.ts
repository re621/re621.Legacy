import { Settings } from "../../models.old/RE6Module";
import { E621 } from "../../models/api/E621";
import { APIForumTopic } from "../../models/api/responses/APIForumTopic";
import { Page, PageDefinition } from "../../models/data/Page";
import User from "../../models/data/User";
import { Util } from "../../utility/Util";
import { UpdateContent, UpdateData } from "./_SubscriptionCache";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class ForumTracker extends SubscriptionTracker {

    protected buttonSelect = {
        major: {
            regex: [PageDefinition.forums.view],
            selector: "#c-forum-topics > #a-show > h1:first",
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
        const apiResponse: APIForumTopic[] = [];

        for (const [index, chunk] of subscriptionsChunks.entries()) {

            // Processing batch #index
            if (index == 10) this.writeStatus(`&nbsp; &nbsp; &nbsp; <span style="color:gold">connection throttled</span>`);
            if (subscriptionsChunks.length > 1)
                this.writeStatus(`&nbsp; &nbsp; - processing batch #${index} [<a href="/forum_topics?search[id]=${chunk.join(",")}" target="_blank">${chunk.length}</a>]`);
            apiResponse.push(...await E621.ForumTopics.get<APIForumTopic>({ "search[id]": chunk.join(",") }, index < 10 ? 500 : 1000));

            // This should prevent the tracker from double-updating if the process takes more than 5 minutes
            // There are definitely users who are subscribed to enough tags to warrant this
            SubscriptionManager.trigger("inprogress." + this.trackerID, 1);
        }

        // Parsing output, discarding irrelevant data
        this.writeStatus(`. . . formatting output`);
        const lastUpdate = this.fetchSettings<number>("lastUpdate") || 0;
        for (const thread of apiResponse) {

            // If a thread is somehow empty, skip it
            // Not sure how this would happen, though
            const responseCount = thread.response_count;
            if (responseCount == 0) continue;

            const threadExtra = this.slist.getExtraData(thread.id + "") || {};
            threadExtra.name = thread.title;

            if (new Date(thread.updated_at).getTime() > lastUpdate && thread.updater_id !== User.userID) {
                result[new Date(thread.updated_at).getTime()] = {
                    uid: thread.id,
                    ext: encodeURIComponent(thread.title.replace(/_/g, " ")) + "|" + responseCount,
                    new: true,
                };
            }

            this.slist.addExtraData(thread.id + "", threadExtra);
        }

        this.slist.pushSubscriptions();
        this.writeStatus(`. . . displaying results`);

        return result;
    }

    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction): JQuery<HTMLElement> {

        const threadData = data.ext.split("|");
        const result = $("<subitem>")
            .attr({
                "new": data.new,    // Output ordering
                "uid": timestamp,   // Needed for dynamic rendering
            })
            .on("re621:render", () => {

                const mainSection = $("<div>")
                    .addClass("info-section")
                    .appendTo(result);

                $("<a>")
                    .html(decodeURIComponent(threadData[0]))
                    .attr({ "href": `/forum_topics/${data.uid}?page=${Math.ceil(parseInt(threadData[1] || "1") / 75)}`, })
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

    }

    protected formatSubscriptionListEntry(id: string, value: any, unsub: (name: string) => void): JQuery<HTMLElement> {

        const threadData = this.slist.getExtraData(id) || {};
        const result = $("<sb-enitem>")
            .attr({
                content: id + (threadData.name ? (" " + threadData.name.toLowerCase()) : ""),
                sort: threadData.name ? threadData.name.toLowerCase() : id,
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
            .html(threadData.name ? threadData.name : `thread #${id}`)
            .attr({ "href": `/forum_topics/${id}` })
            .appendTo(result);

        return result;
    }

}
