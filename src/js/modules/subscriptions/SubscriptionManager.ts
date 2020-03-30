import { RE6Module, Settings } from "../../components/RE6Module";
import { Tabbed } from "../../components/structure/Tabbed";
import { Modal } from "../../components/structure/Modal";
import { Subscription } from "./Subscription";
import { Util } from "../../components/structure/Util";
import { ModuleController } from "../../components/ModuleController";
import { DomUtilities } from "../../components/structure/DomUtilities";

export class SubscriptionManager extends RE6Module {

    //should notifications be cleared once seen?
    private updateInterval = 60 * 60; //1 hour, in seconds
    private historySize = 5;

    private tabNotificationsCount = 0;
    private subscribers: Subscription[] = [];

    public openSubsButton: JQuery<HTMLElement>;

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public async create(): Promise<void> {
        if (!this.canInitialize()) return;
        super.create();
        // Create a button in the header
        this.openSubsButton = DomUtilities.addSettingsButton({
            name: `<i class="fas fa-bell"></i>`,
        });

        const content = [];
        for (const sub of this.subscribers) {
            await this.initSubscriber(sub);
            content.push({ name: sub.getName(), page: sub.tab });
        }

        const $subsTabs = new Tabbed({
            name: "settings-tabs",
            content: content
        });

        // Create the modal
        const modal = new Modal({
            title: "Subscriptions",
            triggers: [{ element: this.openSubsButton }],
            escapable: false,
            content: $subsTabs.create(),
            position: { my: "right top", at: "right top" }
        });

        let firstOpen = true;

        //clear the notifications if the user opened the tab
        modal.getElement().on("dialogopen", event => {
            if (firstOpen) {
                this.addTabNotifications($(event.currentTarget));
                firstOpen = false;
            }
            const index = modal.getElement().tabs("option", "active");
            const $element = $(event.currentTarget).find(".subscriptions-list").eq(index);
            //remove individual tab notification
            $(event.currentTarget).find(".ui-tabs-tab").eq(index).attr("data-has-notifications", "false");
            this.removeUnopened($element);
        });

        modal.getElement().tabs({
            activate: (event, tabProperties) => {
                const $element = tabProperties.newPanel.find(".subscriptions-list");
                tabProperties.newTab.attr("data-has-notifications", "false");
                this.removeUnopened($element);
            }
        });
    }

    /**
     * If the attribute remove from notification count is present it means
     * that there are updates in that tap. If it is so also add a  notification icon
     */
    private addTabNotifications($target: JQuery<HTMLElement>): void {
        const allTabs = $target.find(".ui-tabs-tab");
        const allPanels = $target.find(".subscriptions-list");
        allPanels.each((index, element) => {
            if ($(element).attr("data-remove-notification-count") === "true") {
                allTabs.eq(index).attr("data-has-notifications", "true");
            }
        });
    }

    public updateNotificationSymbol(difference: number): void {
        this.tabNotificationsCount += difference;
        this.openSubsButton.attr("data-has-notifications", (this.tabNotificationsCount > 0).toString());
    }

    /**
     * Adds a subscriber to the list of them and creates a tab for it.
     * @param instance subscriber to be queued for update check
     */
    public static register(moduleClass: any): void {
        const instance = ModuleController.getWithType<Subscription>(moduleClass);
        const manager = this.getInstance() as SubscriptionManager;
        manager.subscribers.push(instance);
    }

    public static createTabContent(): JQuery<HTMLElement> {
        const $content = $("<div>")
            .addClass("subscriptions-list");

        return $content;
    }

