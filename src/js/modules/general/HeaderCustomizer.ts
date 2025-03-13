import { Page } from "../../components/data/Page";
import { User } from "../../components/data/User";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Form } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Util } from "../../components/utility/Util";

/**
 * HeaderCustomizer
 * Add, remove, and re-arrange the tabs in the customizable navbar
 */
export class HeaderCustomizer extends RE6Module {

    private $oldMenu: JQuery<HTMLElement>;

    private $menu: JQuery<HTMLElement>;

    private updateTabModal: Modal;

    private updateTabForm: Form;

    private addTabButton: JQuery<HTMLElement>;

    private addTabModal: Modal;

    // Temporary workaround for forum updates notification
    private hasForumUpdates: boolean;

    public constructor () {
        super();
        this.registerHotkeys(
            { keys: "hotkeyTab1", fnct: () => { HeaderCustomizer.openTabNum(0); } },
            { keys: "hotkeyTab2", fnct: () => { HeaderCustomizer.openTabNum(1); } },
            { keys: "hotkeyTab3", fnct: () => { HeaderCustomizer.openTabNum(2); } },
            { keys: "hotkeyTab4", fnct: () => { HeaderCustomizer.openTabNum(3); } },
            { keys: "hotkeyTab5", fnct: () => { HeaderCustomizer.openTabNum(4); } },
            { keys: "hotkeyTab6", fnct: () => { HeaderCustomizer.openTabNum(5); } },
            { keys: "hotkeyTab7", fnct: () => { HeaderCustomizer.openTabNum(6); } },
            { keys: "hotkeyTab8", fnct: () => { HeaderCustomizer.openTabNum(7); } },
            { keys: "hotkeyTab9", fnct: () => { HeaderCustomizer.openTabNum(8); } },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings (): Settings {
        return {
            enabled: true,

            hotkeyTab1: "1",
            hotkeyTab2: "2",
            hotkeyTab3: "3",
            hotkeyTab4: "4",
            hotkeyTab5: "5",
            hotkeyTab6: "6",
            hotkeyTab7: "7",
            hotkeyTab8: "8",
            hotkeyTab9: "9",

            tabs: [
                { name: "Profile", href: "/users/%userid%" },
                { name: "Posts", href: "/posts" },
                { name: "Comments", href: "/comments?group_by=post" },
                { name: "Artists", href: "/artists" },
                { name: "Tags", href: "/tags" },
                { name: "Blips", href: "/blips" },
                { name: "Pools", href: "/pools" },
                { name: "Sets", href: "/post_sets" },
                { name: "Wiki", href: "/wiki_pages?title=help:home" },
                { name: "Forum", href: "/forum_topics" },
                { name: "Discord", href: "/static/discord" },
                { name: "Help", href: "/help" },
                { name: "More »", href: "/static/site_map" },
            ],

            forumUpdateDot: true,
        };
    }

    /**
     * Creates the module's structure.
     * Should be run immediately after the constructor finishes.
     */
    public create (): void {
        super.create();

        // Check for forum updates before the structure changes
        this.hasForumUpdates = $("li#nav-forum").hasClass("forum-updated");

        // Create the structure and store the old navbar for later
        this.$menu = $("menu.nav-primary");
        this.$oldMenu = $("<div>").css("display", "none").appendTo("body");
        this.$menu.children().appendTo(this.$oldMenu);
        this.$menu.addClass("custom");

        // Load stored data
        for (const value of this.fetchSettings<HeaderTab[]>("tabs"))
            this.createTabElement(value);
        this.reloadTabMargins();

        this.$menu.sortable({
            axis: "x",
            containment: "parent",
            helper: "clone",
            forceHelperSize: true,
            opacity: 0.75,
            cursor: "grabbing",

            disabled: true,

            update: () => {
                this.reloadTabMargins();
                this.saveNavbarSettings();
            },
        });

        this.createConfigInterface();

        // Toggle the forum update dot
        this.toggleForumDot(this.fetchSettings("forumUpdateDot"));

        // Configuration Form Listeners
        this.addTabModal.getElement().on("dialogopen", () => { this.enableEditingMode(); });
        this.addTabModal.getElement().on("dialogclose", () => { this.disableEditingMode(); });
    }

    public destroy (): void {
        if (!this.isInitialized()) return;
        super.destroy();
        this.$menu.removeClass("custom").empty();

        this.$menu.sortable("destroy");
        this.addTabButton.remove();
        this.addTabModal.destroy();
        this.updateTabModal.destroy();

        this.$oldMenu.children().appendTo(this.$menu);
        this.$oldMenu.remove();
    }

    /** Creates the configuration forms and modals */
    private createConfigInterface (): void {

        // === Tab Configuration Interface
        this.addTabButton = Util.DOM.addSettingsButton({
            id: "header-button-customizer",
            name: `<i class="fas fa-tasks"></i> <span>Customize</span>`,
            title: "Edit Header Tabs",
            tabClass: "nav-re6-headercus",
        });

        const newTabForm = new Form(
            { name: "header-customizer-new" },
            [
                Form.input({ label: "Name", name: "name", value: "", required: true, pattern: "[\\S ]+" }),
                Form.input({ label: "Hover", value: "", name: "title" }),
                Form.input({ label: "Link", value: "", name: "href" }),
                Form.checkbox({ label: "Attach to the right side", value: false, name: "right" }),
                Form.button({ value: "Submit", type: "submit" }),
                Form.hr(),
                Form.div({ value: "Available variables:" }),
                Form.copy({ label: "Unique ID", value: "%userid%" }),
                Form.copy({ label: "Username", value: "%username%" }),
                Form.hr(),
                Form.div({ value: "Drag-and-drop tabs to re-arrange.<br />Click on a tab to edit it." }),
            ],
            (values, form) => {
                this.addTab({
                    name: values["name"],
                    title: values["title"],
                    href: values["href"],
                    right: values["right"],
                });
                form.reset();
                this.reloadTabMargins();
            },
        );

        this.addTabModal = new Modal({
            title: "Add Tab",
            triggers: [{ element: this.addTabButton }],
            content: Form.placeholder(),
            structure: newTabForm,
            position: { my: "right top", at: "right top" },
        });

        // Tab Update Interface
        this.updateTabForm = new Form(
            { name: "header-customizer-update" },
            [
                Form.input({ label: "Name", name: "name", value: "", required: true, pattern: "[\\S ]+" }),
                Form.input({ label: "Hover", value: "", name: "title" }),
                Form.input({ label: "Link", value: "", name: "href" }),
                Form.checkbox({ label: "Attach to the right side", value: false, name: "right" }),
                Form.button(
                    { value: "Delete", type: "button" },
                    () => {
                        this.deleteTab(this.updateTabModal.getActiveTrigger().parent());
                        this.updateTabModal.close();
                    },
                ),
                Form.button({ value: "Update", type: "submit" }),
            ],
            (values, form) => {
                this.updateTab(
                    this.updateTabModal.getActiveTrigger().parent(),
                    {
                        name: values["name"],
                        title: values["title"],
                        href: values["href"],
                        right: values["right"],
                    },
                );
                this.updateTabModal.close();
                form.reset();
                this.reloadTabMargins();
            },
        );

        this.updateTabModal = new Modal({
            title: "Update Tab",
            triggers: [{ element: $("menu.nav-primary li a") }],
            content: Form.placeholder(),
            structure: this.updateTabForm,
            position: { my: "center top", at: "center top" },
            triggerMulti: true,
            disabled: true,
        });
    }

    /**
     * Turns on editing mode on the header
     */
    private enableEditingMode (): void {
        this.$menu.attr("data-editing", "true");
        this.$menu.sortable("enable");
        this.updateTabModal.enable();

        // Fill in update tab data
        this.updateTabModal.getElement().on("dialogopen", () => {
            const $tab = this.updateTabModal.getActiveTrigger().parent();
            const $updateTabInputs = this.updateTabForm.getInputList();

            $updateTabInputs.get("name").val($tab.data("tab.name"));
            $updateTabInputs.get("title").val($tab.data("tab.title"));
            $updateTabInputs.get("href").val($tab.data("tab.href"));
            $updateTabInputs.get("right").prop("checked", $tab.data("tab.right"));
        });
    }

    /**
     * Turns off the header editing mode
     */
    private disableEditingMode (): void {
        this.$menu.attr("data-editing", "false");
        this.$menu.sortable("disable");

        this.updateTabModal.close();
        this.updateTabModal.disable();
    }

    /** Toggles the red dot next to the forum tab */
    public toggleForumDot (state: boolean): void {
        this.$menu.attr("data-forumdot", "" + state);
    }

    /**
     * Creates a new styled tab
     * @param config Tab configuration
     */
    private createTabElement (config: HeaderTab, triggerUpdate = false): HeaderTabElement {
        config = this.parseHeaderTabConfig(config);

        const $tab = $(`<li>`)
            .data({
                "tab.name": config.name,
                "tab.title": config.title,
                "tab.href": config.href,
                "tab.right": config.right,
            })
            .attr("align", config.right ? "true" : undefined)
            .appendTo(this.$menu);
        const $link = $("<a>")
            .html(this.processTabVariables(config.name))
            .appendTo($tab);

        if (config.title !== "") $link.attr("title", this.processTabVariables(config.title));
        if (config.href !== "") $link.attr("href", this.processTabVariables(config.href));

        if (config.href === "/forum_topics" && this.hasForumUpdates)
            $link.addClass("tab-has-updates");
        else if ((config.href == "/users/%userid%" || config.href == "/users/home") && !User.loggedIn) {
            $link
                .attr("href", "/session/new")
                .addClass("tab-login")
                .html("Sign In");
        }

        if (triggerUpdate) { this.saveNavbarSettings(); }

        if (config.href.trim() !== "" && Page.getURL().pathname.includes(this.processTabVariables(config.href).split("?")[0])) {
            $tab.addClass("bg-foreground");
        }

        return { tab: $tab, link: $link };
    }

    /**
     * Parses the provided configuration file for missing values
     * @param config Configuration to process
     */
    private parseHeaderTabConfig (config: HeaderTab): HeaderTab {
        if (config.name === undefined) config.name = "New Tab";
        if (config.href === undefined) config.href = "";
        if (config.title === undefined) config.title = "";
        if (config.right === undefined) config.right = false;

        return config;
    }

    /**
     * Creates a new tab based on specified configuration
     * @param config Configuration
     */
    private addTab (config: HeaderTab): void {
        config = this.parseHeaderTabConfig(config);
        const newTab = this.createTabElement(config, true);
        this.updateTabModal.registerTrigger({ element: newTab.link });
    }

    /**
     * Update the specified tab with the corresponding configuration
     * @param $element Tab to update
     * @param config New configuration
     */
    private updateTab ($element: JQuery<HTMLElement>, config: HeaderTab): void {
        config = this.parseHeaderTabConfig(config);
        $element
            .data({
                "tab.name": config.name,
                "tab.title": config.title,
                "tab.href": config.href,
                "tab.right": config.right,
            })
            .removeAttr("align")
            .attr("align", config.right ? "true" : undefined);
        $element.find("a").first()
            .html(this.processTabVariables(config.name))
            .attr("title", this.processTabVariables(config.title))
            .attr("href", this.processTabVariables(config.href));
        this.saveNavbarSettings();
    }

    /**
     * Remove the specified tab
     * @param $element LI element of the tab
     */
    private deleteTab ($element: JQuery<HTMLElement>): void {
        $element.remove();
        this.saveNavbarSettings();
    }

    /**
     * Replaces the variables in the text with corresponding values
     * @param text Text to parse
     */
    private processTabVariables (text: string): string {
        return text
            .replace(/%userid%/g, User.userID + "")
            .replace(/%username%/g, User.username);
    }

    /**
     * Iterates over the header menu and saves the data to cookies
     */
    private async saveNavbarSettings (): Promise<void> {
        const tabData = [];
        this.$menu.find("li").each(function (i, element) {
            const $tab = $(element);
            tabData.push({
                name: formatVal($tab.data("tab.name")),
                title: formatVal($tab.data("tab.title")),
                href: formatVal($tab.data("tab.href")),
                right: $tab.data("tab.right") ? true : undefined,
            });
        });
        await this.pushSettings("tabs", tabData);

        function formatVal (value: string): string {
            if (value) return value;
            return undefined;
        }
    }

    /** Emulates a click on the header tab with the specified index */
    private static openTabNum (num: number): void {
        const tabs = ModuleController.get(HeaderCustomizer).$menu.find<HTMLElement>("li > a");
        if (num > tabs.length) return;
        tabs[num].click();
    }

    /** Refreshes the right-aligned tabs to have proper margins */
    private reloadTabMargins (): void {
        this.$menu.children("li").removeClass("margined");
        this.$menu.find("li[align=true]")
            .first()
            .addClass("margined");
    }

}

export interface HeaderTabElement {
    tab: JQuery<HTMLElement>;
    link: JQuery<HTMLElement>;
}

interface HeaderTab {
    /** Text inside the link */
    name?: string;
    /** Link address */
    href?: string;
    /** Hover text */
    title?: string;
    /** If true, aligns the tab to the right */
    right?: boolean;
}
