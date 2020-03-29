import { UpdateData, UpdateDefinition, SubscriptionSettings } from "./SubscriptionManager";
import { Api } from "../../components/api/Api";
import { PageDefintion, Page } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { ApiForumTopic } from "../../components/api/responses/ApiForum";

export class ForumSubscriptions extends RE6Module implements Subscription {

    updateDefinition: UpdateDefinition = {
        imageSrc: data => {
            return "";
        },
        updateHref: data => {
            return `/forum_topics/${data.id}?page=${Math.ceil(data.last / 75)}`;   //75 replies per page
        },
        updateText: data => {
            return data.name;
        },
        sourceHref: data => {
            return `/forum_topics/${data.id}`;
        },
        sourceText: data => {
            return "First Page";
        }
    }

    limit: number;
    lastUpdate: number;
    tab: JQuery<HTMLElement>;

    private static instance: ForumSubscriptions;

    public getName(): string {
        return "Forums";
    }

    getSubscriberId($element: JQuery<HTMLElement>): string {
        return Page.getPageID();
    }

    getElementsToInsertAfter() {
        return $("div#c-forum-topics > div#a-show > h1").first();
    }

    public createSubscribeButton() {
        return $("<button>")
            .addClass(`large-subscribe-button subscribe`)
            .html("Subscribe");
    }

    public createUnsubscribeButton() {
        return $("<button>")
            .addClass(`large-subscribe-button unsubscribe`)
            .html("Unsubscribe");
    }

    public async getUpdatedEntries() {
        let results: UpdateData[] = [];

        let forumData: SubscriptionSettings = this.fetchSettings("data", true);
        if (Object.keys(forumData).length === 0) {
            return results;
        }

        let forumsJson: ApiForumTopic[] = await Api.getJson("/forum_topics.json?search[id]=" + Object.keys(forumData).join(","));
        for (const forumJson of forumsJson) {
            if (new Date(forumJson.updated_at).getTime() > this.lastUpdate) {
                results.push(await this.formatForumUpdate(forumJson, forumData));
            }
        }
        this.pushSettings("data", forumData);
        return results;
    }

    private async formatForumUpdate(value: ApiForumTopic, forumInfo: SubscriptionSettings): Promise<UpdateData> {
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
    protected getDefaultSettings() {
        return {
            enabled: true,
            data: {}
        };
    }

    public static getInstance() {
        if (this.instance == undefined) this.instance = new ForumSubscriptions();
        return this.instance;
    }
}

export interface ForumInfo {
}
