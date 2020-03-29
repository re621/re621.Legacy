import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../../components/structure/Modal";
import { Tabbed, TabContent } from "../../components/structure/Tabbed";
import { RE6Module } from "../../components/RE6Module";
import { Miscellaneous } from "./Miscellaneous";
import { Form, FormElement } from "../../components/structure/Form";
import { TitleCustomizer } from "../post/TitleCustomizer";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { PostViewer } from "../post/PostViewer";
import { Hotkeys } from "../../components/data/Hotkeys";
import { PoolSettings, PoolSubscriptions } from "../subscriptions/PoolSubscriptions";

/**
 * SettingsController  
 * Interface for accessing and changing project settings
 */
export class SettingsController {

    private static instance: SettingsController;

    private modules: Map<string, RE6Module> = new Map();

    private constructor() { }

    public init() {

        // Create a button in the header
        let addSettingsButton = HeaderCustomizer.getInstance().createTabElement({
            name: `<i class="fas fa-wrench"></i>`,
            parent: "menu.extra",
            class: "float-right",
            controls: false,
        });

        // Establish the settings window contents
        let moduleStatusTab = this.createModuleStatus();
        let postsPageTab = this.createTabPostsPage();
        let blacklistSettingsTab = this.createTabBlacklist();
        let hotkeyTab = this.createTabHotkeys();
        let miscSettingsTab = this.createTabMiscellaneous();

        let $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Features", page: moduleStatusTab.get() },
                { name: "Posts", page: postsPageTab.get() },
                { name: "Blacklist", page: blacklistSettingsTab.get() },
                { name: "Hotkeys", page: hotkeyTab.get() },
                { name: "Misc", page: miscSettingsTab.get() },
            ]
        });

        // Create the modal
        new Modal({
            title: "Settings",
            triggers: [{ element: addSettingsButton.link }],
            escapable: false,
            fixed: true,
            reserveHeight: true,
            content: $settings.create(),
            position: { my: "center", at: "center" }
        });

        // Establish handlers
        this.handleModuleStatus(moduleStatusTab);
        this.handleTabPostsPage(postsPageTab);
        this.handleTabBlacklist(blacklistSettingsTab);
        this.handleTabHotkeys(hotkeyTab);
        this.handleTabMiscellaneous(miscSettingsTab);
    }

    /**
     * Returns a singleton instance of the SettingsController
     * @returns SettingsController instance
     */
    public static getInstance() {
        if (this.instance == undefined) { this.instance = new SettingsController(); }
        return this.instance;
    }

    /**
     * Registers the module so that its settings could be changed
     * @param module Module to register
     */
    public static registerModule(...moduleList: RE6Module[]) {
        for (const module of moduleList) {
            this.getInstance().modules.set(module.getPrefix(), module);
        }
    }

    /**
     * Registers a new settings page
     * @param page ModalContent with the page data
     */
    public static addPage(page: TabContent) {
        //this.getInstance().modal.addPage(page);
    }

    /** Create the DOM for the Title Customizer page */
    private createTabPostsPage() {
        let titleCustomizer = this.modules.get("TitleCustomizer");
        let downloadCustomizer = this.modules.get("DownloadCustomizer");
        let miscellaneous = this.modules.get("Miscellaneous");
        let postViewer = this.modules.get("PostViewer");
        let formattingManager = this.modules.get("FormattingManager");

        let template_icons = new Form(
            { id: "title-template-icons", columns: 2, },
            [
                { id: "explain", type: "div", stretch: "mid", value: `<div class="notice unmargin">The following variables can be used:</div>` },
                { id: "postnum", type: "copy", label: "Post ID", value: "%postid%", },
                { id: "author", type: "copy", label: "Artist", value: "%artist%", },
                { id: "copyright", type: "copy", label: "Copyright", value: "%copyright%", },
                { id: "characters", type: "copy", label: "Characters", value: "%character%", },
            ]
        );

        let form = new Form(
            {
                id: "title-customizer-misc",
                columns: 3,
                parent: "re-modal-container",
            },
            [
                // General
                {
                    id: "general-header",
                    type: "div",
                    value: "<h3>General</h3>",
                    stretch: "column",
                },
                {
                    id: "general-help",
                    type: "div",
                    value: `<div class="notice text-right">Settings are saved and applied automatically.</div>`,
                    stretch: "mid"
                },
                {
                    id: "general-title-template",
                    type: "input",
                    value: titleCustomizer.fetchSettings("template"),
                    label: "Page Title",
                    stretch: "full",
                },
                {
                    id: "general-title-template-variables",
                    type: "div",
                    label: " ",
                    value: template_icons.get(),
                    stretch: "full",
                },
                {
                    id: "general-title-symbol-enabled",
                    type: "checkbox",
                    value: titleCustomizer.fetchSettings("symbolsEnabled"),
                    label: "Vote / Favorite Icons",
                },
                {
                    id: "general-title-spacer-1",
                    type: "div",
                    value: "",
                    stretch: "mid"
                },
                {
                    id: "general-title-symbol-fav",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol_fav"),
                    label: "Favorite",
                },
                {
                    id: "general-title-symbol-voteup",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol_voteup"),
                    label: "Upvote",
                },
                {
                    id: "general-title-symbol-votedown",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol_votedown"),
                    label: "Downvote",
                },
                {
                    id: "general-improved-tagcount",
                    type: "checkbox",
                    value: miscellaneous.fetchSettings("improveTagCount"),
                    label: "Expanded Tag Count",
                },
                {
                    id: "inter-spacer-1",
                    type: "div",
                    value: " ",
                    stretch: "full",
                },

                // Actions
                {
                    id: "action-header",
                    type: "div",
                    value: "<h3>Actions</h3>",
                    stretch: "full",
                },
                {
                    id: "action-download-template",
                    type: "input",
                    value: downloadCustomizer.fetchSettings("template"),
                    label: "Download File Name",
                    stretch: "full",
                },
                {
                    id: "action-download-explain",
                    type: "div",
                    stretch: "full",
                    label: " ",
                    value: `<div class="notice unmargin">Same variables as above can be used. A file extension is appended automatically.</div>`
                },
                {
                    id: "actions-votefavorite",
                    type: "checkbox",
                    value: postViewer.fetchSettings("upvote_on_favorite"),
                    label: "Upvote Favorites",
                },
                {
                    id: "inter-spacer-2",
                    type: "div",
                    value: " ",
                    stretch: "mid",
                },
                {
                    id: "actions-submit-hotkey",
                    type: "checkbox",
                    value: formattingManager.fetchSettings("hotkey_submit_active"),
                    label: "Submit Comments with Alt+Enter",
                },
                {
                    id: "inter-spacer-4",
                    type: "div",
                    value: " ",
                    stretch: "mid",
                },
            ]
        );

        return form;
    }

    /**
     * Event handlers for the title customizer settings page
     * @param form Miscellaneous settings form
     */
    private handleTabPostsPage(form: Form) {
        let titleCustomizer = <TitleCustomizer>this.modules.get("TitleCustomizer");
        let downloadCustomizer = <DownloadCustomizer>this.modules.get("DownloadCustomizer");
        let miscellaneous = <Miscellaneous>this.modules.get("Miscellaneous");
        let postViewer = <PostViewer>this.modules.get("PostViewer");
        let formattingManager = this.modules.get("FormattingManager");
        let postsPageInput = form.getInputList();

        // General
        postsPageInput.get("general-title-template").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("template", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-enabled").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbolsEnabled", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-fav").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbol-fav", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-voteup").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbol-voteup", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-votedown").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbol-votedown", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-improved-tagcount").on("re621:form:input", (event, data) => {
            miscellaneous.pushSettings("improveTagCount", data);
        });

        // Actions
        postsPageInput.get("action-download-template").on("re621:form:input", (event, data) => {
            downloadCustomizer.pushSettings("template", data);
            if (downloadCustomizer.isInitialized())
                downloadCustomizer.refreshDownloadLink();
        });

        postsPageInput.get("actions-votefavorite").on("re621:form:input", (event, data) => {
            postViewer.pushSettings("upvote_on_favorite", data);
        });

        postsPageInput.get("actions-submit-hotkey").on("re621:form:input", (event, data) => {
            formattingManager.pushSettings("hotkey_submit_active", data);
        });
    }

    /** Creates the DOM for the hotkey settings page */
    private createTabHotkeys() {
        let postViewer = this.modules.get("PostViewer");
        let poolNavigator = this.modules.get("PoolNavigator");
        let imageScaler = this.modules.get("ImageScaler");
        let miscellaneous = this.modules.get("Miscellaneous");
        let headerCustomizer = this.modules.get("HeaderCustomizer");

        let form = new Form(
            {
                "id": "settings-hotkeys",
                columns: 3,
                parent: "re-modal-container"
            },
            [
                // Listing
                {
                    id: "hotkey-listing-title",
                    type: "div",
                    value: "<h3>Listing</h3>",
                    stretch: "full",
                },

                createLabel("hotkey_focussearch", "Search"),
                createInput(miscellaneous, "hotkey_focussearch", "", 0),
                createInput(miscellaneous, "hotkey_focussearch", "", 1),

                createLabel("hotkey_randompost", "Random Post"),
                createInput(miscellaneous, "hotkey_randompost", "", 0),
                createInput(miscellaneous, "hotkey_randompost", "", 1),

                // Posts
                {
                    id: "hotkey-posts-title",
                    type: "div",
                    value: "<h3>Posts</h3>",
                    stretch: "full",
                },

                // - Voting
                createLabel("hotkey_upvote", "Upvote"),
                createInput(postViewer, "hotkey_upvote", "", 0),
                createInput(postViewer, "hotkey_upvote", "", 1),

                createLabel("hotkey_downvote", "Downvote"),
                createInput(postViewer, "hotkey_downvote", "", 0),
                createInput(postViewer, "hotkey_downvote", "", 1),

                createLabel("hotkey_favorite", "Favorite"),
                createInput(postViewer, "hotkey_favorite", "", 0),
                createInput(postViewer, "hotkey_favorite", "", 1),

                // - Navigation
                createLabel("hotkey_prev", "Previous Post"),
                createInput(poolNavigator, "hotkey_prev", "", 0),
                createInput(poolNavigator, "hotkey_prev", "", 1),


                createLabel("hotkey_next", "Next Post"),
                createInput(poolNavigator, "hotkey_next", "", 0),
                createInput(poolNavigator, "hotkey_next", "", 1),


                createLabel("hotkey_cycle", "Cycle Navigation"),
                createInput(poolNavigator, "hotkey_cycle", "", 0),
                createInput(poolNavigator, "hotkey_cycle", "", 1),

                // - Scaling
                createLabel("hotkey_scale", "Change Scale"),
                createInput(imageScaler, "hotkey_scale", "", 0),
                createInput(imageScaler, "hotkey_scale", "", 1),

                // Comments
                {
                    id: "hotkey-comments-title",
                    type: "div",
                    value: "<h3>Comments</h3>",
                    stretch: "full"
                },

                createLabel("hotkey_newcomment", "New Comment"),
                createInput(miscellaneous, "hotkey_newcomment", "", 0),
                createInput(miscellaneous, "hotkey_newcomment", "", 1),

                createLabel("hotkey_editpost", "Edit Post"),
                createInput(miscellaneous, "hotkey_editpost", "", 0),
                createInput(miscellaneous, "hotkey_editpost", "", 1),

                // Tabs
                {
                    id: "hotkey-tabs-title",
                    type: "div",
                    value: "<h3>Header Tabs</h3>",
                    stretch: "full",
                },

                createLabel("hotkey_tab_1", "Tab #1"),
                createInput(headerCustomizer, "hotkey_tab_1", "", 0),
                createInput(headerCustomizer, "hotkey_tab_1", "", 1),

                createLabel("hotkey_tab_2", "Tab #2"),
                createInput(headerCustomizer, "hotkey_tab_2", "", 0),
                createInput(headerCustomizer, "hotkey_tab_2", "", 1),

                createLabel("hotkey_tab_3", "Tab #3"),
                createInput(headerCustomizer, "hotkey_tab_3", "", 0),
                createInput(headerCustomizer, "hotkey_tab_3", "", 1),

                createLabel("hotkey_tab_4", "Tab #4"),
                createInput(headerCustomizer, "hotkey_tab_4", "", 0),
                createInput(headerCustomizer, "hotkey_tab_4", "", 1),

                createLabel("hotkey_tab_5", "Tab #5"),
                createInput(headerCustomizer, "hotkey_tab_5", "", 0),
                createInput(headerCustomizer, "hotkey_tab_5", "", 1),

                createLabel("hotkey_tab_6", "Tab #6"),
                createInput(headerCustomizer, "hotkey_tab_6", "", 0),
                createInput(headerCustomizer, "hotkey_tab_6", "", 1),

                createLabel("hotkey_tab_7", "Tab #7"),
                createInput(headerCustomizer, "hotkey_tab_7", "", 0),
                createInput(headerCustomizer, "hotkey_tab_7", "", 1),

                createLabel("hotkey_tab_8", "Tab #8"),
                createInput(headerCustomizer, "hotkey_tab_8", "", 0),
                createInput(headerCustomizer, "hotkey_tab_8", "", 1),

                createLabel("hotkey_tab_9", "Tab #9"),
                createInput(headerCustomizer, "hotkey_tab_9", "", 0),
                createInput(headerCustomizer, "hotkey_tab_9", "", 1),
            ]
        );

        function createLabel(settingsKey: string, label: string): FormElement {
            return {
                id: settingsKey + "-label",
                type: "div",
                value: label,
                stretch: "column"
            };
        }

        function createInput(module: RE6Module, settingsKey: string, label: string, suffix: number = 0): FormElement {
            let values = module.fetchSettings(settingsKey).split("|"),
                binding = "";
            if (values[suffix] !== undefined) binding = values[suffix];

            return {
                id: settingsKey + "-input-" + suffix,
                type: "key",
                label: label,
                value: binding
            };
        }

        return form;
    }

    /**
     * Event handlers for the hotkey settings page
     * @param form Miscellaneous settings form
     */
    private handleTabHotkeys(form: Form) {
        let hotkeyFormInput = form.getInputList();
        let postViewer = this.modules.get("PostViewer");
        let poolNavigator = this.modules.get("PoolNavigator");
        let imageScaler = this.modules.get("ImageScaler");
        let miscellaneous = this.modules.get("Miscellaneous");
        let headerCustomizer = this.modules.get("HeaderCustomizer");

        // Listing
        createListener(miscellaneous, "hotkey_focussearch", 2);

        // Posts
        // - Voting
        createListener(postViewer, "hotkey_upvote", 2);

        createListener(postViewer, "hotkey_downvote", 2);
        createListener(postViewer, "hotkey_favorite", 2);

        // - Navigation
        createListener(poolNavigator, "hotkey_prev", 2);
        createListener(poolNavigator, "hotkey_next", 2);
        createListener(poolNavigator, "hotkey_cycle", 2);

        // - Scaling
        createListener(imageScaler, "hotkey_scale", 2);

        // Comments
        createListener(miscellaneous, "hotkey_newcomment", 2);
        createListener(miscellaneous, "hotkey_editpost", 2);

        // Tabs
        createListener(headerCustomizer, "hotkey_tab_1", 2);
        createListener(headerCustomizer, "hotkey_tab_2", 2);
        createListener(headerCustomizer, "hotkey_tab_3", 2);
        createListener(headerCustomizer, "hotkey_tab_4", 2);
        createListener(headerCustomizer, "hotkey_tab_5", 2);
        createListener(headerCustomizer, "hotkey_tab_6", 2);
        createListener(headerCustomizer, "hotkey_tab_7", 2);
        createListener(headerCustomizer, "hotkey_tab_8", 2);
        createListener(headerCustomizer, "hotkey_tab_9", 2);

        /** Creates a listener for the hotkey input */
        function createListener(module: RE6Module, settingsKey: string, bindings: number = 1) {
            for (let i = 0; i < bindings; i++) {
                hotkeyFormInput.get(settingsKey + "-input-" + i).on("re621:form:input", (event, newKey, oldKey) => {
                    if (i === 0) {
                        let bindingData = [];
                        for (let j = 0; j < bindings; j++) {
                            bindingData.push(hotkeyFormInput.get(settingsKey + "-input-" + j).val());
                        }
                        module.pushSettings(settingsKey, bindingData.filter(n => n).join("|"));

                        Hotkeys.unregister(oldKey);
                        module.resetHotkeys();
                    } else {
                        Hotkeys.unregister(oldKey);
                        hotkeyFormInput.get(settingsKey + "-input-0").trigger("re621:form:input");
                    }
                });
            }
        }
    }

    /** Creates the DOM for the miscellaneous settings page */
    private createTabMiscellaneous() {
        let module = <Miscellaneous>this.modules.get("Miscellaneous");

        // Create the settings form
        let form = new Form(
            {
                id: "settings-misc",
                columns: 3,
                parent: "re-modal-container",
            },
            [
                {
                    id: "misc-title",
                    type: "div",
                    value: "<h3>Miscellaneous</h3>",
                    stretch: "full",
                },
                {
                    id: "misc-redesign-fixes",
                    type: "checkbox",
                    value: module.fetchSettings("loadRedesignFixes"),
                    label: "Load Redesign Fixes",
                },
                {
                    id: "misc-spacer-1",
                    type: "div",
                    value: "<br />",
                    stretch: "mid",
                },

                {
                    id: "misc-import",
                    type: "div",
                    value: "<h3>Import from File</h3>",
                    stretch: "full",
                },
                {
                    id: "misc-import-info",
                    type: "div",
                    value: `<div class="notice unmargin">Import the settings from eSix Extended (Legacy)</div>`,
                    stretch: "full",
                },
                {
                    id: "misc-import-button",
                    type: "file",
                    label: "Select file",
                    value: "json",
                    stretch: "full",
                },
                {
                    id: "misc-import-status",
                    type: "div",
                    label: " ",
                    value: `<div id="file-import-status"></div>`,
                    stretch: "full",
                },
            ]
        );

        return form;
    }

    /**
     * Event handlers for the miscellaneous settings page
     * @param form Miscellaneous settings form
     */
    private handleTabMiscellaneous(form: Form) {
        let miscModule = <Miscellaneous>this.modules.get("Miscellaneous");
        let miscFormInput = form.getInputList();

        miscFormInput.get("misc-redesign-fixes").on("re621:form:input", (event, data) => {
            miscModule.pushSettings("loadRedesignFixes", data);
            if (data) { miscModule.enableRedesignFixes(); }
            else { miscModule.disableRedesignFixes(); }
        });

        miscFormInput.get("misc-import-button").on("re621:form:input", (e, data) => {
            if (!data) return;
            let $info = $("div#file-import-status")
                .html("Loading . . .");

            var reader = new FileReader();
            reader.readAsText(data, "UTF-8");
            reader.onload = function (event) {
                let parsedData = event.target.result.toString().split("\n");
                if (parsedData[0] !== "eSixExtend User Prefs") { $info.html("Invalid file format"); return; }

                parsedData.forEach((value, index) => {
                    if (index !== 0) parsedData[index] = JSON.parse(atob(value).replace(/^\d+\|/, ""));
                });

                // parsedData[2] : pools
                $info.html("Processing pools . . .");
                let poolSubs = PoolSubscriptions.getInstance(),
                    poolData: PoolSettings = poolSubs.fetchSettings("pools", true);
                for (let entry of parsedData[2]) {
                    let thumb = entry["thumb"]["url"].substr(6, 32);
                    poolData[entry["id"]] = { thumbnailMd5: thumb };
                }
                poolSubs.pushSettings("pools", poolData);

                // parsedData[3] : forums
                $info.html("Processing forums . . .");

                // parsedData[3] : tags (???)
                $info.html("Processing tags . . .");

                //console.log(parsedData);
                $info.html("Settings imported!");
            };
            reader.onerror = function (evt) { $info.html("Error loading file"); };

        });
    }

    private createTabBlacklist() {
        let module = this.modules.get("BlacklistEnhancer");

        // Create the settings form
        let form = new Form(
            {
                id: "settings-blacklist",
                columns: 3,
                parent: "re-modal-container",
            },
            [
                {
                    id: "blacklist-title",
                    type: "div",
                    value: "<h3>Blacklist</h3>",
                    stretch: "full"
                },
                {
                    id: "blacklist-quickadd",
                    type: "checkbox",
                    value: module.fetchSettings("quickaddTags"),
                    label: "Click x before tag to toggle",
                },
            ]
        );

        return form;
    }

    private handleTabBlacklist(form: Form) {
        let module = this.modules.get("BlacklistEnhancer");
        let inputs = form.getInputList();
        inputs.get("blacklist-quickadd").on("re621:form:input", (event, data) => {
            module.pushSettings("quickaddTags", data);
        });
    }

    private createModuleStatus() {
        let modules = this.modules;

        let form = new Form(
            {
                id: "settings-module-status",
                columns: 3,
                parent: "re-modal-container",
            },
            [
                {
                    id: "features-title",
                    type: "div",
                    value: "<h3>Features</h3>",
                    stretch: "full"
                },

                createInput("HeaderCustomizer", "Header Customizer"),
                createLabel("HeaderCustomizer", "Add, delete, and customize header links to your heart's content"),

                createInput("InfiniteScroll", "Infinite Scroll"),
                createLabel("InfiniteScroll", "New posts are automatically loaded. No need to turn pages"),

                createInput("InstantSearch", "Instant Filters"),
                createLabel("InstantSearch", "Quickly add filters to your current search, with no need for a page reload"),

                createInput("FormattingManager", "Formatting Helper"),
                createLabel("FormattingManager", "Fully customizable toolbar for easy DText formatting and post templates"),

                createInput("TinyAlias", "Tiny Alias"),
                createLabel("TinyAlias", "A more intelligent way to quickly fill out post tags"),
            ]
        );

        function createInput(moduleName: string, label: string): FormElement {
            const module = modules.get(moduleName);
            return {
                id: moduleName + "-enabled",
                type: "checkbox",
                value: module.fetchSettings("enabled"),
                label: label,
            };
        }

        function createLabel(moduleName: string, label: string): FormElement {
            return {
                id: moduleName + "-label",
                type: "div",
                value: label,
                stretch: "mid",
            };
        }

        return form;
    }

    private handleModuleStatus(form: Form) {
        let inputs = form.getInputList("checkbox");

        for (const formName of inputs.keys()) {
            const module = this.modules.get(formName.split("-")[0]);

            inputs.get(formName).on("re621:form:input", (event, data) => {
                module.pushSettings("enabled", data);
                module.setEnabled(data);
                if (data === true) {
                    if (module.canInitialize()) module.create();
                } else module.destroy();
            });
        }
    }
}
