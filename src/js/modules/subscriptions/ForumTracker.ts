import { E621 } from "../../components/api/E621";
import { APIForumTopic } from "../../components/api/responses/APIForumTopic";
import { Page, PageDefintion } from "../../components/data/Page";
import { User } from "../../components/data/User";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { Subscription } from "./SubscriptionManager";
import { SubscriptionTracker, UpdateActions, UpdateCache, UpdateContent, UpdateData } from "./SubscriptionTracker";

export class ForumTracker extends RE6Module implements SubscriptionTracker {

    private cache: UpdateCache;

    public constructor() {
        super();
        this.cache = new UpdateCache(this);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            data: {},
        };
    }

    updateActions: UpdateActions = {
        imageSrc: () => {
            return "";
        },
        updateHref: (data) => {
            return `/forum_topics/${data.id}?page=${Math.ceil(data.extra.count / 75)}`;   //75 replies per page
        },
        updateText: (data) => {
            return data.name;
        },
        sourceHref: (data) => {
            return `/forum_topics/${data.id}`;
        },
        sourceText: () => {
            return "First Page";
        }
    };

    public getName(): string {
        return "Forums";
    }

    // ===== Buttons =====

    public makeSubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass("large-subscribe-button subscribe")
            .addClass("button btn-success")
            .html("Subscribe");
    }

    public makeUnsubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass("large-subscribe-button unsubscribe")
            .addClass("button btn-danger")
            .html("Unsubscribe");
    }

    public getButtonAttachment(): JQuery<HTMLElement> {
        if (Page.matches(PageDefintion.forumPost)) return $("#c-forum-topics").first();
        else return $();
    }

    public insertButton($element: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void {
        $element.prepend($button);
    }

    public getSubscriberId(): string {
        return Page.getPageID();
    }

    public getSubscriberName(): string {
        return $("div#c-forum-topics div#a-show h1").first().text().trim().replace("Topic: ", "");
    }

    // ===== Updates =====

    public subBatchSize = 100;

    public getCache(): UpdateCache {
        return this.cache;
    }

    public async getUpdatedEntries(lastUpdate: number, status: JQuery<HTMLElement>): Promise<UpdateData> {
        const results: UpdateData = {};

        status.append(`<div>. . . retrieving settings</div>`);
        const storedSubs: Subscription = await this.fetchSettings("data", true);
        if (Object.keys(storedSubs).length === 0) return results;

        status.append(`<div>. . . sending an API request</div>`);
        const storedSubChunks = Util.chunkArray(Object.keys(storedSubs), this.subBatchSize);
        const apiData: APIForumTopic[] = [];
        for (const [index, chunk] of storedSubChunks.entries()) {
            if (storedSubChunks.length > 1) status.append(`<div>&nbsp; &nbsp; &nbsp; - processing batch #${index}</div>`);
            apiData.push(...await E621.ForumTopics.get<APIForumTopic>({ "search[id]": chunk.join(",") }, 500));
        }

        status.append(`<div>. . . formatting output</div>`);
        for (const forumJson of apiData) {
            if (new Date(forumJson.updated_at).getTime() > lastUpdate && forumJson.updater_id !== User.getUserID()) {
                results[new Date(forumJson.updated_at).getTime()] = await this.formatForumUpdate(forumJson);
            }

            // Fetch and update the saved forum thread name
            storedSubs[forumJson.id].name = forumJson.title.replace(/_/g, " ");
        }

        status.append(`<div>. . . outputting results</div>`);
        await this.pushSettings("data", storedSubs);
        return results;
    }

    private async formatForumUpdate(value: APIForumTopic): Promise<UpdateContent> {
        return {
            id: value.id,
            name: value.title,
            md5: "",
            extra: {    // comment count
                count: value.response_count
            },
            new: true,
        };
    }

}
