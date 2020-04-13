import { UpdateData, UpdateDefinition, SubscriptionSettings, UpdateContent } from "./SubscriptionManager";
import { E621 } from "../../components/api/E621";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { APIPost } from "../../components/api/responses/APIPost";
import { Post } from "../../components/data/Post";

export class TagSubscriptions extends RE6Module implements Subscription {
    updateDefinition: UpdateDefinition = {
        imageSrc: (data) => {
            return Post.createPreviewUrlFromMd5(data.md5);
        },
        imageHref: (data) => {
            return `https://e621.net/posts/${data.id}`;
        },
        imageRemoveOnError: true,
        updateText: (data) => {
            return data.name;
        },
        sourceHref: (data) => {
            return `https://e621.net/posts?tags=${encodeURIComponent(data.name.replace(/ /g, "_"))}`;
        },
        sourceText: () => {
            return "View Tag";
        }
    };

    limit: number;

    public getName(): string {
        return "Tags";
    }

    public getSubscriberId($element: JQuery<HTMLElement>): string {
        return $element.parent().attr("data-tag");
    }

    public getButtonElements(): JQuery<HTMLElement> {
        return $("#tag-box li span.tag-action-subscribe, #tag-list li span.tag-action-subscribe");
    }

    public createSubscribeButton(): JQuery<HTMLElement> {
        return $("<a>")
            .attr({
                "href": "#",
                "title": "Subscribe",
            })
            .addClass("tag-subscription-button subscribe")
            .html(`<i class="far fa-heart"></i>`);
    }

    public createUnsubscribeButton(): JQuery<HTMLElement> {
        return $("<a>")
            .attr({
                "href": "#",
                "title": "Unsubscribe",
            })
            .addClass("tag-subscription-button unsubscribe")
            .html(`<i class="fas fa-heart"></i>`);
    }

    public insertButton($element: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void {
        $element.append($button);
    }

    public async getUpdatedEntries(lastUpdate: number): Promise<UpdateData> {
        const results: UpdateData = {};

        const tagData: SubscriptionSettings = this.fetchSettings("data", true);
        if (Object.keys(tagData).length === 0) {
            return results;
        }

        for (const tagName of Object.keys(tagData)) {
            const postsJson = await E621.Posts.get<APIPost>({ "tags": encodeURIComponent(tagName.replace(/ /g, "_")) });
            for (const post of postsJson) {
                const postObject = new Post(post);
                if (new Date(post.created_at).getTime() > lastUpdate && !postObject.matchesBlacklist()) {
                    results[new Date(post.created_at).getTime()] = await this.formatPostUpdate(post, tagName);
                }
            }
        }
        this.pushSettings("data", tagData);
        return results;
    }

    private async formatPostUpdate(value: APIPost, tagName: string): Promise<UpdateContent> {
        return {
            id: value.id,
            name: tagName.replace(/ /g, " "),
            md5: value.file.ext === "swf" ? "" : value.file.md5
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
