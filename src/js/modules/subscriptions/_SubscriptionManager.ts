import { RE6Module, Settings } from "../../components/RE6Module";
import { Form, FormElement } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Tabbed, TabContent } from "../../components/structure/Tabbed";
import { Util } from "../../components/utility/Util";
import { SubscriptionTracker } from "./_SubscriptionTracker";


export class SubscriptionManager extends RE6Module {

    // List of trackers - needs to be registered from the main file
    private static trackers: SubscriptionTracker[] = [];

    public static readonly observerConfig = {
        root: null,
        rootMargin: "100% 50% 100% 50%",
        threshold: 0.5,
    };

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            skipPreflightChecks: false,     // suppresses the network status check before the update
        }
    }

    public create(): void {
        super.create();

        // Create a notifications button
        const openSubscriptionsButton = Util.DOM.addSettingsButton({
            id: "header-button-settings",
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
        }, SubscriptionManager.observerConfig);

        const trackerPages: TabContent[] = [];
        for (const tracker of SubscriptionManager.trackers) {
            $(() => { tracker.appendSubscribeButton(); });
            trackerPages.push({
                name: tracker.getOutputTab(),
                content: tracker.getOutputContainer(),
            });
            observer.observe(tracker.getCanvasElement()[0]);
        }

        // Establish the settings window contents
        const content = new Tabbed({
            name: "notifications-tabs",
            class: "config-tabs",
            content: [
                ...trackerPages,
                {
                    name: "Settings",
                    content: this.createSettingsPage().render(),
                }
            ]
        });

        // Update the notifications button when updates occur
        SubscriptionManager.on("notification", () => {
            let loading = false,
                updates = 0;
            for (const trackerTab of trackerPages) {
                if (typeof trackerTab.name == "string") continue;

                if (trackerTab.name.attr("loading") == "true") loading = true;
                updates += (parseInt(trackerTab.name.attr("updates")) || 0);
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
            content: content.render(),
            position: { my: "right", at: "right" },
        });
        modal.getElement().addClass("subscription-wrapper");

        SubscriptionManager.on("windowOpen", async () => {

            // Align the modal window relative to the page
            // This is really dumb, but so is JQuery-UI, which caused this issue to begin with
            const modalEl = modal.getElement().parent();
            modalEl.addClass("vis-hidden");
            await Util.sleep(50);
            modalEl.css("left", ($(document).outerWidth() - modalEl.outerWidth() - 16) + "px");
            modalEl.css("top", $("#page").offset().top + "px");
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

    /**
     * Generates a settings page for the subscriptions trackers
     * @returns Settings form
     */
    private createSettingsPage(): Form {
        const subSections: FormElement[] = [],
            trackerConfig: FormElement[] = [];
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
            Form.spacer(2),

            Form.text(`Interval: How often should the subscriptions be checked for updates`, 2, "subscription-tutorial"),
            Form.text(`Cache Size: Maximum number of updates stored. Must be at least 10, but no more than 500.`, 2, "subscription-tutorial"),
            Form.text(`Cache Age: Updates older than this are removed automatically`, 2, "subscription-tutorial"),
            Form.hr(2),

            Form.checkbox(
                {
                    value: this.fetchSettings("skipPreflightChecks"),
                    label: "<b>Skip Preflight Checks</b><br />Disables the extra network checks before updating the subscriptions",
                    width: 3,
                },
                async (data) => {
                    await this.pushSettings("skipPreflightChecks", data);
                }
            ),
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
                                + (lastUpdate ? `Last updated: ${Util.Time.format(lastUpdate)}\n` : ``)
                                + `Next Update: ${Util.Time.format(date)}`
                            )

                            timer = parseInt($el.data("timer") || "0");
                            if (timer) {
                                // console.log(`Sub${instance.getTrackerID()}: timer exists ${timer}`);
                                eventLock = false;
                                return;
                            }

                            let tick = true;
                            timer = setInterval(() => {
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

}

