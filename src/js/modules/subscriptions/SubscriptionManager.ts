import { RE6Module, Settings } from "../../components/RE6Module";
import { Tabbed } from "../../components/structure/Tabbed";
import { Modal } from "../../components/structure/Modal";
import { Subscription } from "./Subscription";
import { Util } from "../../components/structure/Util";
import { ModuleController } from "../../components/ModuleController";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Form } from "../../components/structure/Form";
import { Danbooru } from "../../components/api/Danbooru";

export class SubscriptionManager extends RE6Module {

    //should notifications be cleared once seen?
    private updateInterval = 60 * 60; //1 hour, in seconds
    //While updating a setting will be pushed after every interval
    //to make it possible to detect aborted updates
    private heartbeatInterval = 10;   //10 seconds
    private alreadyUpdated = false;

    private tabNotificationsCount = 0;
    private subscribers = new Map<number, SubscriptionElement>();

    private $openSubsButton: JQuery<HTMLElement>;
    private $subsTabs: Tabbed;

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public async create(): Promise<void> {
        super.create();

        // Create a button in the header
        this.$openSubsButton = DomUtilities.addSettingsButton({
            name: `<i class="fas fa-bell"></i>`,
        });

        const content = [];
        for (const sub of this.subscribers.values()) {
            content.push({
                name: sub.instance.getName(), page: $("<div>").addClass("subscriptions-list")
            });
        }

        const lastUpdate = this.fetchSettings("lastUpdate");

        content.push({
            name: "Info", page: this.getInfoPage(lastUpdate).get()
        });

        this.$subsTabs = new Tabbed({
            name: "settings-tabs",
            content: content
        });

        // Create the modal
        const modal = new Modal({
            title: "Subscriptions",
            triggers: [{ element: this.$openSubsButton }],
            escapable: false,
            reserveHeight: true,
            content: this.$subsTabs.create(),
            position: { my: "right top", at: "right top" }
        });

        this.$openSubsButton.attr("data-loading", "true");
        const shouldUpdate = this.getShouldUpdate();
        const now = new Date().getTime();
        let heartbeatTimer: number;
        if (shouldUpdate) {
            //Update started, contiously set the heartbeat to let other tabs now the update did not abort
            heartbeatTimer = this.startUpdate();
        }

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
        //when the update finished, clear the hearbeat interval and set updateInProgress to false
        //The next update now should only start after the update interval, or on manual action
        if (shouldUpdate) {
            this.stopUpdate(heartbeatTimer);
        }
        this.alreadyUpdated = true;
        this.$openSubsButton.attr("data-loading", "false");
        this.updateNotificationSymbol(0);
    }

    private getShouldUpdate(): boolean {
        const nowFake = this.fetchSettings("now");
        const now = nowFake !== undefined ? nowFake : new Date().getTime();
        const lastUpdate = this.fetchSettings("lastUpdate");
        const lastHeartbeat = this.fetchSettings("heartbeat");
        const updateInProgress = this.fetchSettings("updateInProgress");
        //Should an update be made, because the last update was before the interval?
        //But only if an update is not already in progress
        const updateIntervalConstraint = this.intervalCheck(now, lastUpdate, updateInProgress);
        //should an update be made, because the last started 
        //update did not set the heartbeat and an update is alledegly in progress?
        const updateHeartbeatConstraint = this.heartbeatCheck(now, lastHeartbeat, updateInProgress);
        if (updateHeartbeatConstraint) {
            console.log("Update because of heartbeat");
        } else if (updateIntervalConstraint) {
            console.log("Update because of interval");
        } else {
            console.log("No update");
        }
        return updateIntervalConstraint || updateHeartbeatConstraint;
    }

    private intervalCheck(now: number, lastUpdate: number, updateInProgress: boolean): boolean {
        return now - lastUpdate - (this.updateInterval * 1000) >= 0 && !updateInProgress;
    }

    private heartbeatCheck(now: number, lastHeartbeat: number, updateInProgress: boolean): boolean {
        return updateInProgress === true && now - lastHeartbeat - (this.heartbeatInterval * 1000 * 2) >= 0;
    }