    /**
     * Starts checking for updates for the passed subscriber
     */
    public async initSubscriber(instance: Subscription): Promise<void> {
        const moduleName = instance.constructor.name;
        let lastUpdate: number = instance.fetchSettings("lastUpdate");

        if (lastUpdate === undefined) {
            lastUpdate = new Date().getTime();
            instance.pushSettings("lastUpdate", lastUpdate);
        }

        this.addSubscribeButtons(instance);
        instance.tab = SubscriptionManager.createTabContent();
        instance.tab.attr("data-subscription-class", moduleName);
        instance.lastUpdate = lastUpdate;
        const currentDate = new Date().getTime();

        //don't update if the last check was pretty recently
        if (currentDate - lastUpdate - (this.updateInterval * 1000) < 0) {
            this.addUpdateEntries(instance, []);
            return;
        }

        const updates = await instance.getUpdatedEntries();
        this.addUpdateEntries(instance, updates);
        instance.pushSettings("lastUpdate", currentDate);
    }

    /**
     * Creates an element through the data and how the subscriber defines it
     * @returns the element to append to a tab
     */
    private createUpdateEntry(data: UpdateData, definition: UpdateDefinition): JQuery<HTMLElement> {
        const $content = $("<div>")
            .addClass("subscription-update");

        // Image
        const $imageDiv = $("<div>")
            .addClass("subscription-update-preview")
            .appendTo($content);

        if (definition.imageHref !== undefined) {
            const $a = $("<a>")
                .attr("href", definition.imageHref(data));
            $("<img>")
                .attr("src", definition.imageSrc(data))
                .appendTo($a);
            $a.appendTo($imageDiv);
        } else {
            $("<img>")
                .attr("src", definition.imageSrc(data))
                .appendTo($imageDiv);
        }

        // Entry Title
        const $title = $("<div>")
            .addClass("subscription-update-title")
            .appendTo($content);
        if (definition.updateHref !== undefined) {
            $("<a>")
                .html(definition.updateText(data))
                .attr({
                    "href": definition.updateHref(data),
                    "data-id": data.id,
                })
                .appendTo($title);
        } else {
            $("<div>")
                .html(definition.updateText(data))
                .attr("data-id", data.id)
                .appendTo($title);
        }


        // Link to all posts page
        const $full = $("<div>")
            .addClass("subscription-update-full")
            .appendTo($content);
        if (definition.sourceHref !== undefined) {
            $("<a>")
                .attr("href", definition.sourceHref(data))
                .html(definition.sourceText(data))
                .appendTo($full);
        } else {
            $("<div>")
                .html(definition.sourceText(data))
                .appendTo($full);
        }


        // Last Updated
        const $date = $("<div>")
            .addClass("subscription-update-date")
            .appendTo($content);
        $("<span>")
            .html(Util.timeAgo(data.date))
            .attr("title", new Date(data.date).toLocaleString())
            .appendTo($date);

        return $content;
    }

    public addSubscribeButtons(instance: Subscription): void {
        let subscriptionData: SubscriptionSettings = instance.fetchSettings("data", true);
        instance.getElementsToInsertAfter().each((index, element) => {
            const $element = $(element);

            const $subscribeButton = instance.createSubscribeButton();
            const $unsubscribeButton = instance.createUnsubscribeButton();

            const id = instance.getSubscriberId($element);

            if (subscriptionData[id] === undefined) {
                $unsubscribeButton.addClass("hidden");
            } else { $subscribeButton.addClass("hidden"); }

            $subscribeButton.click((e) => {
                e.preventDefault();
                $subscribeButton.toggleClass("hidden");
                $unsubscribeButton.toggleClass("hidden");
                subscriptionData = instance.fetchSettings("data", true);
                subscriptionData[id] = {};
                instance.pushSettings("data", subscriptionData);
            });
            $unsubscribeButton.click((e) => {
                e.preventDefault();
                $subscribeButton.toggleClass("hidden");
                $unsubscribeButton.toggleClass("hidden");
                subscriptionData = instance.fetchSettings("data", true);

                delete subscriptionData[id];
                instance.pushSettings("data", subscriptionData);
            });
            $subscribeButton.insertAfter($element);
            $unsubscribeButton.insertAfter($element);
        });
    }

