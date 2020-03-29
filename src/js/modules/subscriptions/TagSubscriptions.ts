import { UpdateData, UpdateDefinition, SubscriptionSettings } from "./SubscriptionManager";
import { Api } from "../../components/api/Api";
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
        updateText: data => {
            return data.name;
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

        let tagData: SubscriptionSettings = this.fetchSettings("data", true);
        if (Object.keys(tagData).length === 0) {
            return results;
        }

        for (const tagName of Object.keys(tagData)) {
            let postsJson: ApiPost[] = (await Api.getJson("/posts.json?tags=" + encodeURIComponent(tagName.replace(/ /g, "_")))).posts;
            for (const post of postsJson) {
                if (new Date(post.created_at).getTime() > this.lastUpdate) {
                    results.push(await this.formatPostUpdate(post, tagName));
                }
            }
        }
        this.pushSettings("data", tagData);
        return results;
    }

    private async formatPostUpdate(value: ApiPost, tagName: string): Promise<UpdateData> {
        return {
            id: value.id,
            name: tagName.replace(/ /g, " "),
            date: new Date(value.created_at),
            last: -1,
            thumbnailMd5: value.file.md5
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
        if (this.instance == undefined) this.instance = new TagSubscriptions();
        return this.instance;
    }
}