    /**
     * Prepares the settings for a new update
     */
    private startUpdate(): number {
        this.pushSettings("updateInProgress", true);
        this.pushSettings("heartbeat", new Date().getTime());
        const heartbeatTimer = window.setInterval(() => {
            this.pushSettings("heartbeat", new Date().getTime());
        }, this.heartbeatInterval * 1000);
        return heartbeatTimer;
    }

    /**
     * Stops an update. Stop the heartbeat interval, push the current time to lastUpdate
     * and sets updateInProgress to false
     */
    private stopUpdate(heartbeatTimer: number): void {
        this.pushSettings("updateInProgress", false);
        this.pushSettings("lastUpdate", new Date().getTime());
        window.clearInterval(heartbeatTimer);
    }

    private getInfoPage(lastUpdate: number): Form {
        const updateInProgress = this.fetchSettings("updateInProgress");
        let heartbeat = this.fetchSettings("heartbeat");

        let allowUpdate = true;
        const form = new Form({ id: "subscriptions-status", columns: 2, parent: "div#modal-container" }, [
            Form.header("Stats"),
            Form.div(`Last Update: <span id="subscriptions-lastupdate">` + this.getLastUpdateText(lastUpdate) + `</span>`, "mid"),
            Form.div(`Next Update: <span id="subscriptions-nextupdate">` + this.getNextUpdateText(updateInProgress, lastUpdate, heartbeat) + `</span>`, "mid"),
            Form.button(
                "triggerupdate", "Manual Update", undefined, "mid", async () => {

                    //If an update was already triggered, do nothing. 
                    heartbeat = await this.fetchSettings("heartbeat", true);
                    const updateInProgress = this.fetchSettings("updateInProgress");
                    if (this.heartbeatCheck(new Date().getTime(), heartbeat, updateInProgress)) {
                        Danbooru.notice("Update is already in progress");
                        return;
                    }
                    //Only allow one manuall update per page
                    if (!allowUpdate) {
                        Danbooru.notice("You already updated, please reload to update again");
                        return;
                    }
                    const hearbeatTimer = this.startUpdate();
                    allowUpdate = false;
                    const now = new Date().getTime();
                    for (const entry of this.subscribers.entries()) {
                        entry[1].content = $("<div>").addClass("subscriptions-list");
                        await this.initSubscriber(entry[1], true, await this.fetchSettings("lastUpdate", true), now);
                        this.$subsTabs.replace(entry[0], entry[1].content);
                    }
                    //refresh last/next update label
                    $("span#subscriptions-lastupdate").html("Last Update: " + this.getLastUpdateText(now));
                    $("span#subscriptions-nextupdate").html("Next Update: " + this.getNextUpdateText(updateInProgress, now, heartbeat));

                    this.stopUpdate(hearbeatTimer);

                }
            ),
        ]);
        return form;
    }

    private getLastUpdateText(lastUpdate: number): string {
        if (lastUpdate === 0) {
            return "Never";
        } else {
            return Util.timeAgo(lastUpdate);
        }
    }

    private getNextUpdateText(updateInProgress: boolean, lastUpdate: number, heartbeat: number): string {
        const now = new Date().getTime();
        if (lastUpdate === 0) {
            return Util.timeAgo(now + this.updateInterval * 1000);
        } else if (updateInProgress && !this.heartbeatCheck(new Date().getTime(), heartbeat, updateInProgress)) {
            return "In Progress. Check back in a bit";
        } else if (now - lastUpdate > this.updateInterval * 1000) {
            return "Now";
        } else {
            return Util.timeAgo(lastUpdate + this.updateInterval * 1000);
        }
    }

    public updateNotificationSymbol(difference: number): void {
        this.tabNotificationsCount += difference;
        this.$openSubsButton.attr("data-has-notifications", (this.tabNotificationsCount > 0).toString());
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
        //Don't add buttons if they were already appended
        if (this.alreadyUpdated === false) {
            this.addSubscribeButtons(sub.instance);
        }
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
        if ((updateCount !== 0 || lastSeen < lastTimestamp) && lastSeen !== undefined && !isNaN(lastTimestamp)) {
            //Dont increment the notification count if there already are some
            //This can happen when the user triggers a manual update
            if (sub.tab.attr("data-has-notifications") !== "true") {
                sub.tab.attr("data-has-notifications", "true");
                this.tabNotificationsCount++;
            }
        }
    }

