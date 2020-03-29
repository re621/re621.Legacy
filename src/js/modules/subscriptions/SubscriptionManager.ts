import { RE6Module } from "../../components/RE6Module";
import { HeaderCustomizer } from "../general/HeaderCustomizer";
import { Tabbed } from "../../components/structure/Tabbed";
import { Modal } from "../../components/structure/Modal";
import { Subscription } from "./Subscription";

export class SubscriptionManager extends RE6Module {

    private static instance: SubscriptionManager;
    //should notifications be cleared once seen?
    public dismissOnUpdate: boolean = true;
    private updateInterval = 60 * 60; //1 hour, in seconds

    private tabNotificationsCount = 0;
    private subscribers: Subscription[] = [];

    public openSubsButton: { link: any; tab?: JQuery<HTMLElement>; };

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public async create() {
        if (!this.canInitialize()) return;
        super.create();
        // Create a button in the header
        this.openSubsButton = HeaderCustomizer.getInstance().createTabElement({
            name: `<i class="fas fa-bell"></i>`,
            parent: "menu.extra",
            controls: false,
        });

        let content = [];
        for (const sub of this.subscribers) {
            await this.initSubscriber(sub);
            content.push({ name: sub.getName(), page: sub.tab });
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

        //clear the notifications if the user opened the tab
        modal.getElement().on("dialogopen", event => {
            const index = modal.getElement().tabs("option", "active");
            const $element = $(event.currentTarget).find("[data-subscribtion-class]").eq(index);
            this.removeUnopened($element);
        });

        modal.getElement().tabs({
            activate: (event, tabProperties) => {
                const $element = tabProperties.newPanel.find(".subscriptions-list");
                this.removeUnopened($element);
            }
        });
    }

    public updateNotificationSymbol(difference: number) {
        this.tabNotificationsCount += difference;
        this.openSubsButton.link.attr("data-has-notifications", (this.tabNotificationsCount > 0).toString());
    }

    /**
     * Adds a subscriber to the list of them and creates a tab for it.
     * @param instance subscriber to be queued for update check
     */
    public static registerSubscriber(instance: Subscription) {
        this.getInstance().subscribers.push(instance);
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
    public async initSubscriber(instance: Subscription) {
        const moduleName = instance.constructor.name;
        let lastUpdate: number = instance.fetchSettings("lastUpdate");
        let cachedUpdates: Update[] = this.fetchSettings("cache-" + moduleName);

        if (lastUpdate === undefined) {
            lastUpdate = new Date().getTime();
            instance.pushSettings("lastUpdate", lastUpdate);
        }
        if (cachedUpdates === undefined) {
            cachedUpdates = [];
        }

        instance.tab = SubscriptionManager.createTabContent();
        instance.tab.attr("data-subscribtion-class", moduleName);
        instance.lastUpdate = lastUpdate;
        const currentDate = new Date().getTime();

        //don't update if the last check was pretty recently
        if (currentDate - lastUpdate - (this.updateInterval * 1000) < 0) {
            this.addUpdateEntries(instance, cachedUpdates);
            return;
        }

        const updates = await instance.getUpdatedEntries();
        this.addUpdateEntries(instance, updates);
        instance.pushSettings("lastUpdate", currentDate);
        this.pushSettings("cache-" + moduleName, updates);
    }

    /**
     * Adds the passed updates to the tab of the subscriber
     */
    public addUpdateEntries(instance: Subscription, updates: Update[]) {
        if (updates.length === 0) {
            $("<div>")
                .addClass("subscriptions-notice")
                .html("All caught up!")
                .appendTo(instance.tab);
        } else {
            updates.forEach(entry => {
                instance.tab.append(instance.createUpdateEntry(entry));
            });
            this.updateNotificationSymbol(1);
            instance.tab.attr("data-remove-notification-count", "true");
        }
    }

    protected removeUnopened($element: JQuery<HTMLElement>) {
        if ($element.attr("data-remove-notification-count") === "true" && this.dismissOnUpdate === true) {
            this.updateNotificationSymbol(-1);
            this.pushSettings("cache-" + $element.attr("data-subscription-class"), []);
        }
    }

    protected getDefaultSettings() {
        return {
            enabled: true
        };
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
    thumbnailMd5: string
    extra?: any
}
