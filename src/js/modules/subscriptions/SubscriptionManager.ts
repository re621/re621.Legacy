import { Danbooru } from "../../components/api/Danbooru";
import { XM } from "../../components/api/XM";
import { Debug } from "../../components/ErrorHandler";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Form, FormElement } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Tabbed } from "../../components/structure/Tabbed";
import { Util } from "../../components/structure/Util";
import { ThumbnailClickAction, ThumbnailEnhancer } from "../search/ThumbnailsEnhancer";
import { SubscriptionTracker, UpdateContent } from "./SubscriptionTracker";

export class SubscriptionManager extends RE6Module {

    /** Used to invalidate cache if the format changes */
    private static cacheVersion = 1;

    /** Used to block manual updates while an interval update is in progress */
    private static updateInProgress = false;

    /** This much time must pass before the script assumes that a previous update failed. */
    private static updateTimeout = 60 * 1000;

    /** Map of active subscription modules */
    private trackers = new Map<string, TrackerData>();

    /** Header button that opens the subscription modal */
    private $openSubsButton: JQuery<HTMLElement>;

    /** True if the notifications window has been opened since page load */
    private notificationsAlreadyOpened = false;

    /** Notifications window */
    private modal: Modal;

    /** Tabs inside the modal window */
    private tabs: Tabbed;

