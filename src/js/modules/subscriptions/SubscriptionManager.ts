import { RE6Module, Settings } from "../../components/RE6Module";
import { Tabbed } from "../../components/structure/Tabbed";
import { Modal } from "../../components/structure/Modal";
import { Subscription } from "./Subscription";
import { Util } from "../../components/structure/Util";
import { ModuleController } from "../../components/ModuleController";
import { DomUtilities } from "../../components/structure/DomUtilities";

declare const Danbooru;

export class SubscriptionManager extends RE6Module {

    //should notifications be cleared once seen?
    private updateInterval = 60 * 60; //1 hour, in seconds
    private historySize = 5;

    private tabNotificationsCount = 0;
    private subscribers = new Map<number, SubscriptionElement>();

    private openSubsButton: JQuery<HTMLElement>;

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
        for (const sub of this.subscribers.values()) {
            content.push({
                name: sub.instance.getName(), page: $("<div>").addClass("subscriptions-list")
            });
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
            reserveHeight: true,
            content: $subsTabs.create(),
            position: { my: "right top", at: "right top" }
        });

        const nowFake = this.fetchSettings("now");
        const now = nowFake !== undefined ? nowFake : new Date().getTime();

        this.openSubsButton.attr("data-loading", "true");

        const lastUpdate = this.fetchSettings("lastUpdate");
        const shouldUpdate = now - lastUpdate - (this.updateInterval * 1000) >= 0;
        if (shouldUpdate) {
            this.pushSettings("lastUpdate", now);
        }
        const panels = modal.getElement().find(".ui-tabs-panel");
        const tabs = modal.getElement().find(".ui-tabs-tab");
        for (const entry of this.subscribers.entries()) {
            const subElements = {
                instance: entry[1].instance,
                content: panels.eq(entry[0]).find("div"),
                tab: tabs.eq(entry[0])
            };
            this.subscribers.set(entry[0], subElements);
            await this.initSubscriber(subElements, shouldUpdate, lastUpdate, now);
        }

        this.openSubsButton.attr("data-loading", "false");
        this.updateNotificationSymbol(0);

        //clear the notifications if the user opened the tab
        modal.getElement().on("dialogopen", () => {
            const index = modal.getElement().tabs("option", "active");
            this.removeUnopened(index);
        });

        modal.getElement().tabs({
            activate: (event, tabProperties) => {
                this.removeUnopened(tabProperties.newTab.index());
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
        manager.subscribers.set(manager.subscribers.size, { instance: instance });
    }

    /**
     * Starts checking for updates for the passed subscriber
     */
    public async initSubscriber(sub: SubscriptionElement, shouldUpdate: boolean, lastUpdate: number, currentTime: number): Promise<void> {
        const moduleName = sub.instance.constructor.name;

        this.addSubscribeButtons(sub.instance);
        sub.content.attr("data-subscription-class", moduleName);
        sub.tab.attr("data-loading", "true");
        //don't update if the last check was pretty recently
        let updates: UpdateData = {};
        if (shouldUpdate) {
            updates = await sub.instance.getUpdatedEntries(lastUpdate);
        }

        const lastTimestamp = this.addUpdateEntries(sub, updates, currentTime);
        const lastSeen = sub.instance.fetchSettings("lastSeen");
        const updateCount = Object.keys(updates).length;
        sub.tab.attr("data-loading", "false");
        //show notification if there are new updates or there are updates you didn't click on yet
        if (updateCount !== 0 || lastSeen < lastTimestamp || lastSeen === undefined && !isNaN(lastTimestamp)) {
            sub.tab.attr("data-has-notifications", "true");
            this.tabNotificationsCount++;
        }
    }

    /**
     * Creates an element through the data and how the subscriber defines it
     * @returns the element to append to a tab
     */
    private createUpdateEntry(data: UpdateContent, timeStamp: number, definition: UpdateDefinition, customClass?: string, onUnsub?: Function): JQuery<HTMLElement> {
        const $content = $("<div>")
            .addClass("subscription-update");

        if (customClass) $content.addClass(customClass);
        const timeAgo = Util.timeAgo(timeStamp);
        const timeString = new Date(timeStamp).toLocaleString();
        // Image
        const $imageDiv = $("<div>")
            .addClass("subscription-update-preview")
            .appendTo($content);

        if (definition.imageHref !== undefined) {
            const $a = $("<a>")
                .attr("href", definition.imageHref(data));
            $("<img>")
                .attr("src", definition.imageSrc(data))
                .attr("title", definition.updateText(data) + "\n" + timeAgo + "\n" + timeString)
                .appendTo($a);
            $a.appendTo($imageDiv);
        } else {
            $("<img>")
                .attr("src", definition.imageSrc(data))
                .attr("title", definition.updateText(data) + "\n" + timeAgo + "\n" + timeString)
                .appendTo($imageDiv); timeStamp;
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

        // Unsubscribe Button
        const $unsub = $("<div>")
            .addClass("subscription-update-unsub")
            .appendTo($content);
        $("<a>")
            .html(`<i class="fas fa-heart"></i>`)
            .attr("href", "#")
            .appendTo($unsub)
            .on("click", () => {
                if (onUnsub) onUnsub();
            });

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
            .html(timeAgo)
            .attr("title", timeString)
            .appendTo($date);

        return $content;
    }

    public addSubscribeButtons(instance: Subscription): void {
        let subscriptionData: SubscriptionSettings = instance.fetchSettings("data", true);
        instance.getButtonElements().each((index, element) => {
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
            instance.insertButton($element, $subscribeButton);
            instance.insertButton($element, $unsubscribeButton);
        });
    }

    /**
     * Adds the passed updates to the tab of the subscriber
     * @returns the subscriptions cache newest entry
     */
    public addUpdateEntries(sub: SubscriptionElement, updates: UpdateData, currentTime: number): number {
        if (Object.keys(updates).length === 0) {
            sub.content.append(this.createUpToDateDivider());
        }

        const cache = this.addToCache(sub.instance, updates, currentTime);

        //Sort cache by time highest to lowest
        const timestamps = Object.keys(cache).sort((a, b) => parseInt(b) - parseInt(a));
        for (let i = 0; i < timestamps.length; i++) {
            sub.content.append(this.createCacheDivider(parseInt(timestamps[i])));
            //also sort the individual update entries
            for (const updateTimestamp of Object.keys(cache[timestamps[i]]).sort((a, b) => parseInt(b) - parseInt(a))) {
                const update: UpdateContent = cache[timestamps[i]][updateTimestamp];
                const onUnsub = (): void => {
                    const cache: UpdateCache = sub.instance.fetchSettings("cache", true);
                    const data = sub.instance.fetchSettings("data", true);
                    delete cache[timestamps[i]][updateTimestamp];
                    delete data[update.id];
                    sub.instance.pushSettings("cache", cache);
                    sub.instance.pushSettings("data", data);
                    Danbooru.notice("Successfully unsubscribed!");
                };
                sub.content.append(this.createUpdateEntry(update, parseInt(updateTimestamp), sub.instance.updateDefinition, "", onUnsub));
            }
        }
        return this.getLastCacheTimestamp(cache);
    }

    /**
     * Returns the most recent timestamp in the cache
     */
    public getLastCacheTimestamp(cache: UpdateCache): number {
        return Math.max(...Object.keys(cache).map(a => parseInt(a)));
    }

    private createUpToDateDivider(): JQuery<HTMLElement> {
        const update: UpdateContent = { id: -1, name: "All up to date!", md5: "" };
        const definition: UpdateDefinition = {
            imageSrc: () => "",
            sourceText: () => "",
            updateText: data => data.name

        };
        return this.createUpdateEntry(update, new Date().getTime(), definition, "notice notice-uptodate");
    }

    private createCacheDivider(timestamp: number): JQuery<HTMLElement> {
        const update: UpdateContent = { id: -1, name: " ", md5: "" };
        const definition: UpdateDefinition = {
            imageSrc: () => "",
            sourceText: () => "",
            updateText: data => data.name

        };
        return this.createUpdateEntry(update, new Date(timestamp).getTime(), definition, "notice notice-cached");
    }

    public addToCache(instance: Subscription, updates: UpdateData, currentTime: number): UpdateCache {
        let cache: UpdateCache = instance.fetchSettings("cache");
        if (cache === undefined) {
            cache = {};
        }

        if (Object.keys(updates).length === 0) {
            return cache;
        }
        cache[currentTime] = updates;

        //if the cache is larger than the limit, remove the entry with the lowest timestamp
        if (Object.keys(cache).length > this.historySize) {
            delete cache[Math.min(...Object.keys(cache).map(e => parseInt(e)))];
        }

        //remove all non unique updates
        //forumposts may get replies all the time, only the recent one is important
        const uniqueKeys = [];
        for (const timestamp of Object.keys(cache).sort((a, b) => parseInt(b) - parseInt(a))) {
            for (const updateTimestamp of Object.keys(cache[timestamp])) {
                const update: UpdateContent = cache[timestamp][updateTimestamp];
                if (uniqueKeys.indexOf(update.id) === -1) {
                    uniqueKeys.push(update.id);
                } else {
                    delete cache[timestamp][updateTimestamp];
                }
            }
            //remove empty 
            if (Object.keys(cache[timestamp]).length === 0) {
                delete cache[timestamp];
            }
        }

        instance.pushSettings("cache", cache);
        return cache;

    }

    protected removeUnopened(index: number): void {
        const sub = this.subscribers.get(index);
        sub.instance.pushSettings("lastSeen", new Date().getTime());
        if (sub.tab.attr("data-has-notifications") === "true") {
            this.updateNotificationSymbol(-1);
            sub.tab.attr("data-has-notifications", "false");
        }
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            lastUpdate: 0
        };
    }
}



export interface SubscriptionSettings {
    [id: number]: ExtraInfo;
}

export interface ExtraInfo {
    md5?: string;
    lastId?: number;
}

interface UpdateCache {
    [timestamp: number]: UpdateData;
}

export interface UpdateData {
    [timestamp: number]: UpdateContent;
}

export interface UpdateContent {
    id: number;
    name: string;
    md5: string;
    extra?: any;
}

export interface UpdateDefinition {
    //what link should be opened when you click on the image? Leave empty for no action
    imageHref?: (data: UpdateContent) => string;
    //image link which should be displayed on the left side of the entry
    imageSrc: (data: UpdateContent) => string;
    //Link to get to the update
    updateHref?: (data: UpdateContent) => string;
    //Text for the updatelink
    updateText: (data: UpdateContent) => string;
    //Text to display when clicking on sourceLink
    sourceHref?: (data: UpdateContent) => string;
    //Link to where the "first page" of the subscription
    sourceText: (data: UpdateContent) => string;
}

interface SubscriptionElement {
    instance: Subscription;
    tab?: JQuery<HTMLElement>;
    content?: JQuery<HTMLElement>;
}
