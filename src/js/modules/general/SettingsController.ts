import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../../components/structure/Modal";
import { Tabbed } from "../../components/structure/Tabbed";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Miscellaneous } from "./Miscellaneous";
import { Form, FormElement } from "../../components/structure/Form";
import { Hotkeys } from "../../components/data/Hotkeys";
import { PoolSubscriptions } from "../subscriptions/PoolSubscriptions";
import { Util } from "../../components/structure/Util";
import { ForumSubscriptions } from "../subscriptions/ForumSubscriptions";
import { TitleCustomizer } from "../post/TitleCustomizer";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { PostViewer } from "../post/PostViewer";
import { FormattingManager } from "./FormattingHelper";
import { BlacklistEnhancer } from "../search/BlacklistEnhancer";
import { PoolNavigator } from "../post/PoolNavigator";
import { ImageScaler } from "../post/ImageScaler";
import { ModuleController } from "../../components/ModuleController";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { ExtraInfo } from "../subscriptions/SubscriptionManager";
import { Api } from "../../components/api/Api";
import { User } from "../../components/data/User";
import { ThumbnailEnhancer, PerformanceMode } from "../search/ThumbnailsEnhancer";
import { GM } from "../../components/api/GM";
import { MassDownloader } from "../search/MassDownloader";
import { PoolDownloader } from "../pools/PoolDownloader";

/**
 * SettingsController  
 * Interface for accessing and changing project settings
 */
export class SettingsController extends RE6Module {

    private modal: Modal;