    public constructor() {
        super();
        this.registerHotkeys(
            { keys: "hotkeyOpenNotifications", fnct: this.openNotifications },
        );
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            lastUpdate: 0,

            updateStarted: 0,

            /** Maximum number of items in the update cache */
            cacheSize: 60,
            /** How often should the subscriptions be refreshed, in milliseconds */
            updateInterval: 60 * 60 * 1000,
            /** At which age updates get removed from cache */
            cacheMaxAge: 0,

            hotkeyOpenNotifications: "",
        };
    }

    /** Registers the provided tracker(s) into the system */
    public static register(moduleList: any | any[]): void {
        if (!Array.isArray(moduleList)) moduleList = [moduleList];

        const trackers = (this.getInstance() as SubscriptionManager).trackers;
        moduleList.forEach(async (moduleClass: any) => {
            trackers.set(
                moduleClass.prototype.constructor.name,
                { instance: ModuleController.get<SubscriptionTracker>(moduleClass) }
            );
        });
    }

    /**
     * Returns the SubscriptionElement corresponding to the provided ID.  
     * The ID can be either the subscription name as a string, or its numeric tab ID
     * @param id Subscription ID
     */
    public getTracker(id: string | number): TrackerData {
        if (typeof id === "string") return this.trackers.get(id);
        for (const value of this.trackers.values())
            if (value.tabIndex === id) { return value; }
        return undefined;
    }

    public async create(): Promise<void> {
        super.create();

        // Fetch necessary data
        const settings = this.fetchSettings(["lastUpdate", "cacheVersion"]),
            cacheInvalid = settings.cacheVersion === undefined || settings.cacheVersion < SubscriptionManager.cacheVersion;

        // Set the latest cache version, presuming that the script will clear the cache later
        if (cacheInvalid) this.pushSettings("cacheVersion", SubscriptionManager.cacheVersion);

        // Create a button in the header
        this.$openSubsButton = DomUtilities.addSettingsButton({
            id: "header-button-notifications",
            name: `<i class="fas fa-bell"></i>`,
            title: "Notifications",
            attr: {
                "data-loading": "false",
                "data-updates": "0",
            },
            linkClass: "update-notification",
        });

        // Create structure for the subscription interface
        const content = [];

        let tabIndex = 0;
        this.trackers.forEach((data, name) => {
            data.tabElement = $("<a>")
                .attr({
                    "data-loading": "false",
                    "data-updates": "0",
                })
                .addClass("update-notification")
                .html(data.instance.getName());
            data.tabIndex = tabIndex;
            data.content = $("<div>")
                .addClass("subscriptions-list subscription-" + data.instance.getName())
                .attr({
                    "data-subscription-class": name,
                    "data-updates": "0",
                });

            $("<div>")
                .addClass("subscription-load-status")
                .html("Initializing . . .")
                .appendTo(data.content);

            // If the stored setting is different from a hard-coded value,
            // the cache format must have changed and data must be cleared
            if (cacheInvalid) data.instance.getCache().clear();

            // Create subscribe buttons
            this.addSubscribeButtons(data.instance);

            content.push({ name: data.tabElement, page: data.content });
            tabIndex++;
        });
        content.push({ name: "Info", page: this.buildInfoPage().get() });

        this.tabs = new Tabbed({
            name: "notifications-tabs",
            content: content
        });

        // Create the modal
        this.modal = new Modal({
            title: "Subscriptions",
            triggers: [{ element: this.$openSubsButton }],
            escapable: false,
            reserveHeight: true,
            content: this.tabs.get(),
            position: { my: "right top", at: "right top" }
        });

        /* == Event Listeners == */
        SubscriptionManager.on("update.main", () => { this.executeUpdateEvent(); });
        SubscriptionManager.on("timerRefresh.main", () => { this.executeTimerRefreshEvent(); });

        this.trackers.forEach((trackerData) => {
            XM.Storage.addListener(
                "re621." + trackerData.instance.getSettingsTag() + ".cache",
                (name, oldValue, newValue, remote) => {
                    if (!remote) return;
                    Debug.log(`SubM${trackerData.tabIndex}: Cache updated`);
                    this.executeReloadEvent(trackerData);
                }
            );
        });

        // Clear the notifications if the user opened the tab
        this.modal.getElement().on("dialogopen.onUpdate", () => {
            if (SubscriptionManager.updateInProgress) return;

            if (!this.notificationsAlreadyOpened) {
                this.notificationsAlreadyOpened = true;

                let index = 0;
                for (const sub of this.trackers) {
                    if (parseInt(sub[1].tabElement.attr("data-updates")) > 0) {
                        this.tabs.get().tabs("option", "active", index);
                        break;
                    }
                    index++;
                }
            }
            this.clearTabNotification(this.tabs.get().tabs("option", "active"));
            window.setTimeout(() => {
                this.clearTabNotification(this.tabs.get().tabs("option", "active"));
            }, 1000);
        });

        this.tabs.get().on("tabsactivate.onUpdate", (event, tabProperties) => {
            if (SubscriptionManager.updateInProgress) return;
            this.clearTabNotification(tabProperties.newTab.index());
        });

        /** == Initialization == */
        SubscriptionManager.trigger("timerRefresh");
        this.updateRequired().then((updateRequired) => {
            if (updateRequired) this.executeUpdateEvent();
            else this.trackers.forEach((trackerData) => { this.executeReloadEvent(trackerData); });
        })

        setInterval(async () => {
            if (SubscriptionManager.updateInProgress) return;

            if (await this.updateRequired()) SubscriptionManager.trigger("update");
            else SubscriptionManager.trigger("timerRefresh");
        }, TIME_PERIOD.MINUTE);
    }

    /**
     * Builds a subscription settings page, containing various controls
     */
    private buildInfoPage(): Form {
        return new Form({ id: "subscriptions-controls", columns: 2, parent: "div#modal-container" }, [
            // List and manage active subscriptions
            Form.header("Subscriptions"),
            makeSubSection(this.getTracker("TagTracker").instance, 2),
            makeSubSection(this.getTracker("PoolTracker").instance, 1),
            makeSubSection(this.getTracker("ForumTracker").instance, 1),
            makeSubSection(this.getTracker("CommentTracker").instance, 2),
            Form.hr(),

            // Settings
            Form.header("Settings"),
            Form.section({ id: "settings", columns: 2 }, [
                Form.input(
                    "cache-size", this.fetchSettings("cacheSize"), "Cache Size", "column", { pattern: "^(1?[0-9][0-9]|200)$" },
                    async (event, data) => {
                        if (!(event.target as HTMLInputElement).checkValidity()) return;
                        await this.pushSettings("cacheSize", parseInt(data));
                    }
                ),
                Form.spacer("column"),
                Form.div(`<div class="unmargin">Number of items kept in the update cache. Must be at least 10, but no more than 200. Large values may lead to performance drops.</div>`, "mid"),
                Form.spacer("mid"),

                Form.select(
                    "update-interval", this.fetchSettings("updateInterval") / TIME_PERIOD.HOUR, "Update Interval",
                    [
                        { value: 0.5, name: "30 minutes" },
                        { value: 1, name: "1 hour" },
                        { value: 6, name: "6 hours" },
                        { value: 12, name: "12 hours" },
                        { value: 24, name: "24 hours" },
                    ],
                    "mid",
                    async (event, data) => {
                        await this.pushSettings("updateInterval", parseFloat(data) * TIME_PERIOD.HOUR);
                        SubscriptionManager.trigger("timerRefresh");
                    }
                ),
                Form.div(`<div class="unmargin">How often should the subscriptions be checked for updates.</div>`, "mid"),
                Form.spacer("mid"),

                Form.select(
                    "update-expiration", this.fetchSettings("cacheMaxAge") / TIME_PERIOD.WEEK, "Cache expiration",
                    [
                        { value: 0, name: "Never" },
                        { value: 7, name: "1 week" },
                        { value: 2, name: "2 weeks" },
                        { value: 4, name: "1 month" },
                        { value: 24, name: "6 months" },
                    ],
                    "mid",
                    async (event, data) => {
                        await this.pushSettings("cacheMaxAge", parseInt(data) * TIME_PERIOD.WEEK);
                        SubscriptionManager.trigger("timerRefresh");
                    }
                ),
                Form.div(`<div class="unmargin">Updates older than this are removed automatically</div>`, "mid"),

            ]),
            Form.hr(),

            // Status and Controls
            Form.section({ id: "status", columns: 2 }, [
                Form.header("Other"),
                Form.div($("<span>").attr("id", "subscriptions-lastupdate").html("Initializing . . ."), "mid", "Last Update:"),
                Form.div($("<span>").attr("id", "subscriptions-nextupdate").html("Initializing . . ."), "mid", "Next Update:"),
                Form.button(
                    "triggerupdate", `<i class="fas fa-sync-alt fa-xs fa-spin" id="subscription-action-update"></i> Manual Update`, undefined, "column", () => {
                        if (SubscriptionManager.updateInProgress) {
                            Danbooru.notice("Update is already in progress");
                            return;
                        }

                        SubscriptionManager.trigger("update");
                    }
                ),
                Form.button(
                    "clear-cache", "Clear Cache", undefined, "column", () => {
                        this.trackers.forEach(async (subscription) => {
                            await subscription.instance.getCache().clear();
                            subscription.content[0].innerHTML = "";
                        });
                    }
                ),
            ], undefined, "mid"),
        ]);

        /** Creates a form section that lists currently subscribed items */
        function makeSubSection(instance: SubscriptionTracker, columns: number): FormElement {
            const $subsSection = $("<div>").addClass("subscriptions-manage-list col-" + columns),
                data = instance.fetchSettings<Subscription>("data");
            Object.keys(data).forEach((key) => {
                formatSubSectionEntry(instance, key, data[key]).appendTo($subsSection);
            });

            return Form.subsection({ id: Util.makeID(), columns: 2, collapseBadge: Object.keys(data).length }, instance.getName(), [
                Form.div($subsSection, "mid"),
            ], undefined, "mid");
        }

        /** Creates and returns an entry for the `makeSubSection()` method */
        function formatSubSectionEntry(instance: SubscriptionTracker, key: string, entry: SubscriptionData): JQuery<HTMLElement> {
            const output = $("<item>");

            // Subscribe / Unsubscribe Buttons
            let currentlySubbed = true;
            const heart = $("<i>").addClass("fas fa-heart");
            $("<a>")
                .append(heart)
                .appendTo(output)
                .addClass("sub-manage-unsub")
                .on("click", async (event): Promise<void> => {
                    event.preventDefault();
                    const subData = await instance.fetchSettings<Subscription>("data", true);
                    if (currentlySubbed) {
                        delete subData[key];
                        Danbooru.notice("Successfully unsubscribed");
                    } else {
                        subData[key] = entry;
                        Danbooru.notice("Successfully subscribed");
                    }
                    instance.pushSettings("data", subData);
                    currentlySubbed = !currentlySubbed;
                    heart.toggleClass("fas far");
                });

            // Link to the entry page
            const link: JQuery<HTMLElement> = $("<a>").html(entry.name ? entry.name : key).appendTo(output);
            switch (instance.getName()) {
                case "Pools": { link.attr("href", "/pools/" + key); break; }
                case "Forums": { link.attr("href", "/forum_topics/" + key); break; }
                case "Tags": { link.attr("href", "/posts?tags=" + key); break; }
                case "Comments": { link.attr("href", "/posts/" + key); break; }
            }

            return output;
        }
    }

    /**
     * Checks if the trackers need to update the cache
     * @returns true if an update is needed, false otherwise
     */
    private async updateRequired(): Promise<boolean> {
        const time = await this.fetchSettings(["lastUpdate", "updateStarted", "now", "updateInterval"], true);
        if (time.now === undefined) time.now = Util.getTime();  // "now" setting is used for debugging purposes only

        return Promise.resolve(
            !SubscriptionManager.updateInProgress                                                                   // Update process isn't running already
            && (time.now - time.lastUpdate) >= time.updateInterval                                                  // Update interval passed
            && (time.updateStarted === 0 || time.now - time.updateStarted >= SubscriptionManager.updateTimeout)     // Previous update completed or failed
        );
    }

    /** Loads new subscription data into tracker cache */
    private async executeUpdateEvent(): Promise<void> {
        SubscriptionManager.updateInProgress = true;
        const now = Util.getTime(),
            prevUpdate = await this.fetchSettings("lastUpdate", true);
        this.pushSettings("lastUpdate", now);
        this.pushSettings("updateStarted", now);
        SubscriptionManager.trigger("timerRefresh");

        this.$openSubsButton.attr({
            "data-loading": "true",
            "data-updates": "0",
        });

        this.trackers.forEach(async (trackerData) => {
            Debug.log("SubM: redrawing [update]");
            trackerData.tabElement.attr("data-updates", "0");
            trackerData.tabElement.attr("data-loading", "true");
            trackerData.content[0].innerHTML = "";
            const status = $("<div>")
                .addClass("subscription-load-status")
                .html("Loading . . .")
                .appendTo(trackerData.content);

            await trackerData.instance.getCache().update(prevUpdate, status);
            trackerData.tabElement.attr("data-loading", "false");
            this.executeReloadEvent(trackerData);
        });

        SubscriptionManager.updateInProgress = false;
        this.pushSettings("updateStarted", 0);
        SubscriptionManager.trigger("timerRefresh");

        this.$openSubsButton.attr("data-loading", "false");
        this.refreshHeaderNotifications();

        if (this.modal.isOpen()) {
            const activeTab = this.tabs.get().tabs("option", "active");
            window.setTimeout(() => { this.clearTabNotification(activeTab); }, 1000);
        }
    }

    /** Reloads the entries on the tracker's tab */
    private async executeReloadEvent(trackerData: TrackerData): Promise<void> {
        const cache = trackerData.instance.getCache();
        await cache.load();
        Debug.log(`SubM${trackerData.tabIndex}: drawing ${cache.getSize()} items`);

        trackerData.content[0].innerHTML = "";

        if (cache.getSize() > 0)    // Can be appended anywhere, sorting is done through CSS
            trackerData.content.append(this.createCacheDivider());

        const clickAction = ModuleController.get(ThumbnailEnhancer).fetchSettings("clickAction");

        cache.forEach((content, timestamp) => {
            trackerData.content.append(this.createUpdateEntry(timestamp, content, trackerData, clickAction));
        });

        this.refreshTabNotifications(trackerData);

        if (this.modal.isOpen()) {
            const activeTab = this.tabs.get().tabs("option", "active");
            window.setTimeout(() => { this.clearTabNotification(activeTab); }, 1000);
        }
    }

    /** Reloads the timers on the info page */
    private async executeTimerRefreshEvent(): Promise<void> {
        this.refreshSettings();
        const time = await this.fetchSettings(["lastUpdate", "updateInterval"], true);

        $("span#subscriptions-lastupdate").html(getLastUpdateText(time.lastUpdate));
        $("span#subscriptions-nextupdate").html(getNextUpdateText(time.lastUpdate, time.updateInterval));

        $("i#subscription-action-update").toggleClass("fa-spin", SubscriptionManager.updateInProgress);

        /** Formats the last update timestamp into a readable date */
        function getLastUpdateText(lastUpdate: number): string {
            if (SubscriptionManager.updateInProgress) return "In progress . . .";
            else if (lastUpdate === 0) return "Never";
            else return Util.timeAgo(lastUpdate);
        }

        /** Formats the next update timestamp into a readable date */
        function getNextUpdateText(lastUpdate: number, updateInterval: number): string {
            const now = Util.getTime();

            if (SubscriptionManager.updateInProgress) return "In progress . . .";
            else if (lastUpdate === 0) return Util.timeAgo(now + updateInterval);
            else if ((lastUpdate + updateInterval) < now) return "Less than a minute";
            else return Util.timeAgo(lastUpdate + updateInterval + (60 * 1000));
        }
    }

    private refreshHeaderNotifications(): number {
        let totalCount = 0;
        this.trackers.forEach((subscription) => {
            totalCount += parseInt(subscription.tabElement.attr("data-updates"));
        });
        this.$openSubsButton.attr("data-updates", totalCount);
        return totalCount;
    }

    private refreshTabNotifications(subscription: TrackerData): number {
        const curCount = subscription.content.find(".new").length;
        subscription.content.attr("data-updates", curCount);
        subscription.tabElement.attr("data-updates", curCount);
        return curCount;
    }

    /** Clears the notifications for the specified tab */
    private async clearTabNotification(tabIndex: number): Promise<boolean> {
        const subscription = this.getTracker(tabIndex);
        if (subscription === undefined) return;

        // Clear the `new` class that is counted by `refreshNotifications()`
        // `new-visited` should have the same exact styling as `new`
        const newItems = subscription.content.find(".new").get();
        for (const item of newItems) { $(item).removeClass("new").addClass("new-viewed"); }

        // Recount notifications. The cache can get updated in the background, no need to wait
        this.refreshTabNotifications(subscription);
        this.refreshHeaderNotifications();

        // Remove the `new` flags from the cached data
        const cache = subscription.instance.getCache();

        let cleared = 0;
        cache.forEach((entry) => {
            if (entry.new) cleared++;
            delete entry["new"];
            return entry;
        });

        // Only update cache if changes have been made
        if (cleared > 0) await cache.save();
    }

    /**
     * Adds the subscribe / unsubscribe buttons for the provided subscription
     * @param instance Subscription instance
     */
    public addSubscribeButtons(instance: SubscriptionTracker): void {
        let subscriptionData: Subscription = instance.fetchSettings("data");

        const elements = instance.getButtonAttachment().get();
        for (const element of elements) {
            const $element = $(element);

            // Don't add subscription buttons if they already exist
            if ($element.find("button.subscribe, a.subscribe").length > 0) continue;

            const id = instance.getSubscriberId($element);

            // Create buttons
            const $subscribeButton = instance.makeSubscribeButton();
            const $unsubscribeButton = instance.makeUnsubscribeButton();

            if (subscriptionData[id] === undefined) $unsubscribeButton.addClass("display-none");
            else $subscribeButton.addClass("display-none");

            instance.insertButton($element, $subscribeButton);
            instance.insertButton($element, $unsubscribeButton);

            // Process subscribe / unsubscribe actions
            let processing = false;
            $subscribeButton.click(async (event) => {
                event.preventDefault();

                if (processing) return;
                processing = true;

                execSubscribe(id, $subscribeButton, $unsubscribeButton, $element)
                    .then(() => { processing = false; });
            });
            $unsubscribeButton.click(async (event) => {
                event.preventDefault();

                if (processing) return;
                processing = true;

                execUnsubscribe(id, $subscribeButton, $unsubscribeButton)
                    .then(() => { processing = false; });
            });
        }

        async function execSubscribe(id: string, $subscribeButton: JQuery<HTMLElement>, $unsubscribeButton: JQuery<HTMLElement>, $element: JQuery<HTMLElement>): Promise<boolean> {
            subscriptionData = await instance.fetchSettings("data", true);
            subscriptionData[id] = { name: instance.getSubscriberName($element), };

            $subscribeButton.addClass("display-none");
            $unsubscribeButton.removeClass("display-none");

            return instance.pushSettings("data", subscriptionData);
        }

        async function execUnsubscribe(id: string, $subscribeButton: JQuery<HTMLElement>, $unsubscribeButton: JQuery<HTMLElement>): Promise<boolean> {
            subscriptionData = await instance.fetchSettings("data", true);
            delete subscriptionData[id];

            $subscribeButton.removeClass("display-none");
            $unsubscribeButton.addClass("display-none");

            return instance.pushSettings("data", subscriptionData);
        }
    }

    /**
     * Creates a divider between cached items and the ones added by an update.  
     * Should be inserted at the very beginning of the stack, actual sorting is done by CSS
     */
    private createCacheDivider(): JQuery<HTMLElement> {
        const $content = $("<div>")
            .addClass("subscription-update notice notice-cached");

        $("<div>")
            .addClass("subscription-update-title")
            .html("Older Updates")
            .appendTo($content);

        return $content;
    }

    /**
     * Creates a subscription update element based on the provided data and the subscription's definition
     * // TODO Fix this
     * @param timeStamp Time when the update was created
     * @param data Update data
     * @param actions Subscription definition
     * @param customClass Custom class to add to the element
     */
    private createUpdateEntry(timestamp: number, data: UpdateContent, subscription: TrackerData, clickAction: ThumbnailClickAction): JQuery<HTMLElement> {
        const actions = subscription.instance.updateActions,
            cache = subscription.instance.getCache();

        const $content = $("<div>").addClass("subscription-update" + (data.new ? " new" : ""));
        const timeAgo = Util.timeAgo(timestamp);
        const timeString = new Date(timestamp).toLocaleString();

        // ===== Create Elements =====
        // Image
        const $imageDiv = $("<div>")
            .addClass("subscription-update-preview")
            .appendTo($content);

        const $image = $("<img>")
            .attr({
                "src": DomUtilities.getPlaceholderImage(),
                "data-src": actions.imageSrc(data),
                "title": actions.updateText(data) + "\n" + timeAgo + "\n" + timeString
            })
            .addClass("lazyload")
            .on("error", () => { if (actions.imageRemoveOnError) $content.remove(); });

        if (actions.imageHref === undefined) $image.appendTo($imageDiv);
        else {
            const $link = $("<a>")
                .addClass("subscription-update-thumbnail")
                .attr("href", actions.imageHref(data))
                .appendTo($imageDiv)
                .append($image);

            let dbclickTimer: number;
            let prevent = false;

            $link.on("click.re621.thumbnail", (event) => {
                if (event.button !== 0) { return; }
                event.preventDefault();

                dbclickTimer = window.setTimeout(() => {
                    if (!prevent) {
                        $link.off("click.re621.thumbnail");
                        $link[0].click();
                    }
                    prevent = false;
                }, 200);
            }).on("dblclick.re621.thumbnail", (event) => {
                if (event.button !== 0) { return; }

                event.preventDefault();
                window.clearTimeout(dbclickTimer);
                prevent = true;

                if (clickAction === ThumbnailClickAction.NewTab) XM.Util.openInTab(window.location.origin + $link.attr("href"), false);
                else {
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
            });
        }

        // Title
        const $title = $("<div>")
            .addClass("subscription-update-title")
            .appendTo($content);

        if (actions.updateHref === undefined)
            $("<div>")
                .html(actions.updateText(data))
                .attr("data-id", data.id)
                .appendTo($title);
        else
            $("<a>")
                .html(actions.updateText(data))
                .attr({
                    "href": actions.updateHref(data),
                    "data-id": data.id,
                })
                .appendTo($title);

        if (data.nameExtra)
            $("<span>")
                .addClass("subscriptions-update-title-extra")
                .html(data.nameExtra)
                .appendTo($title);

        // Remove from Cache
        const $remove = $("<div>")
            .addClass("subscription-update-remove")
            .appendTo($content);

        $("<a>")
            .addClass("sub-" + subscription.tabIndex + "-remove")
            .attr("title", "Remove")
            .html(`<i class="fas fa-times"></i>`)
            .appendTo($remove)
            .click(async (event) => {
                event.preventDefault();

                const $buttons = $("a.sub-" + subscription.tabIndex + "-remove");
                $buttons.css("visibility", "hidden");

                cache.deleteItem(timestamp);
                await cache.save();

                $buttons.css("visibility", "");
                $content.css("display", "none");
            });

        // Link to "All Posts" page
        const $full = $("<div>")
            .addClass("subscription-update-full")
            .appendTo($content);

        if (actions.sourceHref === undefined) {
            $("<div>")
                .html(actions.sourceText(data))
                .appendTo($full);
        } else {
            $("<a>")
                .attr("href", actions.sourceHref(data))
                .html(actions.sourceText(data))
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

    /**
     * Toggles the notifications window
     */
    private openNotifications(): void {
        $("a#header-button-notifications")[0].click();
    }

}

export interface Subscription {
    [id: string]: SubscriptionData;
}

interface SubscriptionData {
    md5?: string;
    lastId?: number;
    name?: string;
}

interface TrackerData {
    /** Tracker instance */
    instance: SubscriptionTracker;

    /** Tab selection element */
    tabElement?: JQuery<HTMLElement>;

    /** Index of the tab selection element in the list */
    tabIndex?: number;

    /** Tab contents */
    content?: JQuery<HTMLElement>;
}

enum TIME_PERIOD {
    SECOND = 1000,
    MINUTE = 60 * TIME_PERIOD.SECOND,
    HOUR = 60 * TIME_PERIOD.MINUTE,
    DAY = 24 * TIME_PERIOD.HOUR,
    WEEK = 7 * TIME_PERIOD.DAY,
};
