import { UpdateData, UpdateDefinition, SubscriptionSettings, UpdateContent } from "./SubscriptionManager";
import { APIPool } from "../../components/api/responses/APIPool";
import { E621 } from "../../components/api/E621";
import { Page } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { APIPost } from "../../components/api/responses/APIPost";
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

    public getName(): string {
        return "Pools";
    }

    public getSubscriberId(): string {
        return Page.getPageID();
    }

    public getButtonElements(): JQuery<HTMLElement> {
        return $("div#c-pools > div#a-show").first();
    }

    public createSubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass(`large-subscribe-button subscribe`)
            .addClass("button btn-success")
            .html("Subscribe");
    }

    public createUnsubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass(`large-subscribe-button unsubscribe`)
            .addClass("button btn-danger")
            .html("Unsubscribe");
    }

    public insertButton($element: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void {
        $element.prepend($button);
    }

    public async getUpdatedEntries(lastUpdate: number): Promise<UpdateData> {
        const results: UpdateData = {};

        const poolData: SubscriptionSettings = await this.fetchSettings("data", true);
        if (Object.keys(poolData).length === 0) {
            return results;
        }

        const poolsJson: APIPool[] = await E621.Pools.get<APIPool>({ "search[id]": Object.keys(poolData).join(",") });
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

    private async formatPoolUpdate(value: APIPool, subSettings: SubscriptionSettings): Promise<UpdateContent> {
        const poolInfo = subSettings[value.id];
        if (poolInfo.md5 === undefined) {
            const post = (await E621.Posts.find(value.post_ids[0]).get<APIPost>())[0];
            poolInfo.md5 = post.file.ext === "swf" ? "" : post.file.md5;
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
