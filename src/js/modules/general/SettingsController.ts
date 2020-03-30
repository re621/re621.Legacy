import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../../components/structure/Modal";
import { Tabbed } from "../../components/structure/Tabbed";
import { RE6Module } from "../../components/RE6Module";
import { Miscellaneous } from "./Miscellaneous";
import { Form, FormElement } from "../../components/structure/Form";
import { Hotkeys } from "../../components/data/Hotkeys";
import { PoolInfo, PoolSubscriptions } from "../subscriptions/PoolSubscriptions";
import { Util } from "../../components/structure/Util";
import { User } from "../../components/data/User";
import { ForumSubscriptions, ForumInfo } from "../subscriptions/ForumSubscriptions";
import { TagSubscriptions, TagInfo } from "../subscriptions/TagSubscriptions";
import { TitleCustomizer } from "../post/TitleCustomizer";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { PostViewer } from "../post/PostViewer";
import { FormattingManager } from "./FormattingHelper";
import { BlacklistEnhancer } from "../search/BlacklistEnhancer";
import { PoolNavigator } from "../post/PoolNavigator";
import { ImageScaler } from "../post/ImageScaler";

/**
 * SettingsController  
 * Interface for accessing and changing project settings
 */
export class SettingsController {

    private static instance: SettingsController;

    private modules: Map<string, RE6Module> = new Map();

    public constructor() { return; }

    public init(): void {

        // Create a button in the header
        const addSettingsButton = this.getModuleWithType<HeaderCustomizer>(HeaderCustomizer).createTabElement({
            name: `<i class="fas fa-wrench"></i>`,
            parent: "menu.extra",
            class: "float-right",
            controls: false,
        });

        // Establish the settings window contents
        const moduleStatusTab = this.createModuleStatus();
        const postsPageTab = this.createTabPostsPage();
        const hotkeyTab = this.createTabHotkeys();
        const miscSettingsTab = this.createTabMiscellaneous();

        const $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Features", page: moduleStatusTab.get() },
                { name: "General", page: postsPageTab.get() },
                { name: "Hotkeys", page: hotkeyTab.get() },
                { name: "Other", page: miscSettingsTab.get() },
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
        this.handleTabHotkeys(hotkeyTab);
        this.handleTabMiscellaneous(miscSettingsTab);
    }

    /**
     * Returns a singleton instance of the SettingsController
     * @returns SettingsController instance
     */
    public static getInstance(): SettingsController {
        if (this.instance == undefined) { this.instance = new SettingsController(); }
        return this.instance;
    }

    /**
     * Registers the module so that its settings could be changed
     * @param module Module to register
     * @todo any parameter is not correct here but I couldn't figure the right types out
     *  { new(): RE6Module } works to access constructor name but not static methods
     */
    public static registerModule<T>(moduleClass: any): void {
        const moduleInstance = moduleClass.getInstance();
        moduleInstance.create();
        this.getInstance().modules.set(moduleClass.prototype.constructor.name, moduleInstance);
    }

    /**
     * Returns a previously registered module with the specified class
     * This simply calls the non static variant, making the use in this class a bit more convinien
     * @param moduleClass Module class
     * @returns the module interpreted as T (which must extend the RE6Module class)
     */
    public static getModuleWithType<T extends RE6Module>(moduleClass: { new(): T }): T {
        return this.getInstance().getModuleWithType(moduleClass) as T;
    }

    /**
     * Same as getModuleWithType except that it returns it as a RE6Module
     * This simply calls the non static variant, making the use in this class a bit more convinien
     * @param moduleClass 
     * @returns RE6Module instance
     */
    public static getModuleNoType(moduleClass: { new(): RE6Module }): RE6Module {
        return this.getInstance().getModuleNoType(moduleClass);
    }

    /**
     * Gets a module without a specific tpye from the passed class name
     */
    private getModuleByName(name: string): RE6Module {
        return this.modules.get(name);
    }

