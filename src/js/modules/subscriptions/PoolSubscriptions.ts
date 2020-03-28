import { SubscriptionManager, Update } from "./SubscriptionManager";
import { ApiPool } from "../../components/api/responses/ApiPool";
import { Api } from "../../components/api/Api";
import { PageDefintion, Page } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Subscription, UpdateCallback } from "./Subscription";
import { Util } from "../../components/structure/Util";

export class PoolSubscriptions extends RE6Module implements Subscription {

    limit: number;
    lastUpdate: number;
    tab: JQuery<HTMLElement>;

    private static instance: PoolSubscriptions;

    public create() {
        if (!this.canInitialize()) return;
        SubscriptionManager.initSubscriber(this);
    }

    public getName(): string {
        return "Pools";
    }

    public addSubscribeButtons() {
        if (Page.matches(PageDefintion.pool)) {
            let $header = $("div#c-pools > div#a-show > h1").first();
            let subscribeButton = $("<button>")
                .addClass("subscribe-button subscribe")
                .html("Subscribe")
                .appendTo($header);
            let unsubscribeButton = $("<button>")
                .addClass("subscribe-button unsubscribe")
                .html("Unsubscribe")
                .appendTo($header);

            let poolData = this.fetchSettings("pools", true);

            if (poolData.indexOf(parseInt(Page.getPageID())) === -1) {
                unsubscribeButton.addClass("hidden");
            } else { subscribeButton.addClass("hidden"); }

            subscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                poolData = this.fetchSettings("pools", true);

                poolData.push(parseInt(Page.getPageID()));
                this.pushSettings("pools", poolData);
            });
            unsubscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                poolData = this.fetchSettings("pools", true);

                poolData = poolData.splice(poolData.indexOf(parseInt(Page.getPageID()), 1));
                this.pushSettings("pools", poolData);
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
            .attr("src", data.extra)
            .appendTo($image);

        // Entry Title
        let $title = $("<div>")
            .addClass("subscription-update-title")
            .appendTo($content);
        $("<a>")
            .html(data.name)
            .attr({
                "href": "/posts/" + data.last + "?pool_id=" + data.id,
                "data-id": data.id,
            })
            .appendTo($title);

        // Link to all posts page
        let $full = $("<div>")
            .addClass("subscription-update-full")
            .appendTo($content);
        $("<a>")
            .attr("href", "/pool/" + data.id)
            .html("All Posts")
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

        let poolData = this.fetchSettings("pools", true);
        if (poolData.length == 0) {
            results;
        }

        let poolsJson: ApiPool[] = await Api.getJson("/pools.json?search[id]=" + poolData.join(","));
        poolsJson.forEach((value) => {
            if (new Date(value.updated_at).getTime() > this.lastUpdate || !SubscriptionManager.dismissOnUpdate) {
                results.push(this.formatPoolUpdate(value));
            }
        });
        return results;
    }

    private formatPoolUpdate(value: ApiPool): Update {
        return {
            id: value.id,
            name: value.name.replace(/_/g, " "),
            date: new Date(value.updated_at),
            last: value.post_ids[value.post_ids.length - 1],
            extra: "https://static1.e621.net/data/preview/1f/fc/1ffc0e7f96c7e541181b40bfb52e130b.jpg"
        };
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            enabled: true,
            pools: []
        };
    }

    public static getInstance() {
        if (this.instance == undefined) this.instance = new PoolSubscriptions();
        return this.instance;
    }
}
