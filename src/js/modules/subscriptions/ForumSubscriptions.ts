import { UpdateData, UpdateDefinition } from "./SubscriptionManager";
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
        imageHref: data => {
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

    public addSubscribeButtons() {
        if (Page.matches(PageDefintion.forum)) {
            let $header = $("div#c-forum-topics > div#a-show > h1").first();
            let subscribeButton = $("<button>")
                .addClass("subscribe-button subscribe")
                .html("Subscribe")
                .appendTo($header);
            let unsubscribeButton = $("<button>")
                .addClass("subscribe-button unsubscribe")
                .html("Unsubscribe")
                .appendTo($header);

            let forumData: ForumSettings = this.fetchSettings("forums", true);

            if (forumData[parseInt(Page.getPageID())] === undefined) {
                unsubscribeButton.addClass("hidden");
            } else { subscribeButton.addClass("hidden"); }

            subscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                forumData = this.fetchSettings("forums", true);
                const pageId = parseInt(Page.getPageID())
                forumData[pageId] = {};
                this.pushSettings("forums", forumData);
            });
            unsubscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                forumData = this.fetchSettings("forums", true);

                delete forumData[parseInt(Page.getPageID())];
                this.pushSettings("forums", forumData);
            });
        }
    }

    public async getUpdatedEntries() {
        let results: UpdateData[] = [];

        let forumData: ForumSettings = this.fetchSettings("forums", true);
        if (Object.keys(forumData).length === 0) {
            return results;
        }

        let forumsJson: ApiForumTopic[] = await Api.getJson("/forum_topics.json?search[id]=" + Object.keys(forumData).join(","));
        for (const forumJson of forumsJson) {
            if (new Date(forumJson.updated_at).getTime() > this.lastUpdate) {
                results.push(await this.formatForumUpdate(forumJson, forumData));
            }
        }
        this.pushSettings("forums", forumData);
        return results;
    }

    private async formatForumUpdate(value: ApiForumTopic, forumInfo: ForumSettings): Promise<UpdateData> {
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
            forums: {}
        };
    }

    public static getInstance() {
        if (this.instance == undefined) this.instance = new ForumSubscriptions();
        return this.instance;
    }
}



export interface ForumSettings {
    [forumId: number]: ForumInfo
}

interface ForumInfo {
    thumbnail?: string;
}
