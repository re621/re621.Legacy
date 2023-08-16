import { ModuleController } from "../../models.old/ModuleController";
import { RE6Module, Settings } from "../../models.old/RE6Module";
import { XM } from "../../models/api/XM";
import { Form, FormElement } from "../../models/structure/Form";
import Modal from "../../models/structure/Modal";
import { TabContent, Tabbed } from "../../models/structure/Tabbed";
import { Util } from "../../utility/Util";
import { TagTracker } from "./TagTracker";
import { SubscriptionTracker } from "./_SubscriptionTracker";


export class SubscriptionManager extends RE6Module {

    // Hard-coded cache version. If the stored value is different from this, the cache gets cleared
    private static cacheVersion = 3;
    private static cacheValid: boolean;

    // List of trackers - needs to be registered from the main file
    private static trackers: SubscriptionTracker[] = [];

    private static windowOpen = false;      // Whether or not the notifications window is open
    private static activeTab: string;       // ID of the tracker tab that is open

    private tabbed: JQuery<HTMLElement>;    // Tabs of the notifications window, used to pass settings to CSS

    public constructor() {
        super();
        this.registerHotkeys(
            { keys: "hotkeyOpenNotifications", fnct: this.openNotifications },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            cacheVersion: 0,                // utility variable, cache is cleared if it does not match the hardcoded one

            skipPreflightChecks: false,     // suppresses the network status check before the update
            loadLargeThumbs: false,         // replaces the preview-sized thumbnails with (animated) sample sized ones

            windowWidth: "37",              // width of the notifications window, in REM
            thumbWidth: "8.75",             // HEIGHT of the thumbnails, in REM. misleading name, due to backwards compatibility
            thumbCols: "4",                 // number of thumbnail columns

            hotkeyOpenNotifications: "",    // hotkey that opens the notifications window
        }
    }

