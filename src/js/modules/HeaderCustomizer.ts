import { Modal } from "../components/Modal";
import { RE6Module } from "../components/RE6Module";
import { User } from "../components/User";
import { Form } from "../utilities/Form";

declare var Cookies;

/**
 * HeaderCustomizer  
 * Add, remove, and re-arrange the tabs in the customizable navbar
 */
export class HeaderCustomizer extends RE6Module {

    private static instance: HeaderCustomizer = new HeaderCustomizer();

    private $menu: JQuery<HTMLElement>;

    private updateTabModal: Modal;
    private updateTabForm: Form;

    private addTabModal: Modal;
    private addTabForm: Form;

    private constructor() {
        super();

        let _self = this;
        this.$menu = $("menu.main");
        this.createDOM();

        // Configuration Form Listeners
        this.addTabForm.get().on("re-form:submit", function (event, data) {
            _self.addTab({
                name: data.get("name"),
                title: data.get("title"),
                href: data.get("href"),
            });
            _self.addTabForm.reset();
        });

        this.updateTabForm.get().on("re-form:submit", function (event, data) {
            _self.updateTab(
                _self.updateTabModal.getActiveTrigger().parent(),
                {
                    name: data.get("name"),
                    title: data.get("title"),
                    href: data.get("href"),
                }
            );
            _self.updateTabModal.setHidden();
        });

        this.updateTabForm.getInputList().get("delete").click(function (event) {
            event.preventDefault();
            _self.deleteTab(_self.updateTabModal.getActiveTrigger().parent())
            _self.updateTabModal.setHidden();
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
        this.$menu.empty();

        // Fetch stored data
        this.fetchSettings("tabs").forEach(function (value) {
            _self.createTabElement({
                name: value.name,
                href: value.href,
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

            update: function () { _self.saveNavbarSettings(); },
        });

        // === Tab Configuration Interface
        let addTabButton = this.createTabElement({
            name: `<i class="fas fa-tasks"></i>`,
            parent: "menu.extra",
            class: "float-left",
            controls: false,
        });

        this.addTabForm = new Form(
            {
                id: "header-addtab",
                parent: "re-modal-container",
            },
            [
                { id: "name", label: "Name", type: "input" },
                { id: "title", label: "Hover", type: "input" },
                { id: "href", label: "Link", type: "input" },
                { id: "submit", value: "Submit", type: "submit" },
                { id: "help-hr", type: "hr" },
                { id: "help-var", label: `Available variables:`, type: "div" },
                { id: "help-var-userid", label: "Unique ID", value: "%userid%", type: "copyinput" },
                { id: "help-var-username", label: "Username", value: "%username%", type: "copyinput" },
            ]
        );

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
            content: [{ name: "re621", page: this.addTabForm.get() }],
        });

        // Tab Update Interface
        this.updateTabForm = new Form(
            {
                id: "header-updatetab",
                parent: "re-modal-container",
            },
            [
                { id: "name", label: "Name", type: "input" },
                { id: "title", label: "Hover", type: "input" },
                { id: "href", label: "Link", type: "input" },
                { id: "delete", label: "delete", value: "Delete", type: "button" },
                { id: "submit", label: "update", value: "Update", type: "submit" },
            ]
        );

        this.updateTabModal = new Modal({
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
            content: [{ name: "re621", page: this.updateTabForm.get() }],
        });
    }

    /**
     * Turns on editing mode on the header
     */
    private enableEditingMode() {
        let _self = this;
        this.$menu.attr("data-editing", "true");
        this.$menu.sortable("enable");
        this.updateTabModal.enable();

        // Fill in update tab data
        this.updateTabModal.getModal().on("modal:toggle", function (event, modal) {
            let $tab = _self.updateTabModal.getActiveTrigger().parent();
            let $updateTabInputs = _self.updateTabForm.getInputList();

            $updateTabInputs.get("name").val($tab.attr("data-name"));
            $updateTabInputs.get("title").val($tab.attr("data-title"));
            $updateTabInputs.get("href").val($tab.attr("data-href"));
        });
    }

    /**
     * Turns off the header editing mode
     */
    private disableEditingMode() {
        this.$menu.attr("data-editing", "false");
        this.$menu.sortable("disable");

        this.updateTabModal.setHidden();
        this.updateTabModal.disable();
    }

    /**
     * Creates a new styled tab
     * @param config Tab configuration
     */
    public createTabElement(config: HeaderTab, triggerUpdate?: boolean) {
        config = this.parseHeaderTabConfig(config);
        if (triggerUpdate === undefined) triggerUpdate = false;

        let $tab = $(`<li>`)
            .attr("data-name", config.name)
            .attr("data-title", config.title)
            .attr("data-href", config.href)
            .appendTo($(config.parent));
        let $link = $("<a>")
            .html(this.processTabVariables(config.name))
            .attr("title", this.processTabVariables(config.title))
            .attr("href", this.processTabVariables(config.href))
            .appendTo($tab);

        if (config.controls) { $tab.addClass("configurable"); }
        if (config.class) { $tab.addClass(config.class); }
        if (triggerUpdate) { this.saveNavbarSettings(); }

        return { tab: $tab, link: $link };
    }

    /**
     * Parses the provided configuration file for missing values
     * @param config Configuration to process
     */
    private parseHeaderTabConfig(config: HeaderTab) {
        if (config.name === undefined) config.name = "New Tab";
        if (config.href === undefined) config.href = "#";
        if (config.title === undefined) config.title = "";

        if (config.class === undefined) config.class = "";
        if (config.parent === undefined) config.parent = "menu.main";
        if (config.controls === undefined) config.controls = true;

        return config;
    }

    /**
     * Creates a new tab based on specified configuration
     * @param config Configuration
     */
    private addTab(config: HeaderTab) {
        config = this.parseHeaderTabConfig(config);
        let newTab = this.createTabElement(config, true);
        this.updateTabModal.registerTrigger({ element: newTab.link });
    }

    /**
     * Update the specified tab with the corresponding configuration
     * @param $element Tab to update
     * @param config New configuration
     */
    private updateTab($element: JQuery<HTMLElement>, config: HeaderTab) {
        config = this.parseHeaderTabConfig(config);
        $element
            .attr("data-name", config.name)
            .attr("data-title", config.title)
            .attr("data-href", config.href);
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
    private deleteTab($element: JQuery<HTMLElement>) {
        $element.remove();
        this.saveNavbarSettings();
        this.updateTabModal.setHidden();
    }

    /**
     * Replaces the variables in the text with corresponding values
     * @param text Text to parse
     */
    private processTabVariables(text: string) {
        return text
            .replace(/%userid%/g, User.getUserID())
            .replace(/%username%/g, User.getUsername());
    }

    /**
     * Iterates over the header menu and saves the data to cookies
     */
    private saveNavbarSettings() {
        let tabData = [];
        this.$menu.find("li").each(function (i, element) {
            let $tab = $(element);
            tabData.push({
                name: $tab.attr("data-name"),
                title: $tab.attr("data-title"),
                href: $tab.attr("data-href"),
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