    /**
     * Adds the passed updates to the tab of the subscriber
     */
    public addUpdateEntries(instance: Subscription, updates: UpdateData[]): void {
        if (updates.length === 0) {
            instance.tab.append(this.createUpToDateDivider());
        } else {
            instance.tab.attr("data-remove-notification-count", "true");
            this.updateNotificationSymbol(1);
        }

        const cache = this.addToCache(instance, updates);

        //Sort cache by time highest to lowest
        const timestamps = Object.keys(cache).sort((a, b) => parseInt(b) - parseInt(a));
        for (let i = 0; i < timestamps.length; i++) {
            instance.tab.append(this.createCacheDivider(i + 1, parseInt(timestamps[i])));
            for (const update of cache[timestamps[i]]) {
                instance.tab.append(this.createUpdateEntry(update, instance.updateDefinition));
            }
        }
    }

    private createUpToDateDivider(): JQuery<HTMLElement> {
        const update: UpdateData = { date: new Date().getTime(), id: -1, last: -1, name: "All up to date!", md5: "" };
        const definition: UpdateDefinition = {
            imageSrc: () => "",
            sourceText: () => "",
            updateText: data => data.name

        }
        return this.createUpdateEntry(update, definition);
    }

    private createCacheDivider(index: number, timestamp: number): JQuery<HTMLElement> {
        const update: UpdateData = { date: new Date(timestamp).getTime(), id: -1, last: -1, name: "Update Nr." + index, md5: "" };
        const definition: UpdateDefinition = {
            imageSrc: () => "",
            sourceText: () => "",
            updateText: data => data.name

        }
        return this.createUpdateEntry(update, definition);
    }

    public addToCache(instance: Subscription, updates: UpdateData[]): UpdateCache {
        let cache: UpdateCache = instance.fetchSettings("cache");
        if (cache === undefined) {
            cache = {};
        }

        if (updates.length === 0) {
            return cache;
        }
        const currentTime = new Date().getTime();
        cache[currentTime] = updates;

        //if the cache is larger than the limit, remove the entry with the lowest timestamp
        if (Object.keys(cache).length > this.historySize) {
            delete cache[Math.min(...Object.keys(cache).map(e => parseInt(e)))];
        }

        //remove all non unique updates
        //forumposts may get replies all the time, only the recent one is important
        const uniqueKeys = [];
        const nonUniqueKeys = [];
        for (const timestamp of Object.keys(cache).sort((a, b) => parseInt(b) - parseInt(a))) {
            for (const update of cache[timestamp]) {
                if (uniqueKeys.indexOf(update.id) === -1) {
                    uniqueKeys.push(update.id);
                } else {
                    nonUniqueKeys.push(update.id);
                }
            }
            cache[timestamp] = cache[timestamp].filter(update => !nonUniqueKeys.includes(update.id));
            //remove empty 
            if (cache[timestamp].length === 0) {
                delete cache[timestamp];
            }
        }

        instance.pushSettings("cache", cache);
        return cache;

    }

    protected removeUnopened($element: JQuery<HTMLElement>): void {
        if ($element.attr("data-remove-notification-count") === "true") {
            this.updateNotificationSymbol(-1);
        }
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true
        };
    }
}



export interface SubscriptionSettings {
    [id: number]: any;
}

interface UpdateCache {
    [timestamp: number]: UpdateData[];
}

export interface UpdateData {
    id: number;
    name: string;
    date: number;
    last: number;
    md5: string;
    extra?: any;
}

export interface UpdateDefinition {
    //what link should be opened when you click on the image? Leave empty for no action
    imageHref?: (data: UpdateData) => string;
    //image link which should be displayed on the left side of the entry
    imageSrc: (data: UpdateData) => string;
    //Link to get to the update
    updateHref?: (data: UpdateData) => string;
    //Text for the updatelink
    updateText: (data: UpdateData) => string;
    //Text to display when clicking on sourceLink
    sourceHref?: (data: UpdateData) => string;
    //Link to where the "first page" of the subscription
    sourceText: (data: UpdateData) => string;
}