    public create(): void {
        super.create();

        // Create a notifications button
        const openSubscriptionsButton = Util.DOM.addSettingsButton({
            id: "header-button-notifications",
            name: `<i class="fas fa-bell"></i>`,
            title: "Notifications",
            attr: {
                "data-loading": "false",
                "data-updates": "0",
            },
            linkClass: "update-notification",
            onClick: () => { SubscriptionManager.trigger("windowOpen"); },
        });

        // Create tab headers and content
        // This is a more robust way to track when the user sees the updates page,
        // even though it is admittedly more complicated than listening to various
        // button clicks and window opens.
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((value) => {
                // console.log(`Sub${$(value.target).parent().attr("content")}: ` + (value.isIntersecting ? "Entering" : "Leaving"));
                SubscriptionManager.trigger("intersect." + $(value.target).parent().attr("content"), value.isIntersecting);
            });
        });

        const trackerPages: TabContent[] = [];
        const trackerIDs: string[] = [];
        for (const tracker of SubscriptionManager.trackers) {
            $(() => { tracker.appendSubscribeButton(); });
            trackerPages.push({
                name: tracker.getOutputTab(),
                content: tracker.getOutputContainer(),
            });
            trackerIDs.push(tracker.getTrackerID());
            observer.observe(tracker.getCanvasElement()[0]);
        }

        // Establish the settings window contents
        this.tabbed = new Tabbed({
            name: "notifications-tabs",
            class: "config-tabs",
            content: [
                ...trackerPages,
                {
                    name: "Settings",
                    content: this.createSettingsPage().render(),
                }
            ]
        }).render();
        this.rebuildTabbedSettings();

        let windowAlreadyOpened = false;
        const tabbedObserver = new IntersectionObserver((entries) => {
            const tabbed = entries[0];
            SubscriptionManager.windowOpen = tabbed.isIntersecting;
            if (!windowAlreadyOpened) windowAlreadyOpened = true;
            // console.log("notifications", SubscriptionManager.windowOpen, SubscriptionManager.activeTab);
        });
        tabbedObserver.observe(this.tabbed[0]);

        this.tabbed.on("tabsactivate", () => {
            // console.log("tabs", trackerIDs[content.tabs("option", "active")]);
            SubscriptionManager.activeTab = trackerIDs[this.tabbed.tabs("option", "active")];
        });
        SubscriptionManager.activeTab = trackerIDs[this.tabbed.tabs("option", "active")];

        // Update the notifications button when updates occur
        SubscriptionManager.on("notification", () => {
            let loading = false,
                updates = 0,
                index = 0;
            for (const trackerTab of trackerPages) {
                if (typeof trackerTab.name == "string") continue;

                if (trackerTab.name.attr("loading") == "true") loading = true;
                updates += (parseInt(trackerTab.name.attr("updates")) || 0);

                if (!windowAlreadyOpened && updates > 0) {
                    windowAlreadyOpened = true;
                    this.tabbed.tabs("option", "active", index);
                    // console.log("tab opening", index);
                }

                index++;
            }

            openSubscriptionsButton.attr({
                "data-loading": loading,
                "data-updates": updates,
            });
        });

        // Create the modal
        const modal = new Modal({
            title: "Notifications",
            triggers: [{ element: openSubscriptionsButton }],
            escapable: false,
            fixed: true,
            reserveHeight: true,
            content: this.tabbed,
            position: { my: "right", at: "right" },
        });
        modal.getElement().addClass("subscription-wrapper");

        SubscriptionManager.on("windowOpen", async () => {

            // Align the modal window relative to the page
            // This is really dumb, but so is JQuery-UI, which caused this issue to begin with
            const modalEl = modal.getElement().parent();
            modalEl.addClass("vis-hidden");
            await Util.sleep(50);

            // Calculates offsets relative to the page
            // Document's width cannot be used, since some people have ridiculous profile descriptions that extend past that
            // ex. Fenrick https://e621.net/users/87183
            // Window's width is inconsistent and just generally not very useful
            const $page = $("#page"), pageOffset = $page.offset();
            modalEl.css("left", (pageOffset.left + $page.outerWidth() - modalEl.outerWidth()) + "px");
            modalEl.css("top", pageOffset.top + "px");

            modalEl.removeClass("vis-hidden");
        });

        for (const tracker of SubscriptionManager.trackers)
            tracker.draw();

        // Establish heartbeat
        setInterval(() => { SubscriptionManager.trigger("heartbeat"); }, Util.Time.MINUTE);
        SubscriptionManager.trigger("heartbeat");

    }

    /**
     * Stores tracker instances for later use.  
     * This does not initialize the modules - they still have to be registered in the ModuleController
     * @param moduleList List of tracker modules to register
     */
    public static async register(moduleList: any | any[]): Promise<number> {
        if (!Array.isArray(moduleList)) moduleList = [moduleList];
        for (const moduleClass of moduleList) {
            const instance = moduleClass.getInstance();
            await instance.init();
            this.trackers.push(instance);
        }
        return Promise.resolve(this.trackers.length);
    }

    /** Returns a complete list of all active trackers */
    public static getAllTrackers(): SubscriptionTracker[] {
        return this.trackers;
    }

    /**
     * Generates a settings page for the subscriptions trackers
     * @returns Settings form
     */
    private createSettingsPage(): Form {
        const subSections: FormElement[] = [],
            trackerConfig: FormElement[] = [];

        const tagTracker = ModuleController.get(TagTracker);

        for (const subscription of SubscriptionManager.trackers) {
            subSections.push(makeSubscriptionSection(subscription));
            trackerConfig.push(makeTrackerConfig(subscription));
        }

        return new Form({ name: "subscriptions-controls", columns: 2, width: 2 }, [
            Form.header("Subscriptions", 2),
            ...subSections,
            Form.hr(2),

            Form.header("Settings", 2),
            Form.section({ wrapper: "subscription-settings", columns: 2, width: 2, }, trackerConfig),
            Form.spacer(2, true),

            Form.text(`Interval: How often should the subscriptions be checked for updates`, 2, "subscription-tutorial"),
            Form.text(`Cache Size: Maximum number of updates stored, between 10 and 500`, 2, "subscription-tutorial"),
            Form.text(`Cache Age: Updates older than this are removed automatically`, 2, "subscription-tutorial"),
            Form.hr(2),

            Form.subheader(
                "Notifications Window Width",
                "At least 37, no more than 99",
                1
            ),
            Form.input(
                {
                    value: this.fetchSettings("windowWidth"),
                    width: 1,
                    pattern: "^(3[7-9]|[4-9][0-9])(\\.\\d{1,2})?$",
                },
                async (data, input) => {
                    if (input.val() == "" || !(input.get()[0] as HTMLInputElement).checkValidity()) return;
                    await this.pushSettings("windowWidth", data);
                    this.rebuildTabbedSettings();
                }
            ),

            Form.subheader(
                "Thumbnail Columns",
                "Number of columns in the grid",
                1
            ),
            Form.input(
                {
                    value: this.fetchSettings("thumbCols"),
                    width: 1,
                    pattern: "^[1-9]$",
                },
                async (data, input) => {
                    if (input.val() == "" || !(input.get()[0] as HTMLInputElement).checkValidity()) return;
                    await this.pushSettings("thumbCols", data);
                    this.rebuildTabbedSettings();
                }
            ),

            Form.subheader(
                "Thumbnail Height",
                "Vertical dimension of the thumbnails",
                1
            ),
            Form.input(
                {
                    value: this.fetchSettings("thumbWidth"),
                    width: 1,
                    pattern: "^[1-9][0-9]?(\\.\\d{1,2})?$",
                },
                async (data, input) => {
                    if (input.val() == "" || !(input.get()[0] as HTMLInputElement).checkValidity()) return;
                    await this.pushSettings("thumbWidth", data);
                    this.rebuildTabbedSettings();
                }
            ),

            Form.checkbox(
                {
                    value: this.fetchSettings("skipPreflightChecks"),
                    label: "<b>Skip Preflight Checks</b><br />Disables the extra network checks before updating the subscriptions",
                    width: 2,
                },
                async (data) => {
                    await this.pushSettings("skipPreflightChecks", data);
                }
            ),
            Form.spacer(2, true),

            Form.checkbox(
                {
                    value: this.fetchSettings("loadLargeThumbs"),
                    label: "<b>Load Large Thumbnails</b><br />Use the larger animation-enabled thumbnails instead of the default ones",
                    width: 2,
                },
                async (data) => {
                    await this.pushSettings("loadLargeThumbs", data);
                }
            ),
            Form.spacer(2, true),

            Form.checkbox(
                {
                    value: tagTracker.fetchSettings("hideMinorButton"),
                    label: "<b>Hide Quick Subscribe Buttons</b><br />Don't show <3 buttons in the sidebar",
                    width: 1,
                },
                async (data) => {
                    await tagTracker.pushSettings("hideMinorButton", data);
                }
            ),
            Form.requiresReload(),
            Form.spacer(2, true),

        ]);

        function makeSubscriptionSection(instance: SubscriptionTracker): FormElement {
            let toggleLock = false;
            return Form.collapse({ title: instance.getTrackerID(), columns: 2, width: 2, badge: instance.getSubscriptionBadge(), }, [
                Form.div({ value: instance.getSubscriptionList(), width: 2, }),
            ], (id) => {
                if (toggleLock) return;
                toggleLock = true;

                // This should create an accordion effect, even though
                // these sections are not a part of the same structure
                for (const el of $("#subscriptions-controls h3.collapse-header").get()) {
                    const $el = $(el);
                    if ($el.attr("id") == id || $el.attr("aria-expanded") !== "true") continue;
                    $el[0].click();
                }

                toggleLock = false;
            });
        }

        function makeTrackerConfig(instance: SubscriptionTracker): FormElement {
            let updateInterval = instance.fetchSettings<number>("updateInterval");

            // Fix for the update timer heading into the eternity
            if (updateInterval > Util.Time.HOUR * 24 || (updateInterval < Util.Time.HOUR && updateInterval != -1)) {
                updateInterval = Util.Time.HOUR;
                instance.pushSettings("updateInterval", updateInterval);
            }

            // Convert into a usable format
            if (updateInterval !== -1) updateInterval /= Util.Time.HOUR;

            let working = false;
            return Form.section({ columns: 1, width: 1, }, [
                Form.header(instance.getTrackerID(), 1),

                Form.select(
                    {
                        label: "Interval",
                        value: updateInterval + "",
                        title: "How often should the subscriptions be checked for updates",
                    },
                    {
                        "-1": "Manual Only",
                        "1": "1 hour",
                        "6": "6 hours",
                        "12": "12 hours",
                        "24": "24 hours",
                    },
                    async (data) => {
                        data = Math.max(parseFloat(data) * Util.Time.HOUR, -1);
                        if (data < Util.Time.HOUR && data != -1) data = Util.Time.HOUR;
                        await instance.pushSettings("updateInterval", data);
                        SubscriptionManager.trigger("timer." + instance.getTrackerID());
                    }
                ),

                Form.input(
                    {
                        label: "Cache Size",
                        value: instance.fetchSettings("cacheSize"),
                        pattern: "^([1-9][0-9]|[1-4][0-9][0-9]|500)$",
                        title: "Number of items kept in the update cache. Must be at least 10, but no more than 500",
                    },
                    async (data, input) => {
                        if (!(input.get()[0] as HTMLInputElement).checkValidity()) return;
                        await instance.pushSettings("cacheSize", parseInt(data));
                    }
                ),

                Form.select(
                    {
                        label: "Max Age",
                        value: instance.fetchSettings("cacheMaxAge") / Util.Time.WEEK,
                        title: "Updates older than this are removed automatically",
                    },
                    {
                        "0": "None",
                        "7": "1 week",
                        "2": "2 weeks",
                        "4": "1 month",
                        "24": "6 months",
                    },
                    async (data) => {
                        await instance.pushSettings("cacheMaxAge", parseInt(data) * Util.Time.WEEK);
                    }
                ),

                Form.input({
                    label: "Next Update",
                    value: ($el) => {

                        $el.val("Initializing");

                        let eventLock = false;
                        SubscriptionManager.on("timer." + instance.getTrackerID(), async () => {
                            if (eventLock) return;
                            eventLock = true;

                            // console.log(`Sub${instance.getTrackerID()}: timer`);

                            let timer = parseInt($el.data("timer") || "0");
                            // console.log(`Sub${instance.getTrackerID()}: timer end ${timer}`);
                            clearInterval(timer);
                            $el.removeData("timer");

                            if (instance.isUpdateInProgress()) {
                                $el.val("In Progress")
                                    .attr("title", "An update is currently in progress.\nPlease, stand by.");
                                eventLock = false;
                                return;
                            }

                            if (instance.isNetworkOffline()) {
                                $el.val("Network Offline")
                                    .attr("title", "Unable to reach e621 servers.\nPlease, check your Internet connection.")
                                    .addClass("failed-attempt");
                                eventLock = false;
                                return;
                            }

                            await instance.refreshSettings();

                            const period = instance.fetchSettings<number>("updateInterval");
                            if (period == -1) {
                                $el.val("Never");
                                eventLock = false;
                                return;
                            }

                            const lastUpdate = instance.fetchSettings<number>("lastUpdate"),
                                lastAttempt = instance.fetchSettings<number>("lastAttempt");
                            const date = lastAttempt
                                ? lastAttempt + SubscriptionTracker.attemptCooldown
                                : lastUpdate + period;

                            $el.toggleClass("failed-attempt", lastAttempt > 0);

                            $el.attr("title",
                                (lastAttempt ? `Previous update attempt failed.\n` : ``)
                                + (lastAttempt ? `Last attempt: ${Util.Time.format(lastAttempt)}\n` : ``)
                                + (lastUpdate ? `Last update: ${Util.Time.format(lastUpdate)}\n` : ``)
                                + `Next update: ${Util.Time.format(date)}`
                            )

                            timer = parseInt($el.data("timer") || "0");
                            if (timer) {
                                // console.log(`Sub${instance.getTrackerID()}: timer exists ${timer}`);
                                eventLock = false;
                                return;
                            }

                            let tick = true;
                            timer = window.setInterval(() => {
                                const now = Util.Time.now();
                                const distance = date - now;

                                const hours = Math.floor(distance / Util.Time.HOUR);
                                const minutes = Math.floor((distance % Util.Time.HOUR) / Util.Time.MINUTE);
                                const seconds = Math.floor((distance % Util.Time.MINUTE) / Util.Time.SECOND);

                                const parts = [leftpad(minutes), leftpad(seconds)];
                                if (hours) parts.unshift(leftpad(hours));
                                $el.val(parts.join(tick ? "   " : " : "));
                                tick = !tick;

                                if (distance < 0) {
                                    // console.log(`Sub${instance.getTrackerID()}: timer end ${timer}`);
                                    clearInterval(timer);
                                    $el.removeData("timer")
                                        .val("Pending")
                                        .attr("title", "An update has been scheduled.");
                                }
                            }, 0.5 * Util.Time.SECOND);
                            $el.data("timer", timer);

                            // console.log(`Sub${instance.getTrackerID()}: timer setup ${timer}`);
                            eventLock = false;
                        });
                        SubscriptionManager.trigger("timer." + instance.getTrackerID());

                        function leftpad(value: number): string {
                            return (value < 10 ? "0" : "") + value;
                        }
                    },
                    disabled: true,
                    wrapper: "update-timer",
                }),

                Form.section({ wrapper: "subscription-control-btn", width: 1, columns: 1, }, [
                    Form.button({ value: "Manual Update", }, async (value, button) => {
                        if (working) return;
                        working = true;

                        button.html(`<i class="fas fa-spinner fa-spin"></i>`);
                        await instance.update();
                        button.html(`Done!`);
                        await Util.sleep(1000);
                        button.html("Manual Update");

                        working = false;
                    }),

                    Form.button({ value: "Clear Cache", }, async (value, button) => {
                        if (working) return;
                        working = true;

                        button.html(`<i class="fas fa-spinner fa-spin"></i>`);
                        await instance.clear();
                        button.html(`Done!`);
                        await Util.sleep(1000);
                        button.html("Clear Cache");

                        working = false;
                    }),
                ]),
            ]);
        }
    }

    /** Fills in the CSS variables for the window width */
    private rebuildTabbedSettings(): void {
        const conf = this.fetchSettings(["windowWidth", "thumbWidth", "thumbCols"]);
        this.tabbed.removeAttr("style").css({
            "--window-width": conf.windowWidth + "rem",
            "--thumb-width": conf.thumbWidth + "rem",
            "--thumb-cols": conf.thumbCols,
        });
    }

    /**
     * Checks if the stored cache version is the same as the hardcoded one.
     * @returns True if the cache is valid, false otherwise
     */
    public static async isCacheValid(): Promise<boolean> {
        if (typeof SubscriptionManager.cacheValid !== "undefined")
            return SubscriptionManager.cacheValid;

        const settings = await XM.Storage.getValue("re621.SubscriptionManager", {});
        SubscriptionManager.cacheValid = SubscriptionManager.cacheVersion == ((settings).cacheVersion || 0);
        if (!SubscriptionManager.cacheValid) {
            settings.cacheVersion = SubscriptionManager.cacheVersion;
            await XM.Storage.setValue("re621.SubscriptionManager", settings);
        }

        return SubscriptionManager.cacheValid;
    }

    /**
     * Toggles the notifications window
     */
    private openNotifications(): void {
        $("a#header-button-notifications")[0].click();
    }

}

