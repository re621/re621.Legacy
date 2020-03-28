import { RE6Module } from "../../components/RE6Module";
import { ApiPool } from "../../components/api/responses/ApiPool";
import { Api } from "../../components/api/Api";
import { HeaderCustomizer } from "./HeaderCustomizer";
import { Tabbed } from "../../components/structure/Tabbed";
import { Modal } from "../../components/structure/Modal";
import { Util } from "../../components/structure/Util";
import { Page, PageDefintion } from "../../components/data/Page";

export class SubscriptionManager extends RE6Module {

    private static instance: SubscriptionManager;

    private static updateLimit: number = 20;
    private static dismissOnUpdate: boolean = true;

    private lastUpdate: Date;

    private poolsTab: JQuery<HTMLElement>;
    private forumTab: JQuery<HTMLElement>;
    private tagsTab: JQuery<HTMLElement>;

    private openSubsButton: { link: any; tab?: JQuery<HTMLElement>; };

    private constructor() {
        super();
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new SubscriptionManager();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            enabled: true,
            pools: [],
            pools_overflow: [],
            lastUpdate: "",
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();

        if (this.fetchSettings("lastUpdate") == "") this.lastUpdate = new Date();
        else this.lastUpdate = new Date(this.fetchSettings("lastUpdate"));

        this.buildDOM();
        this.buildButtons();

        this.loadPools(async (data: Update[], images, trimmed) => {
            if (data.length == 0) {
                $("<div>")
                    .addClass("subscriptions-notice")
                    .html("All caught up!")
                    .appendTo(this.poolsTab);
            } else {
                data.forEach((entry) => {
                    this.poolsTab.append(this.createUpdateEntry(entry, images[entry.last]));
                });
                if (trimmed > 0) {
                    $("<div>")
                        .addClass("subscriptions-notice")
                        .html("... plus " + trimmed + " more")
                        .appendTo(this.poolsTab);
                }
                this.openSubsButton.link.attr("data-has-notifications", "true");
            }
        });
    }

    /** Builds the module structure */
    private buildDOM() {

        // Create a button in the header
        this.openSubsButton = HeaderCustomizer.getInstance().createTabElement({
            name: `<i class="fas fa-bell"></i>`,
            parent: "menu.extra",
            controls: false,
        });

        // Establish the modal window contents
        this.poolsTab = this.createTabContent();
        this.forumTab = this.createTabContent();
        this.tagsTab = this.createTabContent();

        let $subsTabs = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Pools", page: this.poolsTab },
                { name: "Forum", page: this.forumTab },
                { name: "Tags", page: this.tagsTab },
            ]
        });

        // Create the modal
        let modal = new Modal({
            title: "Subscriptions",
            triggers: [{ element: this.openSubsButton.link }],
            escapable: false,
            content: $subsTabs.create(),
            position: { my: "right top", at: "right top" }
        });

        modal.getElement().on("dialogopen", (event) => {
            this.lastUpdate = new Date();
            this.pushSettings("lastUpdate", this.lastUpdate, true);
        });
    }

    /** Create the "Subscribe" / "Unsubscribe" buttons */
    private buildButtons() {
        if (Page.matches(PageDefintion.pool)) {
            let $header = $("div#c-pools > div#a-show > h1").first();
            let subscribeButton = $("<button>")
                .addClass("subscribe-button subscribe")
                .html("Subscribe")
                .appendTo($header);
            let unsubscribeButton = $("<button>")
                .addClass("subscribe-button unsubscribe")
                .html("Unsubscribe")
                .appendTo($header);

            let poolData = this.fetchSettings("pools", true);

            if (poolData.indexOf(parseInt(Page.getPageID())) === -1) {
                unsubscribeButton.addClass("hidden");
            } else { subscribeButton.addClass("hidden"); }

            subscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                poolData = this.fetchSettings("pools", true);

                poolData.push(parseInt(Page.getPageID()));
                this.pushSettings("pools", poolData);
            });
            unsubscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                poolData = this.fetchSettings("pools", true);

                poolData = poolData.splice(poolData.indexOf(parseInt(Page.getPageID()), 1));
                this.pushSettings("pools", poolData);
            });
        }
    }

    private createTabContent() {
        let $content = $("<div>")
            .addClass("subscriptions-list");

        return $content;
    }

    private createUpdateEntry(data: Update, image: string) {
        let $content = $("<div>")
            .addClass("subscription-update");

        // Image
        let $image = $("<div>")
            .addClass("subscription-update-preview")
            .appendTo($content);
        $("<img>")
            .attr("src", image)
            .appendTo($image);

        // Entry Title
        let $title = $("<div>")
            .addClass("subscription-update-title")
            .appendTo($content);
        $("<a>")
            .html(data.name)
            .attr({
                "href": "/posts/" + data.last + "?pool_id=" + data.id,
                "data-id": data.id,
            })
            .appendTo($title);

        // Link to all posts page
        let $full = $("<div>")
            .addClass("subscription-update-full")
            .appendTo($content);
        $("<a>")
            .attr("href", "/pool/" + data.id)
            .html("All Posts")
            .appendTo($full);

        // Last Updated
        let $date = $("<div>")
            .addClass("subscription-update-date")
            .appendTo($content);
        $("<span>")
            .html(Util.timeAgo(data.date))
            .attr("title", data.date.toLocaleString())
            .appendTo($date);

        return $content;
    }

    private async loadPools(fn: Function) {
        let results: Update[] = [];
        let preview: string[] = [];

        let poolData = this.fetchSettings("pools", true);
        if (poolData.length == 0) {
            fn([], {});
            return;
        }

        let poolsJson: ApiPool[] = await Api.getJson("/pools.json?search[id]=" + poolData.join(","));
        let index = 0,
            limit = SubscriptionManager.updateLimit,

            overflow = this.fetchSettings("pools_overflow"),
            newOverflow = [],
            trimmed = 0;
        poolsJson.forEach((value) => {
            if (new Date(value.updated_at).getTime() > this.lastUpdate.getTime() || !SubscriptionManager.dismissOnUpdate || overflow.indexOf(value.id) !== -1) {
                console.log("processing");
                if (index >= limit) {
                    newOverflow.push(value.id);
                    trimmed++;
                } else {
                    preview.push("id:" + value.post_ids[value.post_ids.length - 1]);
                    results.push(this.formatPoolUpdate(value));
                    index++;
                }
            }
        });
        this.pushSettings("pools_overflow", newOverflow, true);

        let images = {};
        /*
        let postsJson: ApiPost[] = (await Api.getJson("/posts.json?tags=" + lastImg.join("+"))).posts;
        postsJson.forEach((value) => {
            images[value.id] = value.preview;
        });
        */
        preview.forEach((entry) => {
            images[entry.substr(3)] = "https://static1.e621.net/data/preview/1f/fc/1ffc0e7f96c7e541181b40bfb52e130b.jpg";
        });

        fn(results, images, trimmed);
    }

    private formatPoolUpdate(value: ApiPool): Update {
        return {
            type: "pool",
            id: value.id,
            name: value.name.replace(/_/g, " "),
            date: new Date(value.updated_at),
            last: value.post_ids[value.post_ids.length - 1],
        };
    }

}

interface Update {
    type: "pool",
    id: number,
    name: string,
    date: Date,
    last: number
}
