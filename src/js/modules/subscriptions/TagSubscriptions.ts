import { UpdateData, UpdateDefinition, SubscriptionSettings } from "./SubscriptionManager";
import { ApiPool } from "../../components/api/responses/ApiPool";
import { Api } from "../../components/api/Api";
import { PageDefintion, Page } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { ApiPost } from "../../components/api/responses/ApiPost";
import { Post } from "../../components/data/Post";

export class TagSubscriptions extends RE6Module implements Subscription {
    updateDefinition: UpdateDefinition = {
        imageSrc: data => {
            return Post.createPreviewUrlFromMd5(data.thumbnailMd5);
        },
        imageHref: data => {
            return `https://e621.net/posts/${data.id}`;
        },
        updateHref: data => {
            return "";
        },
        updateText: data => {
            return "";
        },
        sourceHref: data => {
            return `https://e621.net/posts?tags=${data.name}`;
        },
        sourceText: data => {
            return "View Tag";
        }
    }

    limit: number;
    lastUpdate: number;
    tab: JQuery<HTMLElement>;

    private static instance: TagSubscriptions;

    public getName(): string {
        return "Tags";
    }

    public getSubscriberId($element: JQuery<HTMLElement>): string {
        return $element.parent().find(".search-tag").text();
    }

    public getElementsToInsertAfter() {
        return $("#tag-box a:first-child, #tag-list a:first-child");
    }

    public createSubscribeButton() {
        return $("<a>")
            .attr("href", "#")
            .addClass("tag-subscribtion-button")
            .html("\u2661")
    }

    public createUnsubscribeButton() {
        return $("<a>")
            .attr("href", "#")
            .addClass("tag-subscribtion-button")
            .html("\u2665");
    }

    public async getUpdatedEntries() {
        let results: UpdateData[] = [];
        return [];
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
        if (this.instance == undefined) this.instance = new TagSubscriptions();
        return this.instance;
    }
}
