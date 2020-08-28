import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { Blacklist } from "../../components/data/Blacklist";
import { ModuleController } from "../../components/ModuleController";
import { PostData } from "../../components/post/Post";
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
            return PostData.createPreviewUrlFromMd5(data.md5);
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

    public maxSubscriptions = 1200;

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
        const apiResult: { [timestamp: number]: APIPost } = {};
        for (const [index, chunk] of storedSubChunks.entries()) {
            if (storedSubChunks.length > 1) status.append(`<div>&nbsp; &nbsp; &nbsp; - processing batch #${index}</div>`);
            if (index == 10) status.append(`<div><span style="color:gold">warning</span> connection throttled</div>`)
            for (const post of await E621.Posts.get<APIPost>({ "tags": chunk.map(el => "~" + el).join("+"), "limit": 320 }, index < 10 ? 500 : 1000)) {
                const timestamp = new Date(post.created_at).getTime();

                // Posts are ordered by upload date, with newest first
                // Thus, if one post fails the age check, so will any that follow
                if (timestamp < lastUpdate) break;

                // Collisions are technically possible, but incredibly unlikely
                apiResult[timestamp] = post;
            }
        }

        Debug.log(apiResult);
        status.append(`<div>. . . formatting output</div>`);
        const postLimit = ModuleController.get(SubscriptionManager).fetchSettings<number>("cacheSize")
        for (const key of Object.keys(apiResult).sort()) {

            // Stop loading updates if they will get trimmed from the cache anyways
            if (Object.keys(results).length > postLimit) {
                Debug.log("TgT: postlimit");
                break;
            }

            const post: PostData = PostData.fromAPI(apiResult[key]);
            Debug.log(`TgT: ${post.id} ${Util.Time.format(new Date(post.date.raw))}`);

            // Only add posts that match the blacklist
            Blacklist.addPost(post);
            if (Blacklist.checkPost(post.id, true)) {
                Debug.log("TgT: blacklist");
                continue;
            }

            results[new Date(post.date.raw).getTime()] = await this.formatPostUpdate(post);
        }

        status.append(`<div>. . . outputting results</div>`);
        await this.pushSettings("data", storedSubs);
        return results;
    }

    private async formatPostUpdate(value: PostData): Promise<UpdateContent> {
        return {
            id: value.id,
            name: "post #" + value.id,
            md5: value.file.ext === "swf" ? "" : value.file.md5,
            new: true,
        };
    }

}
