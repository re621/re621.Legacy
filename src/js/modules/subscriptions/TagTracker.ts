import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { Post } from "../../components/data/Post";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";
import { Subscription, SubscriptionManager } from "./SubscriptionManager";
import { SubscriptionTracker, UpdateActions, UpdateCache, UpdateContent, UpdateData } from "./SubscriptionTracker";

export class TagTracker extends RE6Module implements SubscriptionTracker {

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
            return `/posts/${data.id}`;
        },
        imageRemoveOnError: true,
        updateText: (data) => {
            return data.name;
        },
        sourceHref: (data) => {
            return `/posts?tags=${encodeURIComponent(data.name.replace(/ /g, "_"))}`;
        },
        sourceText: () => {
            return "View Tag";
        }
    };

    public getName(): string {
        return "Tags";
    }

    // ===== Buttons =====

    public makeSubscribeButton(): JQuery<HTMLElement> {
        return $("<a>")
            .attr({
                "href": "#",
                "title": "Subscribe",
            })
            .addClass("tag-subscription-button subscribe")
            .html(`<i class="far fa-heart"></i>`);
    }

    public makeUnsubscribeButton(): JQuery<HTMLElement> {
        return $("<a>")
            .attr({
                "href": "#",
                "title": "Unsubscribe",
            })
            .addClass("tag-subscription-button unsubscribe")
            .html(`<i class="fas fa-heart"></i>`);
    }

    public getButtonAttachment(): JQuery<HTMLElement> {
        return $("#tag-box li span.tag-action-subscribe, #tag-list li span.tag-action-subscribe");
    }

    public insertButton($element: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void {
        $element.append($button);
    }

    public getSubscriberId($element: JQuery<HTMLElement>): string {
        return $element.parent().attr("data-tag");
    }

    public getSubscriberName($element: JQuery<HTMLElement>): string {
        return $element.parent().attr("data-tag").replace(/_/g, " ");
    }

    // ===== Updates =====

    public subBatchSize = 40;

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
        const apiChunks: APIPost[][] = [];
        for (const [index, chunk] of storedSubChunks.entries()) {
            if (storedSubChunks.length > 1) status.append(`<div>&nbsp; &nbsp; &nbsp; - processing batch #${index}</div>`);
            apiChunks.push(await E621.Posts.get<APIPost>({ "tags": chunk.map(el => "~" + el).join("+"), "limit": 320 }, 500));
        }

        Debug.log("posts from " + Util.formatTime(new Date(lastUpdate)));
        Debug.log(apiChunks);
        status.append(`<div>. . . formatting output</div>`);
        const postLimit = ModuleController.get(SubscriptionManager).fetchSettings<number>("cacheSize")
        for (const apiData of apiChunks) {
            for (const post of apiData) {
                Debug.log(
                    "TgT:",
                    post.id,
                    Util.formatTime(new Date(post.created_at)),
                    new Date(post.created_at).getTime() > lastUpdate ? "new" : "old"
                );

                // Stop loading updates if they will get trimmed from the cache anyways
                if (Object.keys(results).length > postLimit) {
                    Debug.log("TgT: postlimit");
                    break;
                }

                // Posts are ordered by upload date, with newest first
                // Thus, if one post fails the age check, so will any that follow
                if (new Date(post.created_at).getTime() < lastUpdate) {
                    Debug.log("TgT: lastupdate");
                    break;
                }

                // Only add posts that match the blacklist
                if (new Post(post).matchesBlacklist(true)) {
                    Debug.log("TgT: blacklist");
                    continue;
                }

                results[new Date(post.created_at).getTime()] = await this.formatPostUpdate(post);
            }
        }

        status.append(`<div>. . . outputting results</div>`);
        await this.pushSettings("data", storedSubs);
        return results;
    }

    private async formatPostUpdate(value: APIPost): Promise<UpdateContent> {
        return {
            id: value.id,
            name: "post #" + value.id,
            md5: value.file.ext === "swf" ? "" : value.file.md5,
            new: true,
        };
    }

}
