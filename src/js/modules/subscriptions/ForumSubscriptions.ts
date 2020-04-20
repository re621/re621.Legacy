import { UpdateData, UpdateDefinition, SubscriptionSettings, UpdateContent } from "./SubscriptionManager";
import { E621 } from "../../components/api/E621";
import { Page, PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { APIForumTopic } from "../../components/api/responses/APIForumTopic";
import { User } from "../../components/data/User";

export class ForumSubscriptions extends RE6Module implements Subscription {

    updateDefinition: UpdateDefinition = {
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

    limit: number;

    public getName(): string {
        return "Forums";
    }

    getSubscriberId(): string {
        return Page.getPageID();
    }

    getButtonElements(): JQuery<HTMLElement> {
        if (Page.matches(PageDefintion.forumPost)) return $("div#c-forum-topics").first();
        else return $();
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

        const forumData: SubscriptionSettings = await this.fetchSettings("data", true);
        if (Object.keys(forumData).length === 0) {
            return results;
        }

        const forumsJson = await E621.ForumTopics.get<APIForumTopic>({ "search[id]": Object.keys(forumData).join(",") });
        for (const forumJson of forumsJson) {
            if (new Date(forumJson.updated_at).getTime() > lastUpdate && forumJson.updater_id !== User.getUserID()) {
                results[new Date(forumJson.updated_at).getTime()] = await this.formatForumUpdate(forumJson);
            }
        }
        await this.pushSettings("data", forumData);
        return results;
    }

    private async formatForumUpdate(value: APIForumTopic): Promise<UpdateContent> {
        return {
            id: value.id,
            name: value.title,
            md5: "",
            extra: {    //comment count
                count: value.response_count
            }
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
