import { RE6Module } from "../../components/RE6Module";
import { HeaderCustomizer } from "../general/HeaderCustomizer";
import { Tabbed } from "../../components/structure/Tabbed";
import { Modal } from "../../components/structure/Modal";
import { Util } from "../../components/structure/Util";
import { Subscriber } from "./Subscriber";

export class SubscriptionManager extends RE6Module {

    private static instance: SubscriptionManager;
    public static dismissOnUpdate: boolean = true;
    private static updateInterval = 60 * 60; //1 hour, in seconds


    private tabs = new Map<string, JQuery<HTMLElement>>();

    public openSubsButton: { link: any; tab?: JQuery<HTMLElement>; };

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();
        this.init();
    }

    /** Builds the module structure */
    private init() {

        // Create a button in the header
        this.openSubsButton = HeaderCustomizer.getInstance().createTabElement({
            name: `<i class="fas fa-bell"></i>`,
            parent: "menu.extra",
            controls: false,
        });

        let content = [];
        for (const entry of this.tabs.entries()) {
            content.push({ name: entry[0], page: entry[1] });
        }

        let $subsTabs = new Tabbed({
            name: "settings-tabs",
            content: content
        });

        // Create the modal
        let modal = new Modal({
            title: "Subscriptions",
            triggers: [{ element: this.openSubsButton.link }],
            escapable: false,
            content: $subsTabs.create(),
            position: { my: "right top", at: "right top" }
        });
    }

    /**
     * Adds a subscriber to the list of them and creates a tab for it.
     * @param instance subscriber to be queued for update check
     */
    public static registerSubscriber(instance: Subscriber) {
        this.getInstance().tabs.set(instance.getName(), instance.tab);
        instance.addSubscribeButtons();
    }

    public static createTabContent() {
        let $content = $("<div>")
            .addClass("subscriptions-list");

        return $content;
    }

    /**
     * Starts checking for updates for the passed subscriber
     */
    public static async initSubscriber(instance: Subscriber) {
        let lastUpdate: number = instance.fetchSettings("lastUpdate");
        if (lastUpdate === undefined) {
            lastUpdate = new Date().getTime();
        }
        instance.lastUpdate = lastUpdate;
        const currentDate = new Date().getTime();
        //don't update if the last check was pretty recently
        if (currentDate - lastUpdate - (this.updateInterval * 1000) < 0) {
            return;
        }

        instance.tab = SubscriptionManager.createTabContent();
        const updates = await instance.getUpdatedEntries();
        this.addUpdateEntries(instance, updates);
        instance.pushSettings("lastUpdate", currentDate);
    }

    /**
     * Adds the passed updates to the tab of the subscriber
     */
    public static addUpdateEntries(instance: Subscriber, updates: Update[]) {
        if (updates.length == 0) {
            $("<div>")
                .addClass("subscriptions-notice")
                .html("All caught up!")
                .appendTo(instance.tab);
        } else {
            updates.forEach(entry => {
                instance.tab.append(instance.createUpdateEntry(entry));
            });
            this.getInstance().openSubsButton.link.attr("data-has-notifications", "true");
        }
    }

    public static getInstance() {
        if (this.instance == undefined) this.instance = new SubscriptionManager();
        return this.instance;
    }

}

export interface Update {
    id: number,
    name: string,
    date: Date,
    last: number,
    extra: any
}
