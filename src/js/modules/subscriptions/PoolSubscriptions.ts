import { UpdateData, UpdateDefinition, SubscriptionSettings, UpdateContent } from "./SubscriptionManager";
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
            return Post.createPreviewUrlFromMd5(data.md5);
        },
        imageHref: (data) => {
            return `https://e621.net/pools/${data.id}`;
        },
        updateHref: (data) => {
            return `https://e621.net/posts/${data.extra.last}?pool_id=${data.id}`;
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
    tab: JQuery<HTMLElement>;

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

    public async getUpdatedEntries(lastUpdate: number): Promise<UpdateData> {
        const results: UpdateData = {};

        const poolData: SubscriptionSettings = this.fetchSettings("data", true);
        if (Object.keys(poolData).length === 0) {
            return results;
        }

        const poolsJson: ApiPool[] = await Api.getJson("/pools.json?search[id]=" + Object.keys(poolData).join(","));
        for (const poolJson of poolsJson) {
            if (poolData[poolJson.id].lastId === undefined || !poolJson.post_ids.includes(poolData[poolJson.id].lastId)) {
                poolData[poolJson.id].lastId = poolJson.post_ids[poolJson.post_ids.length - 1];
            }
            const previousStop = poolJson.post_ids.indexOf(poolData[poolJson.id].lastId);
            //there is only an update if there are posts after the previous last post id
            //If the post id isn't there anymore (supperior version added) show an update
            if (new Date(poolJson.updated_at).getTime() > lastUpdate && poolJson.post_ids.length > previousStop) {
                results[new Date(poolJson.updated_at).getTime()] = await this.formatPoolUpdate(poolJson, poolData);
            }
            poolData[poolJson.id].lastId = poolJson.post_ids[poolJson.post_ids.length - 1];
        }
        this.pushSettings("data", poolData);
        return results;
    }

    private async formatPoolUpdate(value: ApiPool, subSettings: SubscriptionSettings): Promise<UpdateContent> {
        const poolInfo = subSettings[value.id];
        if (poolInfo.md5 === undefined) {
            const post: ApiPost = (await Api.getJson(`/posts/${value.post_ids[0]}.json`)).post;
            poolInfo.md5 = post.file.md5;
        }
        return {
            id: value.id,
            name: value.name.replace(/_/g, " "),
            md5: poolInfo.md5,
            extra: {    //last pool post id
                last: value.post_ids[value.post_ids.length - 1]
            },
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
