import { E621 } from "../../components/api/E621";
import { APIComment } from "../../components/api/responses/APIComment";
import { APIPost } from "../../components/api/responses/APIPost";
import { Page, PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";
import { User } from "../../components/data/User";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { Subscription } from "./SubscriptionManager";
import { SubscriptionTracker, UpdateActions, UpdateCache, UpdateContent, UpdateData } from "./SubscriptionTracker";

export class CommentTracker extends RE6Module implements SubscriptionTracker {

    private cache: UpdateCache;

    public constructor() {
        super();
        this.cache = new UpdateCache(this);
    }

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
            return `/posts/${data.extra.parent}`;
        },
        imageRemoveOnError: true,
        updateHref: (data) => {
            return `/users/${data.extra.author}`
        },
        updateText: (data) => {
            return data.name;
        },
        sourceHref: (data) => {
            return `/posts/${data.extra.parent}#comment-${data.id}`;
        },
        sourceText: () => {
            return "Reply";
        }
    };

    public getName(): string {
        return "Comments";
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
        if (Page.matches(PageDefintion.post)) return $("menu#post-sections").first();
        else return $();
    }

    public insertButton($element: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void {
        $element.append($button);
    }

    public getSubscriberId(): string {
        return Page.getPageID();
    }

    public getSubscriberName(): string {
        return "#" + $("section#image-container").attr("data-id");
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

        status.append(`<div>&nbsp; &nbsp; &nbsp; fetching posts</div>`);
        const storedSubChunks = Util.chunkArray(Object.keys(storedSubs), this.subBatchSize);
        const postsJSON: APIPost[] = [];
        for (const [index, chunk] of storedSubChunks.entries()) {
            if (storedSubChunks.length > 1) status.append(`<div>&nbsp; &nbsp; &nbsp; - processing batch #${index}</div>`);
            postsJSON.push(...await E621.Posts.get<APIPost>({ "tags": "id:" + chunk.join(",") }, 500));
        }

        status.append(`<div>&nbsp; &nbsp; &nbsp; fetching comments</div>`);
        const commentsJSON: APIComment[] = [];
        for (const [index, chunk] of storedSubChunks.entries()) {
            if (storedSubChunks.length > 1) status.append(`<div>&nbsp; &nbsp; &nbsp; - processing batch #${index}</div>`);
            commentsJSON.push(...await E621.Comments.get<APIComment>({ "group_by": "comment", "search[post_id]": chunk.join(",") }, 500));
        }

        status.append(`<div>. . . processing data</div>`);
        // Put post data into a map for easier retrieval
        const posts: Map<number, APIPost> = new Map();
        postsJSON.forEach((post) => { posts.set(post.id, post); });

        // Retrieve only the newest comment
        const data: Map<number, APIComment> = new Map();
        commentsJSON.forEach((value) => {
            if (data.get(value.post_id) === undefined || data.get(value.post_id).created_at < value.created_at)
                data.set(value.post_id, value);
        });

        status.append(`<div>. . . formatting output</div>`);
        for (const comment of data.values()) {
            if (new Date(comment.created_at).getTime() > lastUpdate && comment.updater_id !== User.getUserID())
                results[new Date(comment.created_at).getTime()] = await this.formatCommentUpdate(comment, posts.get(comment.post_id));

            // Fetch and update the saved forum thread name
            storedSubs[comment.post_id].name = "#" + comment.post_id;
        }

        status.append(`<div>. . . outputting results</div>`);
        await this.pushSettings("data", storedSubs);
        return results;
    }

    private async formatCommentUpdate(value: APIComment, post: APIPost): Promise<UpdateContent> {
        const body = Util.parseDText(value.body);
        return {
            id: value.id,
            name: value.creator_name,
            nameExtra: body.length > 256 ? body.substr(0, 255) + "&hellip;" : body,
            md5: post.file.ext === "swf" ? "" : post.file.md5,
            extra: {
                // Post to which the comment belongs
                parent: post.id,
                // ID of the user who posted the comment
                author: value.creator_id,
            },
            new: true,
        };
    }

}