    /**
     * Creates an element through the data and how the subscriber defines it
     * @returns the element to append to a tab
     */
    private createUpdateEntry(data: UpdateContent, timeStamp: number, definition: UpdateDefinition, customClass?: string, toggleSub?: Function): JQuery<HTMLElement> {
        const $content = $("<div>")
            .addClass("subscription-update");

        if (customClass) $content.addClass(customClass);
        const timeAgo = Util.timeAgo(timeStamp);
        const timeString = new Date(timeStamp).toLocaleString();
        // Image
        const $imageDiv = $("<div>")
            .addClass("subscription-update-preview")
            .appendTo($content);

        // Will be executed, if the definition allows it
        const imageErrorHandler = (): void => {
            if (definition.imageRemoveOnError === true) {
                $content.remove();
            }
        };

        if (definition.imageHref !== undefined) {
            const $a = $("<a>")
                .attr("href", definition.imageHref(data));
            $("<img>")
                .attr("data-src", definition.imageSrc(data))
                .addClass("lazyload")
                .attr("title", definition.updateText(data) + "\n" + timeAgo + "\n" + timeString)
                .on("error", imageErrorHandler)
                .appendTo($a);
            $a.appendTo($imageDiv);
        } else {
            $("<img>")
                .attr("src", definition.imageSrc(data))
                .attr("title", definition.updateText(data) + "\n" + timeAgo + "\n" + timeString)
                .on("error", imageErrorHandler)
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
        const heart = $(`<i class="fas fa-heart"></i>`);
        $("<a>")
            .append(heart)
            .attr("href", "#")
            .appendTo($unsub)
            .on("click", () => {
                if (toggleSub) {
                    toggleSub();
                    heart.toggleClass("fas far");
                }
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
        let subscriptionData: SubscriptionSettings = instance.fetchSettings("data");
        instance.getButtonElements().each((index, element) => {
            const $element = $(element);

            const $subscribeButton = instance.createSubscribeButton();
            const $unsubscribeButton = instance.createUnsubscribeButton();

            const id = instance.getSubscriberId($element);

            if (subscriptionData[id] === undefined) {
                $unsubscribeButton.addClass("hidden");
            } else { $subscribeButton.addClass("hidden"); }

            $subscribeButton.click(async (event) => {
                event.preventDefault();
                $subscribeButton.toggleClass("hidden");
                $unsubscribeButton.toggleClass("hidden");
                subscriptionData = await instance.fetchSettings("data", true);
                subscriptionData[id] = {};
                instance.pushSettings("data", subscriptionData);
            });
            $unsubscribeButton.click(async (event) => {
                event.preventDefault();
                $subscribeButton.toggleClass("hidden");
                $unsubscribeButton.toggleClass("hidden");
                subscriptionData = await instance.fetchSettings("data", true);

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
                let currentlySubbed = true;
                const update: UpdateContent = cache[timestamps[i]][updateTimestamp];
                const toggleSub = async (): Promise<void> => {
                    const cache: UpdateCache = await sub.instance.fetchSettings("cache", true);
                    const data = sub.instance.fetchSettings("data", true);
                    if (currentlySubbed) {
                        delete cache[timestamps[i]][updateTimestamp];
                        delete data[update.id];
                        Danbooru.notice("Successfully unsubbed!");
                    } else {
                        cache[timestamps[i]][updateTimestamp] = update;
                        data[update.id] = {};
                        Danbooru.notice("Successfully resubbed!");
                    }
                    sub.instance.pushSettings("cache", cache);
                    sub.instance.pushSettings("data", data);
                    currentlySubbed = !currentlySubbed;
                };
                sub.content.append(this.createUpdateEntry(update, parseInt(updateTimestamp), sub.instance.updateDefinition, "", toggleSub));
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
        if (Object.keys(cache).length > this.fetchSettings("historySize")) {
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
        if (sub === undefined) {
            return;
        }
        sub.instance.pushSettings("lastSeen", new Date().getTime());
        if (sub.tab.attr("data-has-notifications") === "true") {
            this.updateNotificationSymbol(-1);
            sub.tab.attr("data-has-notifications", "false");
        }
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            lastUpdate: 0,
            historySize: 5
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
    //Should the image be hidden, if it triggers the error event?
    imageRemoveOnError?: boolean;
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
