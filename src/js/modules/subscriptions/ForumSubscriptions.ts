import { SubscriptionManager, Update } from "./SubscriptionManager";
import { Api } from "../../components/api/Api";
import { PageDefintion, Page } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { Util } from "../../components/structure/Util";
import { ApiPost } from "../../components/api/responses/ApiPost";
import { ApiForumTopic } from "../../components/api/responses/ApiForum";

export class ForumSubscriptions extends RE6Module implements Subscription {

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

    public createUpdateEntry(data: Update) {
        let $content = $("<div>")
            .addClass("subscription-update");

        // Image
        let $image = $("<div>")
            .addClass("subscription-update-preview")
            .appendTo($content);
        $("<img>")
            .appendTo($image);

        // Entry Title
        let $title = $("<div>")
            .addClass("subscription-update-title")
            .appendTo($content);
        $("<a>")
            .html(data.name)
            .attr({
                "href": "/forum_topics/" + data.id + "?page=" + Math.ceil(data.last / 75),   //75 replies per page
                "data-id": data.id,
            })
            .appendTo($title);

        // Link to all posts page
        let $full = $("<div>")
            .addClass("subscription-update-full")
            .appendTo($content);
        $("<a>")
            .attr("href", "/forum_topics/" + data.id)
            .html("First Page")
            .appendTo($full);

        // Last Updated
        let $date = $("<div>")
            .addClass("subscription-update-date")
            .appendTo($content);
        $("<span>")
            .html(Util.timeAgo(data.date))
            .attr("title", data.date.toLocaleString())
            .appendTo($date);

        return $content;
    }

    public async getUpdatedEntries() {
        let results: Update[] = [];

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

    private async formatForumUpdate(value: ApiForumTopic, forumInfo: ForumSettings): Promise<Update> {
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
