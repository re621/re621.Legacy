import { Modal } from "../components/Modal";
import { RE6Module } from "../components/RE6Module";

declare var Cookies;

/**
 * HeaderCustomizer  
 * Add, remove, and re-arrange the tabs in the customizable navbar
 */
export class HeaderCustomizer extends RE6Module {

    private static instance: HeaderCustomizer = new HeaderCustomizer();

    private $menu: JQuery<HTMLElement>;

    private updateModal: Modal;
    private addTabModal: Modal;

    private constructor() {
        super();

        let _self = this;
        this.$menu = $("menu.main");
        this.createDOM();

        // Configuration Form Listeners
        $("#re621-addtab").submit(function (event) {
            event.preventDefault();
            _self.handleNewTabEvent();
        });

        $("#re621-updatetab").submit(function (event) {
            event.preventDefault();
            _self.handleUpdateEvent();
        });

        $("#re621-updatetab-delete").click(function (event) {
            event.preventDefault();
            _self.handleDeleteEvent();
        });

        this.addTabModal.getModal().on("modal:toggle", function (event, modal) {
            if (_self.addTabModal.isVisible()) { _self.enableEditingMode(); }
            else { _self.disableEditingMode(); }
        });
    }

    /**
     * Returns a singleton instance of the class
     * @returns HeaderCustomizer instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new HeaderCustomizer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        let def_settings = {
            tabs: [
                { name: "Account", href: "/users/home" },
                { name: "Posts", href: "/posts" },
                { name: "Comments", href: "/comments?group_by=post" },
                { name: "Artists", href: "/artists" },
                { name: "Tags", href: "/tags" },
                { name: "Blips", href: "/blips" },
                { name: "Pools", href: "/pools" },
                { name: "Sets", href: "/post_sets" },
                { name: "Wiki", href: "/wiki_pages?title=help%3Ahome" },
                { name: "Forum", href: "/forum_topics" },
                { name: "Discord", href: "/static/discord" },
                { name: "Help", href: "/help" },
                { name: "More »", href: "/static/site_map" },
            ]
        };
        return def_settings;
    }

    /**
     * Builds basic structure for the module
     */
    private createDOM() {
        let _self = this;
        this.$menu.html("");

        // Fetch stored data
        this.fetchSettings("tabs").forEach(function (value) {
            _self.createTab({
                name: value.name,
                href: value.href,
                controls: true,
            });
        });

        this.$menu.sortable({
            axis: "x",
            containment: "parent",
            helper: "clone",
            forceHelperSize: true,
            opacity: 0.75,
            cursor: "grabbing",

            disabled: true,

            update: function () { _self.handleUpdate(); },
        });

        // === Tab Configuration Interface
        let addTabButton = this.createTab({
            name: `<i class="fas fa-tasks"></i>`,
            parent: "menu.extra",
            class: "float-left",
        });

        let $addTabForm = $(`<form id="re621-addtab" class="grid-form">`);
        $(`<label for="re621-addtab-name">Name:</label>`).appendTo($addTabForm);
        $(`<input id="re621-addtab-name">`).appendTo($addTabForm);
        $(`<label for="re621-addtab-title">Hover:</label>`).appendTo($addTabForm);
        $(`<input id="re621-addtab-title">`).appendTo($addTabForm);
        $(`<label for="re621-addtab-link">Link:</label>`).appendTo($addTabForm);
        $(`<input id="re621-addtab-link">`).appendTo($addTabForm);
        $(`<button type="submit" class="full-width">Add Tab</button>`).appendTo($addTabForm);

        this.addTabModal = new Modal({
            uid: "header-addtab-modal",
            title: "Add Tab",
            width: "17rem",
            height: "auto",
            position: {
                right: "0",
                top: "4.5rem",
            },
            triggers: [{ element: addTabButton.link, event: "click" }],
            content: [{ name: "re621", page: $addTabForm }],
        });

        // Tab Update Interface
        let $updateTabForm = $(`<form id="re621-updatetab" class="grid-form">`);
        $(`<label for="re621-updatetab-name">Name:</label>`).appendTo($updateTabForm);
        $(`<input id="re621-updatetab-name">`).appendTo($updateTabForm);
        $(`<label for="re621-updatetab-title">Hover:</label>`).appendTo($updateTabForm);
        $(`<input id="re621-updatetab-title">`).appendTo($updateTabForm);
        $(`<label for="re621-updatetab-link">Link:</label>`).appendTo($updateTabForm);
        $(`<input id="re621-updatetab-link">`).appendTo($updateTabForm);
        $(`<button id="re621-updatetab-delete" type="button">Delete</button>`).appendTo($updateTabForm);
        $(`<button id="re621-updatetab-submit" type="submit">Update</button>`).appendTo($updateTabForm);

        this.updateModal = new Modal({
            uid: "header-updatetab-modal",
            title: "Update Tab",
            width: "17rem",
            height: "auto",
            position: {
                right: "18rem",
                top: "4.5rem",
            },
            triggers: [{ element: $("menu.main li a") }],
            triggerMulti: true,
            disabled: true,
            content: [{ name: "re621", page: $updateTabForm }],
        });
    }

