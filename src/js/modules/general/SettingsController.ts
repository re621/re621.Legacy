import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../../components/structure/Modal";
import { Tabbed, TabContent } from "../../components/structure/Tabbed";
import { RE6Module } from "../../components/RE6Module";
import { Miscellaneous } from "./Miscellaneous";
import { Form } from "../../components/structure/Form";
import { TitleCustomizer } from "../post/TitleCustomizer";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { PostViewer } from "../post/PostViewer";
import { HotkeyCustomizer } from "./HotkeyCustomizer";
import { ImageScaler } from "../post/ImageScaler";
import { PoolNavigator } from "../post/PoolNavigator";
import { BlacklistEnhancer } from "../search/BlacklistEnhancer";

/**
 * SettingsController  
 * Interface for accessing and changing project settings
 */
export class SettingsController extends RE6Module {

    private static instance: SettingsController;

    private modules: Map<string, RE6Module> = new Map();
    private modal: Modal;

    private constructor() {
        super();
    }

    public init() {

        // Create a button in the header
        let addSettingsButton = HeaderCustomizer.getInstance().createTabElement({
            name: `<i class="fas fa-wrench"></i>`,
            parent: "menu.extra",
            class: "float-right",
            controls: false,
        });

        // Establish the settings window contents
        let postsPageTab = this.createTabPostsPage();
        let hotkeyTab = this.createTabHotkeys();
        let miscSettingsTab = this.createTabMiscellaneous();
        let blacklistSettingsTab = this.createTabBlacklist();

        let $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Posts", page: postsPageTab.get() },
                { name: "Hotkeys", page: hotkeyTab.get() },
                { name: "Misc", page: miscSettingsTab.get() },
                { name: "Blacklist", page: blacklistSettingsTab.get() }
            ]
        });

        // Create the modal
        this.modal = new Modal({
            title: "Settings",
            triggers: [{ element: addSettingsButton.link }],
            escapable: false,
            fixed: true,
            content: $settings.create(),
            position: { my: "center", at: "center" }
        });

        // Establish handlers
        this.handleTabMiscellaneous(miscSettingsTab);
        this.handleTabHotkeys(hotkeyTab);
        this.handleTabPostsPage(postsPageTab);
        this.handleTabBlacklist(blacklistSettingsTab);
    }

    /**
     * Returns a singleton instance of the SettingsController
     * @returns SettingsController instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new SettingsController();
        return this.instance;
    }

    /**
     * Registers the module so that its settings could be changed
     * @param module Module to register
     */
    public static registerModule(...moduleList: RE6Module[]) {
        for (const module of moduleList) {
            this.getInstance().modules.set(module.constructor.name, module);
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
        let titleCustomizer = <TitleCustomizer>this.modules.get("TitleCustomizer");
        let downloadCustomizer = <TitleCustomizer>this.modules.get("DownloadCustomizer");
        let miscellaneous = <Miscellaneous>this.modules.get("Miscellaneous");
        let postViewer = <PostViewer>this.modules.get("PostViewer");

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
                    value: titleCustomizer.fetchSettings("symbol-fav"),
                    label: "Favorite",
                },
                {
                    id: "general-title-symbol-voteup",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol-voteup"),
                    label: "Upvote",
                },
                {
                    id: "general-title-symbol-votedown",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol-votedown"),
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
                    stretch: "full",
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
        let postsPageInput = form.getInputList();

        // General
        postsPageInput.get("general-title-template").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("template", data);
            titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-enabled").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbolsEnabled", data);
            titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-fav").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbol-fav", data);
            titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-voteup").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbol-voteup", data);
            titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-votedown").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbol-votedown", data);
            titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-improved-tagcount").on("re621:form:input", (event, data) => {
            miscellaneous.pushSettings("improveTagCount", data);
        });

        // Actions
        postsPageInput.get("action-download-template").on("re621:form:input", (event, data) => {
            downloadCustomizer.pushSettings("template", data);
            downloadCustomizer.refreshDownloadLink();
        });

        postsPageInput.get("actions-votefavorite").on("re621:form:input", (event, data) => {
            postViewer.pushSettings("upvote_on_favorite", data);
        });
    }

    /** Creates the DOM for the hotkey settings page */
    private createTabHotkeys() {
        let postViewer = <PostViewer>this.modules.get("PostViewer");
        let poolNavigator = <PoolNavigator>this.modules.get("PoolNavigator");
        let imageScaler = <ImageScaler>this.modules.get("ImageScaler");
        let miscellaneous = <Miscellaneous>this.modules.get("Miscellaneous");

        let form = new Form(
            {
                "id": "settings-hotkeys",
                columns: 3,
                parent: "re-modal-container"
            },
            [
                // Posts
                {
                    id: "hotkey-posts-title",
                    type: "div",
                    value: "<h3>Posts</h3>",
                    stretch: "full"
                },

                // - Voting
                {
                    id: "hotkey-post-upvote",
                    type: "key",
                    label: "Upvote",
                    value: postViewer.fetchSettings("hotkey_upvote"),
                },
                {
                    id: "hotkey-post-downvote",
                    type: "key",
                    label: "Downvote",
                    value: postViewer.fetchSettings("hotkey_downvote"),
                },
                {
                    id: "hotkey-post-favorite",
                    type: "key",
                    label: "Favorite",
                    value: postViewer.fetchSettings("hotkey_favorite"),
                },

                // - Navigation
                {
                    id: "hotkey-post-next",
                    type: "key",
                    label: "Next Post",
                    value: poolNavigator.fetchSettings("hotkey_prev"),
                },
                {
                    id: "hotkey-post-prev",
                    type: "key",
                    label: "Previous Post",
                    value: poolNavigator.fetchSettings("hotkey_next"),
                },
                {
                    id: "hotkey-post-cycle",
                    type: "key",
                    label: "Cycle Navigation",
                    value: poolNavigator.fetchSettings("hotkey_cycle"),
                },

                // - Scaling
                {
                    id: "hotkey-post-scale",
                    type: "key",
                    label: "Scale",
                    value: imageScaler.fetchSettings("hotkey_scale"),
                },

                // Comments
                {
                    id: "hotkey-comments-title",
                    type: "div",
                    value: "<h3>Comments</h3>",
                    stretch: "full"
                },
                {
                    id: "hotkey-comments-new",
                    type: "key",
                    label: "New Comment",
                    value: miscellaneous.fetchSettings("hotkey_newcomment"),
                },
            ]
        );

        return form;
    }

    /**
     * Event handlers for the hotkey settings page
     * @param form Miscellaneous settings form
     */
    private handleTabHotkeys(form: Form) {
        let hotkeyFormInput = form.getInputList();
        let postViewer = <PostViewer>this.modules.get("PostViewer");
        let poolNavigator = <PoolNavigator>this.modules.get("PoolNavigator");
        let imageScaler = <ImageScaler>this.modules.get("ImageScaler");
        let miscellaneous = <Miscellaneous>this.modules.get("Miscellaneous");

        // Posts
        // - Voting
        hotkeyFormInput.get("hotkey-post-upvote").on("re621:form:input", (event, newKey, oldKey) => {
            postViewer.pushSettings("hotkey_upvote", newKey);
            HotkeyCustomizer.unregister(oldKey);
            postViewer.resetHotkeys();
        });

        hotkeyFormInput.get("hotkey-post-downvote").on("re621:form:input", (event, newKey, oldKey) => {
            postViewer.pushSettings("hotkey_downvote", newKey);
            HotkeyCustomizer.unregister(oldKey);
            postViewer.resetHotkeys();
        });

        hotkeyFormInput.get("hotkey-post-favorite").on("re621:form:input", (event, newKey, oldKey) => {
            postViewer.pushSettings("hotkey_favorite", newKey);
            HotkeyCustomizer.unregister(oldKey);
            postViewer.resetHotkeys();
        });

        // - Navigation
        hotkeyFormInput.get("hotkey-post-next").on("re621:form:input", (event, newKey, oldKey) => {
            poolNavigator.pushSettings("hotkey_next", newKey);
            HotkeyCustomizer.unregister(oldKey);
            poolNavigator.resetHotkeys();
        });

        hotkeyFormInput.get("hotkey-post-prev").on("re621:form:input", (event, newKey, oldKey) => {
            poolNavigator.pushSettings("hotkey_prev", newKey);
            HotkeyCustomizer.unregister(oldKey);
            poolNavigator.resetHotkeys();
        });

        hotkeyFormInput.get("hotkey-post-cycle").on("re621:form:input", (event, newKey, oldKey) => {
            poolNavigator.pushSettings("hotkey_cycle", newKey);
            HotkeyCustomizer.unregister(oldKey);
            poolNavigator.resetHotkeys();
        });

        // - Scaling
        hotkeyFormInput.get("hotkey-post-scale").on("re621:form:input", (event, newKey, oldKey) => {
            imageScaler.pushSettings("hotkey_scale", newKey);
            HotkeyCustomizer.unregister(oldKey);
            imageScaler.resetHotkeys();
        });

        // Comments
        hotkeyFormInput.get("hotkey-comments-new").on("re621:form:input", (event, newKey, oldKey) => {
            miscellaneous.pushSettings("hotkey_newcomment", newKey);
            HotkeyCustomizer.unregister(oldKey);
            miscellaneous.resetHotkeys();
        });
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
                    stretch: "full"
                },
                {
                    id: "misc-redesign-fixes",
                    type: "checkbox",
                    value: module.fetchSettings("loadRedesignFixes"),
                    label: "Load Redesign Fixes",
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
    }

    private createTabBlacklist() {
        let module = <BlacklistEnhancer>this.modules.get("BlacklistEnhancer");

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
        let module = <BlacklistEnhancer>this.modules.get("BlacklistEnhancer");
        let inputs = form.getInputList();
        inputs.get("blacklist-quickadd").on("re621:form:input", (event, data) => {
            module.pushSettings("quickaddTags", data);
        });
    }
}
