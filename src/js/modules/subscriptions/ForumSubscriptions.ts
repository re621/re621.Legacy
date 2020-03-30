import { UpdateData, UpdateDefinition, SubscriptionSettings } from "./SubscriptionManager";
import { Api } from "../../components/api/Api";
import { Page } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { ApiForumTopic } from "../../components/api/responses/ApiForum";

export class ForumSubscriptions extends RE6Module implements Subscription {

    updateDefinition: UpdateDefinition = {
        imageSrc: () => {
            return "";
        },
        updateHref: (data) => {
            return `/forum_topics/${data.id}?page=${Math.ceil(data.last / 75)}`;   //75 replies per page
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

    limit: number;
    lastUpdate: number;
    tab: JQuery<HTMLElement>;

    public constructor() {
        super();
    }

    public getName(): string {
        return "Forums";
    }

    getSubscriberId(): string {
        return Page.getPageID();
    }

    getElementsToInsertAfter(): JQuery<HTMLElement> {
        return $("div#c-forum-topics > div#a-show > h1").first();
    }

    public createSubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass(`large-subscribe-button subscribe`)
            .html("Subscribe");
    }

    public createUnsubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass(`large-subscribe-button unsubscribe`)
            .html("Unsubscribe");
    }

    public async getUpdatedEntries(): Promise<UpdateData[]> {
        const results: UpdateData[] = [];

        const forumData: SubscriptionSettings = this.fetchSettings("data", true);
        if (Object.keys(forumData).length === 0) {
            return results;
        }

        const forumsJson: ApiForumTopic[] = await Api.getJson("/forum_topics.json?search[id]=" + Object.keys(forumData).join(","));
        for (const forumJson of forumsJson) {
            if (new Date(forumJson.updated_at).getTime() > this.lastUpdate) {
                results.push(await this.formatForumUpdate(forumJson));
            }
        }
        this.pushSettings("data", forumData);
        return results;
    }

    private async formatForumUpdate(value: ApiForumTopic): Promise<UpdateData> {
        return {
            id: value.id,
            name: value.title,
            date: new Date(value.updated_at),
            last: value.response_count,
            thumbnailMd5: ""
        };
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            data: {}
        };
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ForumInfo {
    // TODO Fix this
}