    /**
     * Processes the new tab form
     */
    private handleNewTabEvent() {
        let tabNameInput = $("#re621-addtab-name");
        let tabTitleInput = $("#re621-addtab-title");
        let tabHrefInput = $("#re621-addtab-link");

        let newTab = this.createTab({
            name: tabNameInput.val() + "",
            title: tabTitleInput.val() + "",
            href: tabHrefInput.val() + "",
            controls: true,
        }, true);

        this.updateModal.registerTrigger({ element: newTab.link });

        tabNameInput.val("");
        tabHrefInput.val("");
    }

    /**
     * Processes the tab update form
     */
    private handleUpdateEvent() {
        let tabName = $("#re621-updatetab-name").val() + "";
        let tabTitle = $("#re621-updatetab-title").val() + "";
        let tabHref = $("#re621-updatetab-link").val() + "";

        this.updateModal.getActiveTrigger()
            .attr("href", tabHref)
            .attr("title", tabTitle)
            .text(tabName);

        this.handleUpdate();

        this.updateModal.setHidden();
    }

    /**
     * Processes the tab deletion form
     */
    private handleDeleteEvent() {
        this.updateModal.getActiveTrigger().parent().remove();

        this.handleUpdate();

        this.updateModal.setHidden();
    }

    /**
     * Turns on editing mode on the header
     */
    private enableEditingMode() {
        let _self = this;
        this.$menu.attr("data-editing", "true");
        this.$menu.sortable("enable");
        this.updateModal.enable();

        // Fill in update tab data
        this.updateModal.getModal().on("modal:toggle", function (event, modal) {
            let $trigger = _self.updateModal.getActiveTrigger();
            $("#re621-updatetab-name").val($trigger.text());
            $("#re621-updatetab-link").val($trigger.attr("href"));
        });
    }

    /**
     * Turns off the header editing mode
     */
    private disableEditingMode() {
        this.$menu.attr("data-editing", "false");
        this.$menu.sortable("disable");

        this.updateModal.setHidden();
        this.updateModal.disable();
    }

    /**
     * Creates a new styled tab
     * @param config Tab configuration
     */
    public createTab(config: HeaderTab, triggerUpdate?: boolean) {
        if (config.name === undefined) config.name = "New Tab";
        if (config.href === undefined) config.href = "#";
        if (config.class === undefined) config.class = "";
        if (config.title === undefined) config.title = "";
        if (config.parent === undefined) config.parent = "menu.main";
        if (config.controls === undefined) config.controls = false;

        if (triggerUpdate === undefined) triggerUpdate = false;

        let $tab = $(`<li>`).appendTo($(config.parent));
        let $link = $(`<a href="` + config.href + `" title="` + config.title + `">` + config.name + "</a>").appendTo($tab);

        if (config.controls) { $tab.addClass("configurable"); }
        if (config.class) { $tab.addClass(config.class); }
        if (triggerUpdate) { this.handleUpdate(); }

        return { tab: $tab, link: $link };
    }

    /**
     * Iterates over the header menu and saves the data to cookies
     */
    private handleUpdate() {
        let tabs = $("menu.main").find("li > a");
        let tabData = [];
        tabs.each(function (index, element) {
            let $link = $(element);
            tabData.push({
                name: $link.text(),
                href: $link.attr("href")
            })
        });
        this.pushSettings("tabs", tabData);
    }

}

interface HeaderTab {
    /** Text inside the link */
    name?: string,
    /** Link address */
    href?: string,
    /** Hover text */
    title?: string,

    /** Extra class to append to the tab */
    class?: string,
    /** Element to append the tab to */
    parent?: string,
    /** Should the tab have controls in editing mode */
    controls?: boolean
}
