import { UpdateData, UpdateDefinition, SubscriptionSettings } from "./SubscriptionManager";
import { ApiPool } from "../../components/api/responses/ApiPool";
import { Api } from "../../components/api/Api";
import { Page } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { ApiPost } from "../../components/api/responses/ApiPost";
import { Post } from "../../components/data/Post";

export class PoolSubscriptions extends RE6Module implements Subscription {
    updateDefinition: UpdateDefinition = {
        imageSrc: (data) => {
            return Post.createPreviewUrlFromMd5(data.thumbnailMd5);
        },
        imageHref: (data) => {
            return `https://e621.net/pools/${data.id}`;
        },
        updateHref: (data) => {
            return `https://e621.net/posts/${data.last}?pool_id=${data.id}`;
        },
        updateText: (data) => {
            return data.name;
        },
        sourceHref: (data) => {
            return `https://e621.net/pools/${data.id}`;
        },
        sourceText: () => {
            return "All Posts";
        }
    };

    limit: number;
    lastUpdate: number;
    tab: JQuery<HTMLElement>;

    private static instance: PoolSubscriptions;

    public getName(): string {
        return "Pools";
    }

    public getSubscriberId(): string {
        return Page.getPageID();
    }

    public getElementsToInsertAfter(): JQuery<HTMLElement> {
        return $("div#c-pools > div#a-show > h1:first").first();
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

        const poolData: SubscriptionSettings = this.fetchSettings("data", true);
        if (Object.keys(poolData).length === 0) {
            return results;
        }

        const poolsJson: ApiPool[] = await Api.getJson("/pools.json?search[id]=" + Object.keys(poolData).join(","));
        for (const poolJson of poolsJson) {
            if (new Date(poolJson.updated_at).getTime() > this.lastUpdate) {
                results.push(await this.formatPoolUpdate(poolJson, poolData));
            }
        }
        this.pushSettings("data", poolData);
        return results;
    }

    private async formatPoolUpdate(value: ApiPool, subSettings: SubscriptionSettings): Promise<UpdateData> {
        const poolInfo = subSettings[value.id] as PoolInfo;
        if (poolInfo.thumbnailMd5 === undefined) {
            const post: ApiPost = (await Api.getJson(`/posts/${value.post_ids[0]}.json`)).post;
            poolInfo.thumbnailMd5 = post.file.md5;
        }
        return {
            id: value.id,
            name: value.name.replace(/_/g, " "),
            date: new Date(value.updated_at),
            last: value.post_ids[value.post_ids.length - 1],
            thumbnailMd5: poolInfo.thumbnailMd5
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

    public static getInstance(): PoolSubscriptions {
        if (this.instance == undefined) this.instance = new PoolSubscriptions();
        return this.instance;
    }
}

export interface PoolInfo {
    thumbnailMd5?: string;
}
