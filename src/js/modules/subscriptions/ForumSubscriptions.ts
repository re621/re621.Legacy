import { E621 } from "../../components/api/E621";
import { APIForumTopic } from "../../components/api/responses/APIForumTopic";
import { Page, PageDefintion } from "../../components/data/Page";
import { User } from "../../components/data/User";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Subscription, UpdateActions } from "./Subscription";
import { SubscriptionSettings, UpdateContent, UpdateData } from "./SubscriptionManager";

export class ForumSubscriptions extends RE6Module implements Subscription {

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            data: {},
            cache: {},
        };
    }

    updateActions: UpdateActions = {
        imageSrc: () => {
            return "";
        },
        updateHref: (data) => {
            return `/forum_topics/${data.id}?page=${Math.ceil(data.extra.count / 75)}`;   //75 replies per page
        },
        updateText: (data) => {
            return data.name;
        },
        sourceHref: (data) => {
            return `/forum_topics/${data.id}`;
        },
        sourceText: () => {
            return "First Page";
        }
    };

    public getName(): string {
        return "Forums";
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
        if (Page.matches(PageDefintion.forumPost)) return $("div#c-forum-topics").first();
        else return $();
    }

    public insertButton($element: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void {
        $element.prepend($button);
    }

    public getSubscriberId(): string {
        return Page.getPageID();
    }

    public getSubscriberName(): string {
        return $("div#c-forum-topics div#a-show h1").first().text().trim().replace("Topic: ", "");
    }

    // ===== Updates =====

    public async getUpdatedEntries(lastUpdate: number): Promise<UpdateData> {
        const results: UpdateData = {};

        const forumData: SubscriptionSettings = await this.fetchSettings("data", true);
        if (Object.keys(forumData).length === 0) return results;

        const forumsJson = await E621.ForumTopics.get<APIForumTopic>({ "search[id]": Object.keys(forumData).join(",") }, 500);
        for (const forumJson of forumsJson) {
            if (new Date(forumJson.updated_at).getTime() > lastUpdate && forumJson.updater_id !== User.getUserID()) {
                results[new Date(forumJson.updated_at).getTime()] = await this.formatForumUpdate(forumJson);
            }

            // Fetch and update the saved forum thread name
            forumData[forumJson.id].name = forumJson.title.replace(/_/g, " ");
        }
        await this.pushSettings("data", forumData);
        return results;
    }

    private async formatForumUpdate(value: APIForumTopic): Promise<UpdateContent> {
        return {
            id: value.id,
            name: value.title,
            md5: "",
            extra: {    // comment count
                count: value.response_count
            },
            new: true,
        };
    }

    public async clearCache(): Promise<boolean> {
        return this.pushSettings("cache", {});
    }

}