    public create(): void {

        // Create a button in the header
        const openSettingsButton = DomUtilities.addSettingsButton({
            name: `<i class="fas fa-wrench"></i>`,
            class: "float-right",
        });

        // Establish the settings window contents
        const moduleStatusTab = this.createModuleStatus();
        const postsPageTab = this.createTabPostsPage();
        const downloadsTab = this.createTabDownloads();
        const hotkeyTab = this.createTabHotkeys();
        const miscSettingsTab = this.createTabMiscellaneous();
        const aboutTab = this.createAboutTab();

        const $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Features", page: moduleStatusTab.get() },
                { name: "General", page: postsPageTab.get() },
                { name: "Downloads", page: downloadsTab.get() },
                { name: "Hotkeys", page: hotkeyTab.get() },
                { name: "Other", page: miscSettingsTab.get() },
                { name: "About", page: aboutTab.get() },
            ]
        });

        // Create the modal
        this.modal = new Modal({
            title: "Settings",
            triggers: [{ element: openSettingsButton }],
            escapable: false,
            fixed: true,
            reserveHeight: true,
            content: $settings.create(),
            position: { my: "center", at: "center" }
        });

        // Establish handlers
        this.handleModuleStatus(moduleStatusTab);
        this.handleTabPostsPage(postsPageTab);
        this.handleTabDownload(downloadsTab);
        this.handleTabHotkeys(hotkeyTab);
        this.handleTabMiscellaneous(miscSettingsTab);
        this.handleAboutTab(aboutTab);

        // Start up the version checker
        if (new Date().getTime() - (1000 * 60 * 60) > this.fetchSettings("lastVersionCheck")) {

            const releases = { latest: null, current: null };
            (async (): Promise<void> => {
                releases.latest = JSON.parse(await Util.userscriptRequest("https://api.github.com/repos/re621/re621/releases/latest"));
                releases.current = JSON.parse(await Util.userscriptRequest("https://api.github.com/repos/re621/re621/releases/tags/" + window["re621"]["version"]));
                this.pushSettings("newVersionAvailable", releases.latest.name !== releases.current.name);
                this.pushSettings("lastVersionCheck", new Date().getTime());
                this.pushSettings("changelog", releases.current.body);
                this.modal.getElement().trigger("re621:settings:update", {
                    changelog: releases.current.body,
                    newVersion: releases.latest.name !== releases.current.name
                });
            })();
        }
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            newVersionAvailable: false,
            lastVersionCheck: 0,
            changelog: "",
        };
    }

    /** Create the DOM for the General Settings page */
    private createTabPostsPage(): Form {
        const titleCustomizer = ModuleController.get(TitleCustomizer),
            miscellaneous = ModuleController.get(Miscellaneous),
            postViewer = ModuleController.get(PostViewer),
            formattingManager = ModuleController.get(FormattingManager),
            blacklistEnhancer = ModuleController.get(BlacklistEnhancer),
            thumbnailEnhancer = ModuleController.get(ThumbnailEnhancer);

        const templateVars = new Form(
            { id: "general-template-vars", columns: 2, },
            [
                { id: "explain", type: "div", stretch: "mid", value: `<div class="notice unmargin">The following variables can be used:</div>` },
                { id: "postnum", type: "copy", label: "Post ID", value: "%postid%", },
                { id: "author", type: "copy", label: "Artist", value: "%artist%", },
                { id: "copyright", type: "copy", label: "Copyright", value: "%copyright%", },
                { id: "characters", type: "copy", label: "Characters", value: "%character%", },
                { id: "species", type: "copy", label: "Species", value: "%species%", },
                { id: "meta", type: "copy", label: "Meta", value: "%meta%", },
            ]
        );

        const PERFORMANCE_SELECT = [
            { value: PerformanceMode.Disabled, name: "Disabled" },
            { value: PerformanceMode.Hover, name: "On Hover" },
            { value: PerformanceMode.Always, name: "Always" },
        ];

        const form = new Form(
            {
                id: "general-settings-form",
                columns: 3,
                parent: "div#modal-container",
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
                    value: templateVars.get(),
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
                    id: "general-sticky-searchbox",
                    type: "checkbox",
                    value: miscellaneous.fetchSettings("stickySearchbox"),
                    label: "Fixed Searchbox",
                },
                {
                    id: "general-spacer-2",
                    type: "div",
                    value: " ",
                    stretch: "column",
                },
                {
                    id: "gen-inter-spacer-1",
                    type: "hr",
                    value: " ",
                    stretch: "full",
                },


                // Thumbnails
                {
                    id: "thumb-header",
                    type: "div",
                    value: "<h3>Thumbnails</h3>",
                    stretch: "full",
                },
                {
                    id: "thumb-upscale",
                    type: "select",
                    value: thumbnailEnhancer.fetchSettings("upscale"),
                    label: "Upscale",
                    data: PERFORMANCE_SELECT,
                },
                {
                    id: "thumb-upscale-text-1",
                    type: "div",
                    value: "Replace 150x150 blurry thumbnails with larger versions",
                    stretch: "mid",
                },
                {
                    id: "thumb-upscale-spacer",
                    type: "div",
                    value: " ",
                    stretch: "column",
                },
                {
                    id: "thumb-upscale-text-2",
                    type: "div",
                    value: `<div class="unmargin"><b>Requires a page reload</b></div>`,
                    stretch: "mid",
                },
                {
                    id: "thumb-crop",
                    type: "checkbox",
                    value: thumbnailEnhancer.fetchSettings("crop"),
                    label: "Crop to Fit",
                },
                {
                    id: "thumb-crop-text",
                    type: "div",
                    value: "Cut down the thumbnais to fit into neat squares",
                    stretch: "mid",
                },
                {
                    id: "thumb-vote",
                    type: "checkbox",
                    value: thumbnailEnhancer.fetchSettings("vote"),
                    label: "Voting Buttons",
                },
                {
                    id: "thumb-vote-text",
                    type: "div",
                    value: "Adds voting buttons when hovering over a thumbnail",
                    stretch: "mid",
                },
                {
                    id: "thumb-zoom",
                    type: "checkbox",
                    value: thumbnailEnhancer.fetchSettings("zoom"),
                    label: "Enlarge on Hover",
                },
                {
                    id: "thumb-zoom-text",
                    type: "div",
                    value: "Increases the size of the thumbnail when hovering over it",
                    stretch: "mid",
                },
                {
                    id: "gen-inter-spacer-2",
                    type: "hr",
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
                    id: "actions-votefavorite",
                    type: "checkbox",
                    value: postViewer.fetchSettings("upvoteOnFavorite"),
                    label: "Upvote Favorites",
                },
                {
                    id: "actions-submit-hotkey",
                    type: "checkbox",
                    value: formattingManager.fetchSettings("hotkeySubmitActive"),
                    label: "Submit Comments with Alt+Enter",
                },
                {
                    id: "action-spacer-1",
                    type: "div",
                    value: " ",
                    stretch: "column",
                },
                {
                    id: "gen-inter-spacer-3",
                    type: "hr",
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
        const titleCustomizer = ModuleController.getWithType<TitleCustomizer>(TitleCustomizer);
        const miscellaneous = ModuleController.getWithType<Miscellaneous>(Miscellaneous);
        const postViewer = ModuleController.get(PostViewer);
        const formattingManager = ModuleController.get(FormattingManager);
        const blacklistEnhancer = ModuleController.get(BlacklistEnhancer);
        const thumbnailEnhancer = ModuleController.getWithType<ThumbnailEnhancer>(ThumbnailEnhancer);
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
            titleCustomizer.pushSettings("symbolFav", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-voteup").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbolVoteUp", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-title-symbol-votedown").on("re621:form:input", (event, data) => {
            titleCustomizer.pushSettings("symbolVoteDown", data);
            if (titleCustomizer.isInitialized())
                titleCustomizer.refreshPageTitle();
        });

        postsPageInput.get("general-improved-tagcount").on("re621:form:input", (event, data) => {
            miscellaneous.pushSettings("improveTagCount", data);
            miscellaneous.improveTagCount(data);
        });

        postsPageInput.get("general-sticky-searchbox").on("re621:form:input", (event, data) => {
            miscellaneous.pushSettings("stickySearchbox", data);
            miscellaneous.createStickySearchbox(data);
        });

        // Thumbnails
        postsPageInput.get("thumb-upscale").on("re621:form:input", (event, data) => {
            thumbnailEnhancer.pushSettings("upscale", data);
        });

        postsPageInput.get("thumb-crop").on("re621:form:input", (event, data) => {
            thumbnailEnhancer.pushSettings("crop", data);
            thumbnailEnhancer.toggleThumbCrop(data);
        });

        postsPageInput.get("thumb-vote").on("re621:form:input", (event, data) => {
            thumbnailEnhancer.pushSettings("vote", data);
            thumbnailEnhancer.toggleHoverVote(data);
        });

        postsPageInput.get("thumb-zoom").on("re621:form:input", (event, data) => {
            thumbnailEnhancer.pushSettings("zoom", data);
            thumbnailEnhancer.toggleHoverZoom(data);
        });

        // Actions
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

    private createTabDownloads(): Form {
        const downloadCustomizer = ModuleController.get(DownloadCustomizer),
            massDownloader = ModuleController.get(MassDownloader),
            poolDownloader = ModuleController.get(PoolDownloader);

        const templateVars = new Form(
            { id: "downloads-template-vars", columns: 2, },
            [
                { id: "explain", type: "div", stretch: "mid", value: `<div class="notice unmargin">The following variables can be used:</div>` },
                { id: "postnum", type: "copy", label: "Post ID", value: "%postid%", },
                { id: "author", type: "copy", label: "Artist", value: "%artist%", },
                { id: "copyright", type: "copy", label: "Copyright", value: "%copyright%", },
                { id: "characters", type: "copy", label: "Characters", value: "%character%", },
                { id: "species", type: "copy", label: "Species", value: "%species%", },
                { id: "meta", type: "copy", label: "Meta", value: "%meta%", },
            ]
        );

        const poolVars = new Form(
            { id: "downloads-pool-vars", columns: 2, },
            [
                { id: "explain", type: "div", stretch: "mid", value: `<div class="notice unmargin">The following variables can also be used:</div>` },
                { id: "pool", type: "copy", label: "Pool Name", value: "%pool%", },
                { id: "index", type: "copy", label: "Index", value: "%index%", },
            ]
        );

        const form = new Form(
            { id: "download-settings-form", columns: 3, },
            [
                // Download Customizer
                {
                    id: "download-cust-title",
                    type: "div",
                    value: "<h3>Download Customizer</h3>",
                    stretch: "full",
                },
                {
                    id: "download-cust-desc",
                    type: "div",
                    value: `This format is used by the "download" button on the post page`,
                    stretch: "full",
                },
                {
                    id: "download-cust-template",
                    type: "input",
                    value: downloadCustomizer.fetchSettings("template"),
                    label: "Download File Name",
                    stretch: "full",
                },
                {
                    id: "download-cust-template-variables",
                    type: "div",
                    label: " ",
                    value: templateVars.get(),
                    stretch: "full",
                },
                {
                    id: "download-cust-template-hr",
                    type: "hr",
                    stretch: "full",
                },

                // Mass Downloader
                {
                    id: "download-mass-title",
                    type: "div",
                    value: "<h3>Mass Downloader</h3>",
                    stretch: "full",
                },
                {
                    id: "download-mass-desc",
                    type: "div",
                    value: "Downloaded files will be automatically renamed according to this template",
                    stretch: "full",
                },
                {
                    id: "download-mass-template",
                    type: "input",
                    value: massDownloader.fetchSettings("template"),
                    label: "Download File Name",
                    stretch: "full",
                },
                {
                    id: "download-mass-template-variables",
                    type: "div",
                    label: " ",
                    value: `<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`,
                    stretch: "full",
                },
                {
                    id: "download-mass-autodownload",
                    type: "checkbox",
                    label: "Auto Download",
                    value: massDownloader.fetchSettings("autoDownloadArchive"),
                    stretch: "column",
                },
                {
                    id: "download-mass-autodownload-text",
                    type: "div",
                    value: "The archive will be downloaded automatically after being created",
                    stretch: "mid",
                },
                {
                    id: "download-mass-template-hr",
                    type: "hr",
                    stretch: "full",
                },

                // Pool Downloader
                {
                    id: "download-pool-title",
                    type: "div",
                    value: "<h3>Pool Downloader</h3>",
                    stretch: "full",
                },
                {
                    id: "download-pool-desc",
                    type: "div",
                    value: "Downloaded files will be automatically renamed according to this template",
                    stretch: "full",
                },
                {
                    id: "download-pool-template",
                    type: "input",
                    value: poolDownloader.fetchSettings("template"),
                    label: "Download File Name",
                    stretch: "full",
                },
                {
                    id: "download-pool-template-variables",
                    type: "div",
                    label: " ",
                    value: `<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`,
                    stretch: "full",
                },
                {
                    id: "download-pool-template-variables",
                    type: "div",
                    label: " ",
                    value: poolVars.get(),
                    stretch: "full",
                },
                {
                    id: "download-pool-autodownload",
                    type: "checkbox",
                    label: "Auto Download",
                    value: poolDownloader.fetchSettings("autoDownloadArchive"),
                    stretch: "column",
                },
                {
                    id: "download-pool-autodownload-text",
                    type: "div",
                    value: "The archive will be downloaded automatically after being created",
                    stretch: "mid",
                },

            ]);
        return form;
    }

    private handleTabDownload(form: Form): void {
        const downloadCustomizer = ModuleController.getWithType<DownloadCustomizer>(DownloadCustomizer);
        const massDownloader = ModuleController.get(MassDownloader);
        const poolDownloader = ModuleController.get(PoolDownloader);
        const postsPageInput = form.getInputList();

        // Download Customizer
        postsPageInput.get("download-cust-template").on("re621:form:input", (event, data) => {
            downloadCustomizer.pushSettings("template", data);
            if (downloadCustomizer.isInitialized())
                downloadCustomizer.refreshDownloadLink();
        });

        // Mass Downloader
        postsPageInput.get("download-mass-template").on("re621:form:input", (event, data) => {
            massDownloader.pushSettings("template", data);
        });
        postsPageInput.get("download-mass-autodownload").on("re621:form:input", (event, data) => {
            massDownloader.pushSettings("autoDownloadArchive", data);
        });

        // Pool Downloader
        postsPageInput.get("download-pool-template").on("re621:form:input", (event, data) => {
            poolDownloader.pushSettings("template", data);
        });
        postsPageInput.get("download-pool-autodownload").on("re621:form:input", (event, data) => {
            poolDownloader.pushSettings("autoDownloadArchive", data);
        });
    }

    /** Creates the DOM for the hotkey settings page */
    private createTabHotkeys(): Form {
        const postViewer = ModuleController.get(PostViewer);
        const poolNavigator = ModuleController.get(PoolNavigator);
        const imageScaler = ModuleController.get(ImageScaler);
        const miscellaneous = ModuleController.get(Miscellaneous);
        const headerCustomizer = ModuleController.get(HeaderCustomizer);

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
                parent: "div#modal-container"
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
                { id: "hotkey-posts-hr", type: "hr", stretch: "full", },
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

                // Actions
                { id: "hotkey-comments-hr", type: "hr", stretch: "full", },
                {
                    id: "hotkey-comments-title",
                    type: "div",
                    value: "<h3>Actions</h3>",
                    stretch: "full"
                },

                createLabel("hotkeyNewComment", "New Comment"),
                createInput(miscellaneous, "hotkeyNewComment", "", 0),
                createInput(miscellaneous, "hotkeyNewComment", "", 1),

                createLabel("hotkeyEditPost", "Edit Post"),
                createInput(miscellaneous, "hotkeyEditPost", "", 0),
                createInput(miscellaneous, "hotkeyEditPost", "", 1),

                createLabel("hotkeyHideNotes", "Toggle Notes"),
                createInput(postViewer, "hotkeyHideNotes", "", 0),
                createInput(postViewer, "hotkeyHideNotes", "", 1),

                createLabel("hotkeyNewNote", "Edit Notes"),
                createInput(postViewer, "hotkeyNewNote", "", 0),
                createInput(postViewer, "hotkeyNewNote", "", 1),

                // Tabs
                { id: "hotkey-tabs-hr", type: "hr", stretch: "full", },
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
        const postViewer = ModuleController.get(PostViewer);
        const poolNavigator = ModuleController.get(PoolNavigator);
        const imageScaler = ModuleController.get(ImageScaler);
        const miscellaneous = ModuleController.get(Miscellaneous);
        const headerCustomizer = ModuleController.get(HeaderCustomizer);

        /** Creates a listener for the hotkey input */
        function createListener(module: RE6Module, settingsKey: string, bindings = 2): void {
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
        createListener(miscellaneous, "hotkeyFocusSearch");

        // Posts
        // - Voting
        createListener(postViewer, "hotkeyUpvote");

        createListener(postViewer, "hotkeyDownvote");
        createListener(postViewer, "hotkeyFavorite");

        // - Navigation
        createListener(poolNavigator, "hotkeyPrev");
        createListener(poolNavigator, "hotkeyNext");
        createListener(poolNavigator, "hotkeyCycle");

        // - Scaling
        createListener(imageScaler, "hotkeyScale");

        // Actions
        createListener(miscellaneous, "hotkeyNewComment");
        createListener(miscellaneous, "hotkeyNewNote");

        createListener(postViewer, "hotkeyHideNotes");
        createListener(postViewer, "hotkeyHideNotes");

        // Tabs
        createListener(headerCustomizer, "hotkeyTab1");
        createListener(headerCustomizer, "hotkeyTab2");
        createListener(headerCustomizer, "hotkeyTab3");
        createListener(headerCustomizer, "hotkeyTab4");
        createListener(headerCustomizer, "hotkeyTab5");
        createListener(headerCustomizer, "hotkeyTab6");
        createListener(headerCustomizer, "hotkeyTab7");
        createListener(headerCustomizer, "hotkeyTab8");
        createListener(headerCustomizer, "hotkeyTab9");
    }

    /** Creates the DOM for the miscellaneous settings page */
    private createTabMiscellaneous(): Form {
        const modules = ModuleController.getAll();

        // "Reset Module" selector
        const moduleSelector = [{ value: "none", name: "------" }];
        modules.forEach((module) => {
            moduleSelector.push({ value: module.constructor.name, name: module.constructor.name });
        });

        // Create the settings form
        const form = new Form(
            {
                id: "settings-misc",
                columns: 3,
                parent: "div#modal-container",
            },
            [
                {
                    id: "misc-title",
                    type: "div",
                    value: "<h3>Miscellaneous</h3>",
                    stretch: "full",
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

                // From File
                {
                    id: "misc-esix-button",
                    type: "file",
                    label: "Select file",
                    value: "json",
                    stretch: "mid",
                },
                {
                    id: "misc-esix-spacer-1",
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
                    id: "misc-esix-spacer-2",
                    type: "div",
                    value: "",
                    stretch: "column",
                },

                // From LocalStorage
                {
                    id: "misc-esix-localstorage",
                    type: "button",
                    label: "From LocalStorage",
                    value: "Load",
                    stretch: "mid",
                },
                {
                    id: "misc-esix-spacer-3",
                    type: "div",
                    value: "",
                    stretch: "column",
                },
                {
                    id: "misc-esix-localstorage-status",
                    type: "div",
                    label: " ",
                    value: `<div id="localstorage-esix-status" class="unmargin"></div>`,
                    stretch: "mid",
                },
                {
                    id: "misc-esix-spacer-4",
                    type: "div",
                    value: "",
                    stretch: "column",
                },
                {
                    id: "misc-esix-hr-1",
                    type: "hr",
                    stretch: "full",
                },

                // Reset Configuration
                {
                    id: "misc-reset-modules",
                    type: "div",
                    value: "<h3>Reset Modules</h3>",
                    stretch: "full",
                },
                {
                    id: "misc-reset-everything",
                    type: "button",
                    label: "Everything",
                    value: "Clear",
                    stretch: "column",
                },
                {
                    id: "misc-reset-everything-text",
                    type: "div",
                    value: "Delete settings for all modules. <b>This cannot be undone.</b>",
                    stretch: "mid",
                },
                {
                    id: "misc-reset-specific",
                    type: "select",
                    label: "Module",
                    value: "none",
                    data: moduleSelector,
                    stretch: "mid",
                },
                {
                    id: "misc-reset-specific-text-1",
                    type: "div",
                    value: "Reset a specific module.",
                    stretch: "column",
                },
                {
                    id: "misc-reset-specific-action",
                    type: "button",
                    label: " ",
                    value: "Reset",
                    stretch: "mid",
                },
                {
                    id: "misc-reset-specific-text-2",
                    type: "div",
                    value: "<b>This cannot be undone.</b>",
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
        const miscFormInput = form.getInputList();

        // Import / Export to file
        miscFormInput.get("misc-export-button").on("click", () => {

            const storedData = { "meta": "re621/1.0" };

            ModuleController.getAll().forEach((module) => {
                const data = module.getSavedSettings();
                storedData[data.name] = data.data;
                if (storedData[data.name]["cache"]) storedData[data.name]["cache"] = {};
            });

            Util.downloadJSON(storedData, "re621-" + User.getUsername() + "-userdata");
        });

        miscFormInput.get("misc-import-button").on("re621:form:input", (event, data) => {
            if (!data) return;
            const $info = $("div#file-import-status").html("Loading . . .");

            const reader = new FileReader();
            reader.readAsText(data, "UTF-8");
            reader.onload = function (event): void {
                const parsedData = JSON.parse(event.target.result.toString());

                if (!parsedData["meta"] || parsedData["meta"] !== "re621/1.0") {
                    $info.html("Invalid file format");
                    return;
                }

                delete parsedData.meta;

                Object.keys(parsedData).forEach((key) => {
                    $info.html("Importing " + key);
                    GM.setValue(key, parsedData[key]);
                });

                //console.log(parsedData);
                $info.html("Settings imported!");
            };
            reader.onerror = function (): void { $info.html("Error loading file"); };
        });

        // eSix Legacy
        // - From File
        miscFormInput.get("misc-esix-button").on("re621:form:input", (event, data) => {
            if (!data) return;
            const $info = $("div#file-esix-status").html("Loading . . .");

            const reader = new FileReader();
            reader.readAsText(data, "UTF-8");
            reader.onload = async (event): Promise<void> => {
                const parsedData = event.target.result.toString().split("\n");
                if (parsedData[0] !== "eSixExtend User Prefs") { $info.html("Invalid file format"); return; }

                parsedData.forEach((value, index) => {
                    if (index !== 0) parsedData[index] = JSON.parse(atob(value).replace(/^\d+\|/, ""));
                });

                // parsedData[2] : pools
                await this.importPoolData(parsedData[2], $info);

                // parsedData[3] : forums
                await this.importForumData(parsedData[3], $info);

                $info.html("Settings imported!");
            };
            reader.onerror = function (): void { $info.html("Error loading file"); };
        });

        // From LocalStorage
        miscFormInput.get("misc-esix-localstorage").on("click", async () => {
            const $info = $("div#localstorage-esix-status").html("Loading . . .");

            if (localStorage.getItem("poolSubscriptions") !== null) {
                await this.importPoolData(JSON.parse(localStorage.getItem("poolSubscriptions")), $info);
            }

            if (localStorage.getItem("forumSubscriptions") !== null) {
                await this.importForumData(JSON.parse(localStorage.getItem("forumSubscriptions")), $info);
            }

            $info.html("Settings imported!");
        });

        // Reset Configuration
        miscFormInput.get("misc-reset-everything").on("click", () => {
            if (confirm("Are you absolutely sure?")) {
                ModuleController.getAll().forEach((module) => {
                    module.clearSettings();
                });
                location.reload();
            }
        });

        miscFormInput.get("misc-reset-specific-action").on("click", () => {
            const moduleName = miscFormInput.get("misc-reset-specific").val().toString();
            if (moduleName === "none") return;
            ModuleController.getByName(moduleName).clearSettings();
        });
    }

    private async importPoolData(settings: string, $info: JQuery<HTMLElement>): Promise<void> {
        $info.html("Processing pools . . .");
        const poolSubs = PoolSubscriptions.getInstance(),
            poolData: ExtraInfo = poolSubs.fetchSettings("data", true);
        for (const entry of settings) {
            poolData[entry["id"]] = {
                md5: entry["thumb"]["url"].substr(6, 32),
                lastID: entry["last"],
            };
        }
        poolSubs.pushSettings("data", poolData);
    }

    private async importForumData(settings: string, $info: JQuery<HTMLElement>): Promise<void> {
        $info.html("Processing forums . . .");
        const forumSubs = ForumSubscriptions.getInstance(),
            forumData: ExtraInfo = forumSubs.fetchSettings("data", true),
            postIDs = [];
        for (const entry of settings) {
            postIDs.push(entry["id"]);
        }
        const data = await Api.getJson("/forum_posts.json?search[id]=" + postIDs.join(","));
        data.forEach((postData) => {
            forumData[postData["topic_id"]] = {};
        });
        forumSubs.pushSettings("data", forumData);

    }

    private createModuleStatus(): Form {
        const modules = ModuleController.getAll();

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
                parent: "div#modal-container",
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
            const module = ModuleController.getByName(formName.split("-")[0]);

            inputs.get(formName).on("re621:form:input", (event, data) => {
                module.pushSettings("enabled", data);
                module.setEnabled(data);
                if (data === true) {
                    if (module.canInitialize()) module.create();
                } else module.destroy();
            });
        }
    }

    private createAboutTab(): Form {

        const form = new Form(
            {
                "id": "about-form",
                "columns": 3,
            },
            [
                // About
                {
                    id: "about-version",
                    type: "div",
                    value: `<h3 class="display-inline"><a href="` + window["re621"]["links"]["website"] + `">` + window["re621"]["name"] + ` v.` + window["re621"]["version"] + `</a></h3> 
                            <span class="display-inline">(build ` + window["re621"]["build"] + `)</span>
                            <span class="float-right" id="project-update-button" data-available="` + this.fetchSettings("newVersionAvailable") + `"><a href="` + window["re621"]["links"]["releases"] + `">Update Available</a></span>`,
                    stretch: "full",
                },
                {
                    id: "about-text",
                    type: "div",
                    value: `<b>` + window["re621"]["name"] + `</b> is a comprehensive set of tools designed to enhance the website for both casual and power users. It is created and maintained by unpaid volunteers, with the hope that it will be useful for the community.`,
                    stretch: "full",
                },
                {
                    id: "about-issues",
                    type: "div",
                    value: `Keeping the script - and the website - fully functional is our highest priority. If you are experiencing bugs or issues, do not hesitate to create a new ticket on <a href="` + window["re621"]["links"]["issues"] + `">github</a>, or leave us a message in the <a href="` + window["re621"]["links"]["forum"] + `">forum thread</a>. Feature requests, comments, and overall feedback are also appreciated.`,
                    stretch: "full",
                },
                {
                    id: "about-thanks",
                    type: "div",
                    value: `Thank you for downloading and using this script. We hope that you enjoy the experience.`,
                    stretch: "full",
                },
                {
                    id: "about-spacer-1",
                    type: "div",
                    value: " ",
                    stretch: "full",
                },

                // Changelog
                {
                    id: "about-changelog",
                    type: "div",
                    value: `<h3><a href="` + window["re621"]["links"]["releases"] + `" class="unmargin">What's new?</a></h3>`,
                    stretch: "full",
                },
                {
                    id: "about-changelog-changes",
                    type: "div",
                    value: `<div class="changelog-list">` + Util.quickParseMarkdown(this.fetchSettings("changelog")) + `</div>`,
                    stretch: "full",
                },
            ]
        );

        return form;
    }

    private handleAboutTab(form: Form): void {
        const inputList = form.getInputList();

        this.modal.getElement().on("re621:settings:update", (event, data) => {
            inputList.get("about-changelog-changes").html(`<div class="changelog-list">` + Util.quickParseMarkdown(data.changelog) + `</div>`);
            $("#project-update-button").attr("data-available", data.newVersion);
        });
    }
}
