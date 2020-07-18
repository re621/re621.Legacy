import { E621 } from "../../components/api/E621";
import { APIPool } from "../../components/api/responses/APIPool";
import { APIPost } from "../../components/api/responses/APIPost";
import { Page } from "../../components/data/Page";
import { Post } from "../../components/data/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { Subscription } from "./SubscriptionManager";
import { SubscriptionTracker, UpdateActions, UpdateCache, UpdateContent, UpdateData } from "./SubscriptionTracker";

export class PoolTracker extends RE6Module implements SubscriptionTracker {

    private cache: UpdateCache;

    public constructor() {
        super();
        this.cache = new UpdateCache(this);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            data: {},
        };
    }

    updateActions: UpdateActions = {
        imageSrc: (data) => {
            return Post.createPreviewUrlFromMd5(data.md5);
        },
        imageHref: (data) => {
            return `/pools/${data.id}`;
        },
        updateHref: (data) => {
            return `/posts/${data.extra.last}?pool_id=${data.id}`;
        },
        updateText: (data) => {
            return data.name;
        },
        sourceHref: (data) => {
            return `/pools/${data.id}`;
        },
        sourceText: () => {
            return "All Posts";
        }
    };

    public getName(): string {
        return "Pools";
    }

    // ===== Buttons =====

    public makeSubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass("large-subscribe-button subscribe")
            .addClass("button btn-success")
            .html("Subscribe");
    }

    public makeUnsubscribeButton(): JQuery<HTMLElement> {
        return $("<button>")
            .addClass("large-subscribe-button unsubscribe")
            .addClass("button btn-danger")
            .html("Unsubscribe");
    }

    public getButtonAttachment(): JQuery<HTMLElement> {
        return $("div#c-pools > div#a-show").first();
    }

    public insertButton($element: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void {
        $element.prepend($button);
    }

    public getSubscriberId(): string {
        return Page.getPageID();
    }

    public getSubscriberName(): string {
        return $("div#c-pools div#a-show h2 a").first().text().trim();
    }

    // ===== Updates =====

    public subBatchSize = 100;

    public getCache(): UpdateCache {
        return this.cache;
    }

    public async getUpdatedEntries(lastUpdate: number, status: JQuery<HTMLElement>): Promise<UpdateData> {
        const results: UpdateData = {};

        status.append(`<div>. . . retrieving settings</div>`);
        const storedSubs: Subscription = await this.fetchSettings("data", true);
        if (Object.keys(storedSubs).length === 0) return results;

        status.append(`<div>. . . sending an API request</div>`);
        const storedSubChunks = Util.chunkArray(Object.keys(storedSubs), this.subBatchSize);
        const apiData: APIPool[] = [];
        for (const [index, chunk] of storedSubChunks.entries()) {
            if (storedSubChunks.length > 1) status.append(`<div>&nbsp; &nbsp; &nbsp; - processing batch #${index}</div>`);
            apiData.push(...await E621.Pools.get<APIPool>({ "search[id]": chunk.join(",") }, 500));
        }

        status.append(`<div>. . . formatting output</div>`);
        for (const poolJson of apiData) {
            if (storedSubs[poolJson.id].lastId === undefined || !poolJson.post_ids.includes(storedSubs[poolJson.id].lastId)) {
                storedSubs[poolJson.id].lastId = poolJson.post_ids[poolJson.post_ids.length - 1];
            }

            // There is only an update if there are posts after the previous last post id
            // If the post id isn't there anymore (supperior version added) show an update
            const previousStop = poolJson.post_ids.indexOf(storedSubs[poolJson.id].lastId);
            if (new Date(poolJson.updated_at).getTime() > lastUpdate && poolJson.post_ids.length > previousStop) {
                results[new Date(poolJson.updated_at).getTime()] = await this.formatPoolUpdate(poolJson, storedSubs);
            }
            storedSubs[poolJson.id].lastId = poolJson.post_ids[poolJson.post_ids.length - 1];

            // Fetch and update the saved pool name
            storedSubs[poolJson.id].name = poolJson.name.replace(/_/g, " ");
        }

        status.append(`<div>. . . outputting results</div>`);
        await this.pushSettings("data", storedSubs);
        return results;
    }

    private async formatPoolUpdate(value: APIPool, subSettings: Subscription): Promise<UpdateContent> {
        const poolInfo = subSettings[value.id];
        if (poolInfo.md5 === undefined) {
            const post = (await E621.Posts.find(value.post_ids[0]).get<APIPost>())[0];
            poolInfo.md5 = post.file.ext === "swf" ? "" : post.file.md5;
        }
        return {
            id: value.id,
            name: value.name.replace(/_/g, " "),
            md5: poolInfo.md5,
            extra: {    // last pool post id
                last: value.post_ids[value.post_ids.length - 1]
            },
            new: true,
        };
    }

}
