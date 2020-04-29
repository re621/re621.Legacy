import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { Post } from "../../components/data/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Subscription, UpdateActions } from "./Subscription";
import { SubscriptionSettings, UpdateContent, UpdateData } from "./SubscriptionManager";

export class TagSubscriptions extends RE6Module implements Subscription {

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            data: {},
            cache: {},
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

    public async getUpdatedEntries(lastUpdate: number, status: JQuery<HTMLElement>): Promise<UpdateData> {
        const results: UpdateData = {};

        status.append(`<div>. . . retreiving settings</div>`);
        const tagData: SubscriptionSettings = await this.fetchSettings("data", true);
        if (Object.keys(tagData).length === 0) return results;

        status.append(`<div>. . . sending API requests</div>`);
        for (const tagName of Object.keys(tagData)) {
            status.append(`<div>&nbsp; &nbsp; &nbsp; ` + tagName.replace(/ /g, "_") + `</div>`);
            const postsJson = await E621.Posts.get<APIPost>({ "tags": encodeURIComponent(tagName.replace(/ /g, "_")) }, 500);
            for (const post of postsJson) {
                const postObject = new Post(post);
                if (new Date(post.created_at).getTime() > lastUpdate && !postObject.matchesBlacklist()) {
                    results[new Date(post.created_at).getTime()] = await this.formatPostUpdate(post, tagName);
                }
            }
        }

        status.append(`<div>. . . outputting results</div>`);
        await this.pushSettings("data", tagData);
        return results;
    }

    private async formatPostUpdate(value: APIPost, tagName: string): Promise<UpdateContent> {
        return {
            id: value.id,
            name: tagName.replace(/ /g, " "),
            md5: value.file.ext === "swf" ? "" : value.file.md5,
            new: true,
        };
    }

    public async clearCache(): Promise<boolean> {
        return this.pushSettings("cache", {});
    }

}