    /**
     * Returns a previously registered module with the specified class
     * @param moduleClass Module class
     * @returns the module interpreted as T (which must extend the RE6Module class)
     */
    public getModuleWithType<T extends RE6Module>(moduleClass: { new(): T }): T {
        return this.modules.get(moduleClass.prototype.constructor.name) as T;
    }

    /**
     * Same as getModuleWithType except that it returns it as a RE6Module
     * @param moduleClass 
     * @returns RE6Module instance
     */
    public getModuleNoType(moduleClass: { new(): RE6Module }): RE6Module {
        return this.modules.get(moduleClass.prototype.constructor.name);
    }

    /** Create the DOM for the Title Customizer page */
    private createTabPostsPage(): Form {
        const titleCustomizer = this.getModuleNoType(TitleCustomizer);
        const downloadCustomizer = this.getModuleNoType(DownloadCustomizer);
        const miscellaneous = this.getModuleNoType(Miscellaneous);
        const postViewer = this.getModuleNoType(PostViewer);
        const formattingManager = this.getModuleNoType(FormattingManager);
        const blacklistEnhancer = this.getModuleNoType(BlacklistEnhancer);

        const templateIcons = new Form(
            { id: "title-template-icons", columns: 2, },
            [
                { id: "explain", type: "div", stretch: "mid", value: `<div class="notice unmargin">The following variables can be used:</div>` },
                { id: "postnum", type: "copy", label: "Post ID", value: "%postid%", },
                { id: "author", type: "copy", label: "Artist", value: "%artist%", },
                { id: "copyright", type: "copy", label: "Copyright", value: "%copyright%", },
                { id: "characters", type: "copy", label: "Characters", value: "%character%", },
            ]
        );

        const form = new Form(
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
                    value: templateIcons.get(),
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
                    value: titleCustomizer.fetchSettings("symbolFav"),
                    label: "Favorite",
                },
                {
                    id: "general-title-symbol-voteup",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbolVoteUp"),
                    label: "Upvote",
                },
                {
                    id: "general-title-symbol-votedown",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbolVoteDown"),
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
                    value: postViewer.fetchSettings("upvoteOnFavorite"),
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
                    value: formattingManager.fetchSettings("hotkeySubmitActive"),
                    label: "Submit Comments with Alt+Enter",
                },
                {
                    id: "inter-spacer-4",
                    type: "div",
                    value: " ",
                    stretch: "mid",
                },
                {
                    id: "inter-spacer-1",
                    type: "div",
                    value: " ",
                    stretch: "full",
                },

                // Blacklist
                {
                    id: "blacklist-title",
                    type: "div",
                    value: "<h3>Blacklist</h3>",
                    stretch: "full"
                },
                {
                    id: "blacklist-quickadd",
                    type: "checkbox",
                    value: blacklistEnhancer.fetchSettings("quickaddTags"),
                    label: "Click X to add tag to blacklist",
                },
            ]
        );

        return form;
    }

    /**
     * Event handlers for the title customizer settings page
     * @param form Miscellaneous settings form
     */
    private handleTabPostsPage(form: Form): void {
        const titleCustomizer = this.getModuleWithType<TitleCustomizer>(TitleCustomizer);
        const downloadCustomizer = this.getModuleWithType<DownloadCustomizer>(DownloadCustomizer);
        const miscellaneous = this.getModuleNoType(Miscellaneous);
        const postViewer = this.getModuleNoType(PostViewer);
        const formattingManager = this.getModuleNoType(FormattingManager);
        const blacklistEnhancer = this.getModuleNoType(BlacklistEnhancer);
        const postsPageInput = form.getInputList();

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
            postViewer.pushSettings("upvoteOnFavorite", data);
        });

        postsPageInput.get("actions-submit-hotkey").on("re621:form:input", (event, data) => {
            formattingManager.pushSettings("hotkeySubmitActive", data);
        });

        // Blacklist
        postsPageInput.get("blacklist-quickadd").on("re621:form:input", (event, data) => {
            blacklistEnhancer.pushSettings("quickaddTags", data);
        });
    }

    /** Creates the DOM for the hotkey settings page */
    private createTabHotkeys(): Form {
        const postViewer = this.getModuleNoType(PostViewer);
        const poolNavigator = this.getModuleNoType(PoolNavigator);
        const imageScaler = this.getModuleNoType(ImageScaler);
        const miscellaneous = this.getModuleNoType(Miscellaneous);
        const headerCustomizer = this.getModuleNoType(HeaderCustomizer);

        function createLabel(settingsKey: string, label: string): FormElement {
            return {
                id: settingsKey + "-label",
                type: "div",
                value: label,
                stretch: "column"
            };
        }

        function createInput(module: RE6Module, settingsKey: string, label: string, suffix = 0): FormElement {
            const values = module.fetchSettings(settingsKey).split("|");
            let binding = "";
            if (values[suffix] !== undefined) binding = values[suffix];

            return {
                id: settingsKey + "-input-" + suffix,
                type: "key",
                label: label,
                value: binding
            };
        }

        const form = new Form(
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

                createLabel("hotkeyFocusSearch", "Search"),
                createInput(miscellaneous, "hotkeyFocusSearch", "", 0),
                createInput(miscellaneous, "hotkeyFocusSearch", "", 1),

                createLabel("hotkeyRandomPost", "Random Post"),
                createInput(miscellaneous, "hotkeyRandomPost", "", 0),
                createInput(miscellaneous, "hotkeyRandomPost", "", 1),

                // Posts
                {
                    id: "hotkey-posts-title",
                    type: "div",
                    value: "<h3>Posts</h3>",
                    stretch: "full",
                },

                // - Voting
                createLabel("hotkeyUpvote", "Upvote"),
                createInput(postViewer, "hotkeyUpvote", "", 0),
                createInput(postViewer, "hotkeyUpvote", "", 1),

                createLabel("hotkeyDownvote", "Downvote"),
                createInput(postViewer, "hotkeyDownvote", "", 0),
                createInput(postViewer, "hotkeyDownvote", "", 1),

                createLabel("hotkeyFavorite", "Favorite"),
                createInput(postViewer, "hotkeyFavorite", "", 0),
                createInput(postViewer, "hotkeyFavorite", "", 1),

                // - Navigation
                createLabel("hotkeyPrev", "Previous Post"),
                createInput(poolNavigator, "hotkeyPrev", "", 0),
                createInput(poolNavigator, "hotkeyPrev", "", 1),


                createLabel("hotkeyNext", "Next Post"),
                createInput(poolNavigator, "hotkeyNext", "", 0),
                createInput(poolNavigator, "hotkeyNext", "", 1),


                createLabel("hotkeyCycle", "Cycle Navigation"),
                createInput(poolNavigator, "hotkeyCycle", "", 0),
                createInput(poolNavigator, "hotkeyCycle", "", 1),

                // - Scaling
                createLabel("hotkeyScale", "Change Scale"),
                createInput(imageScaler, "hotkeyScale", "", 0),
                createInput(imageScaler, "hotkeyScale", "", 1),

                // Comments
                {
                    id: "hotkey-comments-title",
                    type: "div",
                    value: "<h3>Comments</h3>",
                    stretch: "full"
                },

                createLabel("hotkeyNewComment", "New Comment"),
                createInput(miscellaneous, "hotkeyNewComment", "", 0),
                createInput(miscellaneous, "hotkeyNewComment", "", 1),

                createLabel("hotkeyEditPost", "Edit Post"),
                createInput(miscellaneous, "hotkeyEditPost", "", 0),
                createInput(miscellaneous, "hotkeyEditPost", "", 1),

                // Tabs
                {
                    id: "hotkey-tabs-title",
                    type: "div",
                    value: "<h3>Header Tabs</h3>",
                    stretch: "full",
                },

                createLabel("hotkeyTab1", "Tab #1"),
                createInput(headerCustomizer, "hotkeyTab1", "", 0),
                createInput(headerCustomizer, "hotkeyTab1", "", 1),

                createLabel("hotkeyTab2", "Tab #2"),
                createInput(headerCustomizer, "hotkeyTab2", "", 0),
                createInput(headerCustomizer, "hotkeyTab2", "", 1),

                createLabel("hotkeyTab3", "Tab #3"),
                createInput(headerCustomizer, "hotkeyTab3", "", 0),
                createInput(headerCustomizer, "hotkeyTab3", "", 1),

                createLabel("hotkeyTab4", "Tab #4"),
                createInput(headerCustomizer, "hotkeyTab4", "", 0),
                createInput(headerCustomizer, "hotkeyTab4", "", 1),

                createLabel("hotkeyTab5", "Tab #5"),
                createInput(headerCustomizer, "hotkeyTab5", "", 0),
                createInput(headerCustomizer, "hotkeyTab5", "", 1),

                createLabel("hotkeyTab6", "Tab #6"),
                createInput(headerCustomizer, "hotkeyTab6", "", 0),
                createInput(headerCustomizer, "hotkeyTab6", "", 1),

                createLabel("hotkeyTab7", "Tab #7"),
                createInput(headerCustomizer, "hotkeyTab7", "", 0),
                createInput(headerCustomizer, "hotkeyTab7", "", 1),

                createLabel("hotkeyTab8", "Tab #8"),
                createInput(headerCustomizer, "hotkeyTab8", "", 0),
                createInput(headerCustomizer, "hotkeyTab8", "", 1),

                createLabel("hotkeyTab9", "Tab #9"),
                createInput(headerCustomizer, "hotkeyTab9", "", 0),
                createInput(headerCustomizer, "hotkeyTab9", "", 1),
            ]
        );

        return form;
    }

    /**
     * Event handlers for the hotkey settings page
     * @param form Miscellaneous settings form
     */
    private handleTabHotkeys(form: Form): void {
        const hotkeyFormInput = form.getInputList();
        const postViewer = this.getModuleNoType(PostViewer);
        const poolNavigator = this.getModuleNoType(PoolNavigator);
        const imageScaler = this.getModuleNoType(ImageScaler);
        const miscellaneous = this.getModuleNoType(Miscellaneous);
        const headerCustomizer = this.getModuleNoType(HeaderCustomizer);

        /** Creates a listener for the hotkey input */
        function createListener(module: RE6Module, settingsKey: string, bindings = 1): void {
            for (let i = 0; i < bindings; i++) {
                hotkeyFormInput.get(settingsKey + "-input-" + i).on("re621:form:input", (event, newKey, oldKey) => {
                    if (i === 0) {
                        const bindingData = [];
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

        // Listing
        createListener(miscellaneous, "hotkeyFocusSearch", 2);

        // Posts
        // - Voting
        createListener(postViewer, "hotkeyUpvote", 2);

        createListener(postViewer, "hotkeyDownvote", 2);
        createListener(postViewer, "hotkeyFavorite", 2);

        // - Navigation
        createListener(poolNavigator, "hotkeyPrev", 2);
        createListener(poolNavigator, "hotkeyNext", 2);
        createListener(poolNavigator, "hotkeyCycle", 2);

        // - Scaling
        createListener(imageScaler, "hotkeyScale", 2);

        // Comments
        createListener(miscellaneous, "hotkeyNewComment", 2);
        createListener(miscellaneous, "hotkeyEditPost", 2);

        // Tabs
        createListener(headerCustomizer, "hotkeyTab1", 2);
        createListener(headerCustomizer, "hotkeyTab2", 2);
        createListener(headerCustomizer, "hotkeyTab3", 2);
        createListener(headerCustomizer, "hotkeyTab4", 2);
        createListener(headerCustomizer, "hotkeyTab5", 2);
        createListener(headerCustomizer, "hotkeyTab6", 2);
        createListener(headerCustomizer, "hotkeyTab7", 2);
        createListener(headerCustomizer, "hotkeyTab8", 2);
        createListener(headerCustomizer, "hotkeyTab9", 2);
    }

    /** Creates the DOM for the miscellaneous settings page */
    private createTabMiscellaneous(): Form {
        const module = this.getModuleWithType<Miscellaneous>(Miscellaneous);

        // Create the settings form
        const form = new Form(
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

                // Import from File
                {
                    id: "misc-import-title",
                    type: "div",
                    value: "<h3>Import / Export from file</h3>",
                    stretch: "full",
                },
                {
                    id: "misc-import-info",
                    type: "div",
                    value: `<div class="notice unmargin">Import subscription data from file</div>`,
                    stretch: "full",
                },
                {
                    id: "misc-export-button",
                    type: "button",
                    label: "Export to file",
                    value: "Export",
                    stretch: "mid",
                },
                {
                    id: "misc-export-spacer-1",
                    type: "div",
                    value: "",
                    stretch: "column",
                },
                {
                    id: "misc-import-button",
                    type: "file",
                    label: "Import from file",
                    value: "json",
                    stretch: "mid",
                },
                {
                    id: "misc-export-spacer-2",
                    type: "div",
                    value: "",
                    stretch: "column",
                },
                {
                    id: "misc-import-status",
                    type: "div",
                    label: " ",
                    value: `<div id="file-import-status" class="unmargin"></div>`,
                    stretch: "mid",
                },
                {
                    id: "misc-export-spacer-3",
                    type: "div",
                    value: "",
                    stretch: "column",
                },

                // eSix Extended
                {
                    id: "misc-esix-title",
                    type: "div",
                    value: "<h3>eSix Extended</h3>",
                    stretch: "full",
                },
                {
                    id: "misc-esix-info",
                    type: "div",
                    value: `<div class="notice unmargin">Import the settings from eSix Extended (Legacy)</div>`,
                    stretch: "full",
                },
                {
                    id: "misc-esix-button",
                    type: "file",
                    label: "Select file",
                    value: "json",
                    stretch: "mid",
                },
                {
                    id: "misc-esix-spacer",
                    type: "div",
                    value: "",
                    stretch: "column",
                },
                {
                    id: "misc-esix-status",
                    type: "div",
                    label: " ",
                    value: `<div id="file-esix-status" class="unmargin"></div>`,
                    stretch: "mid",
                },
                {
                    id: "misc-esix-spacer",
                    type: "div",
                    value: "",
                    stretch: "column",
                },
            ]
        );

        return form;
    }

    /**
     * Event handlers for the miscellaneous settings page
     * @param form Miscellaneous settings form
     */
    private handleTabMiscellaneous(form: Form): void {
        const miscModule = this.getModuleWithType<Miscellaneous>(Miscellaneous);
        const miscFormInput = form.getInputList();

        miscFormInput.get("misc-redesign-fixes").on("re621:form:input", (event, data) => {
            miscModule.pushSettings("loadRedesignFixes", data);
            if (data) { miscModule.enableRedesignFixes(); }
            else { miscModule.disableRedesignFixes(); }
        });

        // Import / Export to file
        miscFormInput.get("misc-export-button").on("click", () => {
            const exportData = {
                "meta": "re621/1.0",
                "pools": PoolSubscriptions.getInstance().fetchSettings("data"),
                "forums": ForumSubscriptions.getInstance().fetchSettings("data"),
                "tags": TagSubscriptions.getInstance().fetchSettings("data"),
            };

            Util.downloadJSON(exportData, "re621-" + User.getUsername());
        });

        miscFormInput.get("misc-import-button").on("re621:form:input", (event, data) => {
            if (!data) return;
            const $info = $("div#file-import-status").html("Loading . . .");

            const reader = new FileReader();
            reader.readAsText(data, "UTF-8");
            reader.onload = function (event): void {
                const parsedData = JSON.parse(event.target.result.toString());
                console.log(parsedData);

                if (!parsedData["meta"] || parsedData["meta"] !== "re621/1.0") {
                    $info.html("Invalid file format");
                    return;
                }

                // parsedData["pools"] : pools
                if (parsedData["pools"]) {
                    $info.html("Processing pools . . .");
                    const poolSubs = PoolSubscriptions.getInstance(),
                        poolData: PoolInfo = poolSubs.fetchSettings("data", true);
                    for (const [key, value] of Object.entries(parsedData["pools"])) {
                        poolData[key] = value;
                    }
                    poolSubs.pushSettings("data", poolData);
                }

                // parsedData["forums"] : forums
                if (parsedData["forums"]) {
                    $info.html("Processing forums . . .");
                    const forumSubs = ForumSubscriptions.getInstance(),
                        forumData: ForumInfo = forumSubs.fetchSettings("data", true);
                    for (const [key, value] of Object.entries(parsedData["forums"])) {
                        forumData[key] = value;
                    }
                    forumSubs.pushSettings("data", forumData);
                }

                // parsedData[3] : tags (???)
                if (parsedData["tags"]) {
                    $info.html("Processing tags . . .");
                    const tagSubs = TagSubscriptions.getInstance(),
                        tagData: TagInfo = tagSubs.fetchSettings("data", true);
                    for (const [key, value] of Object.entries(parsedData["tags"])) {
                        tagData[key] = value;
                    }
                    tagSubs.pushSettings("data", tagData);
                }

                //console.log(parsedData);
                $info.html("Settings imported!");
            };
            reader.onerror = function (): void { $info.html("Error loading file"); };

        });

        // eSix Legacy
        miscFormInput.get("misc-esix-button").on("re621:form:input", (event, data) => {
            if (!data) return;
            const $info = $("div#file-esix-status").html("Loading . . .");

            const reader = new FileReader();
            reader.readAsText(data, "UTF-8");
            reader.onload = function (event): void {
                const parsedData = event.target.result.toString().split("\n");
                if (parsedData[0] !== "eSixExtend User Prefs") { $info.html("Invalid file format"); return; }

                parsedData.forEach((value, index) => {
                    if (index !== 0) parsedData[index] = JSON.parse(atob(value).replace(/^\d+\|/, ""));
                });

                // parsedData[2] : pools
                $info.html("Processing pools . . .");
                const poolSubs = PoolSubscriptions.getInstance(),
                    poolData: PoolInfo = poolSubs.fetchSettings("data", true);
                for (const entry of parsedData[2]) {
                    poolData[entry["id"]] = { thumbnailMd5: entry["thumb"]["url"].substr(6, 32) };
                }
                poolSubs.pushSettings("data", poolData);

                // parsedData[3] : forums
                $info.html("Processing forums . . .");
                const forumSubs = ForumSubscriptions.getInstance(),
                    forumData: ForumInfo = forumSubs.fetchSettings("data", true);
                for (const entry of parsedData[3]) {
                    forumData[entry["id"]] = {};
                }
                forumSubs.pushSettings("data", forumData);

                // parsedData[3] : tags (???)
                $info.html("Processing tags . . .");
                // TODO Someone give me a file that has tag subscriptions
                //      Wait, did eSix Extend even have tag subscriptions

                //console.log(parsedData);
                $info.html("Settings imported!");
            };
            reader.onerror = function (): void { $info.html("Error loading file"); };

        });
    }

    private createModuleStatus(): Form {
        const modules = this.modules;

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

        const form = new Form(
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

        return form;
    }

    private handleModuleStatus(form: Form): void {
        const inputs = form.getInputList("checkbox");

        for (const formName of inputs.keys()) {
            const module = this.getModuleByName(formName.split("-")[0]);

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
