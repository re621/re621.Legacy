import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { Blacklist } from "../../components/data/Blacklist";
import { PageDefinition } from "../../components/data/Page";
import { PostData } from "../../components/post/Post";
import { Util } from "../../components/utility/Util";
import { WikiEnhancer } from "../misc/WikiEnhancer";
import { UpdateContent, UpdateData } from "./_SubscriptionCache";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class TagTracker extends SubscriptionTracker {

    // Needs to be overridden due to lower lookup batch sizes
    protected batchSize = 40;

    protected buttonSelect = {
        minor: {
            regex: [PageDefinition.search, PageDefinition.post],
            selector: "#tag-box li span.tag-action-subscribe, #tag-list li span.tag-action-subscribe",
        },
        major: {
            regex: [PageDefinition.wiki, PageDefinition.artist],
            selector: "#c-wiki-pages > #a-show > #content > h1:first, #c-artists > #a-show > h1:first",
        }
    };

    protected fetchMinorSubscriptionName(element: JQuery<HTMLElement>): string {
        return element.parent().attr("data-tag");
    }

    protected fetchMajorSubscriptionName(element: JQuery<HTMLElement>): string {
        return WikiEnhancer.sanitizeWikiTagName(element.find("a:first").text());
    }

    public async fetchUpdatedEntries(): Promise<UpdateData> {

        const result: UpdateData = {};
        this.clearStatus();
        this.writeStatus("Updating Tag Subscriptions");

        // Fetching the list of subscriptions
        this.writeStatus(`. . . retrieving settings`);
        const subscriptions = this.slist.get();
        const lastUpdate = await this.fetchSettings<number>("lastUpdate", true);
        if (subscriptions.size == 0) return result;

        // Splitting subscriptions into batches and sending API requests
        this.writeStatus(`. . . sending an API request`);
        const subscriptionsChunks = Util.chunkArray(subscriptions, this.batchSize);
        const apiResponse: { [timestamp: number]: APIPost } = {};

        for (const [index, chunk] of subscriptionsChunks.entries()) {

            // Processing batch #index
            if (subscriptionsChunks.length > 1) this.writeStatus(`&nbsp; &nbsp; &nbsp; - processing batch #${index}`);
            if (index == 10) this.writeStatus(`<span style="color:gold">warning</span> connection throttled`)

            for (const post of await E621.Posts.get<APIPost>({ "tags": chunk.map(el => "~" + el), "limit": 320 }, index < 10 ? 500 : 1000))
                apiResponse[new Date(post.created_at).getTime()] = post;

            // This should prevent the tracker from double-updating if the process takes more than 5 minutes
            // There are definitely users who are subscribed to enough tags to warrant this
            SubscriptionManager.trigger("inprogress." + this.trackerID);
        }

        // Parsing output, discarding irrelevant data
        this.writeStatus(`. . . formatting output`);
        await Util.sleep(500);
        for (const index of Object.keys(apiResponse).sort()) {

            // This is needed exclusively for the Blacklist below
            const post = PostData.fromAPI(apiResponse[index]);

            // Don't include updates posted before the last update timestamp
            const timestamp = post.date.obj.getTime();
            if (timestamp < lastUpdate) continue;

            // Avoid posts with blacklisted tags
            // This is kind of excessive, but it works
            Blacklist.addPost(post);
            if (Blacklist.checkPost(post.id, true)) continue;

            result[timestamp] = {
                uid: post.id,
                md5: post.file.ext == "swf" ? "" : post.file.md5,
                ext: post.rating + "|" + post.has.sample + "|" + post.file.ext,
                new: true,
            };
        }

        this.writeStatus(`. . . displaying results`);

        return result;
    }

    protected drawUpdateEntry(data: UpdateContent, timestamp: number, deleteFunction): JQuery<HTMLElement> {
        const postData = data.ext.split("|");
        const result = $("<subitem>")
            .attr({
                // Output ordering
                "new": data.new,

                // Necessary data for the HoverZoom
                "data-large-file-url": getSampleLink(data.md5, postData[1] == "true", postData[2]),
                "data-file-ext": postData[2],
                "data-rating": postData[0] || "s",
                "data-created-at": new Date(timestamp).toString(),
            });
        const link = $("<a>")
            .attr({ href: "/posts/" + data.uid, })
            .appendTo(result);

        $("<img>")
            .attr({ src: getPreviewLink(data.md5), })
            .appendTo(link);

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

        function getSampleLink(md5: string, hasSample: boolean, ext = "jpg"): string {
            return hasSample
                ? `https://static1.e621.net/data/sample/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`
                : `https://static1.e621.net/data/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.${ext}`;
        }
    }

    protected formatSubscriptionListEntry(id: string, value: any, unsub: (name: string) => void): JQuery<HTMLElement> {

        const formattedID = id.replace(/_/g, " ");
        const result = $("<sb-enitem>")
            .attr({ content: id + " " + formattedID, });

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
            .html(formattedID)
            .attr({ "href": "/wiki_pages/show_or_new?title=" + id })
            .appendTo(result);

        return result;
    }

}
