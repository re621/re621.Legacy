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

        let $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Posts", page: postsPageTab.get() },
                { name: "Hotkeys", page: hotkeyTab.get() },
                { name: "Misc", page: miscSettingsTab.get() },
            ]
        });

        // Create the modal
        this.modal = new Modal({
            title: "Settings",
            triggers: [{ element: addSettingsButton.link }],
            escapable: false,
            content: $settings.create(),
            position: { my: "right top", at: "right top" }
        });

        // Establish handlers
        this.handleTabMiscellaneous(miscSettingsTab);
        this.handleTabHotkeys(hotkeyTab);
        this.handleTabPostsPage(postsPageTab);
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

        let form = new Form(
            {
                id: "title-customizer-misc",
                columns: 2,
                parent: "re-modal-container",
            },
            [
                // Title Customizer
                {
                    id: "title-cust-header",
                    type: "div",
                    value: "<h3>Page Title</h3>",
                    stretch: "full",
                },
                {
                    id: "title-cust-template",
                    type: "input",
                    value: titleCustomizer.fetchSettings("template"),
                    label: "Template",
                    stretch: "full",
                },
                {
                    id: "title-cust-symbols-enabled",
                    type: "checkbox",
                    value: titleCustomizer.fetchSettings("symbolsEnabled"),
                    label: "Vote / Favorite Icons",
                },
                {
                    id: "title-cust-symbol-fav",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol-fav"),
                    label: "Favorite",
                },
                {
                    id: "title-cust-symbol-spacer-1",
                    type: "div",
                    value: "",
                },
                {
                    id: "title-cust-symbol-voteup",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol-voteup"),
                    label: "Upvote",
                },
                {
                    id: "title-cust-symbol-spacer-2",
                    type: "div",
                    value: "",
                    label: "",
                },
                {
                    id: "title-cust-symbol-votedown",
                    type: "input",
                    value: titleCustomizer.fetchSettings("symbol-votedown"),
                    label: "Downvote",
                },

                // Download Customizer
                {
                    id: "download-cust-header",
                    type: "div",
                    value: "<h3>Downloads</h3>",
                    stretch: "full",
                },
                {
                    id: "download-cust-template",
                    type: "input",
                    value: downloadCustomizer.fetchSettings("template"),
                    label: "Template",
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
        let downloadCustomizer = <TitleCustomizer>this.modules.get("DownloadCustomizer");
        let postsPageInput = form.getInputList();

        // Title Customizer
        postsPageInput.get("title-cust-template").change(function (event) {
            titleCustomizer.pushSettings("template", $(this).val());
        });

        postsPageInput.get("title-cust-symbols-enabled").change(function (event) {
            titleCustomizer.pushSettings("symbolsEnabled", $(this).is(":checked"));
        });

        postsPageInput.get("title-cust-symbol-fav").change(function (event) {
            titleCustomizer.pushSettings("symbol-fav", $(this).val());
        });

        postsPageInput.get("title-cust-symbol-voteup").change(function (event) {
            titleCustomizer.pushSettings("symbol-voteup", $(this).val());
        });

        postsPageInput.get("title-cust-symbol-votedown").change(function (event) {
            titleCustomizer.pushSettings("symbol-votedown", $(this).val());
        });

        // Download Customizer
        postsPageInput.get("download-cust-template").change(function (event) {
            downloadCustomizer.pushSettings("template", $(this).val());
        });
    }

    /** Creates the DOM for the hotkey settings page */
    private createTabHotkeys() {
        let postViewer = <PostViewer>this.modules.get("PostViewer");
        let imageScaler = <ImageScaler>this.modules.get("ImageScaler");

        let form = new Form(
            {
                "id": "settings-hotkeys",
                columns: 2,
                parent: "re-modal-container"
            },
            [
                {
                    id: "hotkey-posts-title",
                    type: "div",
                    value: "Posts",
                    stretch: "full"
                },
                {
                    id: "hotkey-upvote",
                    type: "keyinput",
                    label: "Upvote",
                    value: postViewer.fetchSettings("hotkey_upvote"),
                },
                {
                    id: "hotkey-downvote",
                    type: "keyinput",
                    label: "Downvote",
                    value: postViewer.fetchSettings("hotkey_downvote"),
                },
                {
                    id: "hotkey-favorite",
                    type: "keyinput",
                    label: "Favorite",
                    value: postViewer.fetchSettings("hotkey_favorite"),
                },
                {
                    id: "hotkey-scale",
                    type: "keyinput",
                    label: "Scale",
                    value: imageScaler.fetchSettings("hotkey_scale"),
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
        let imageScaler = <ImageScaler>this.modules.get("ImageScaler");

        hotkeyFormInput.get("hotkey-upvote").on("re621:keychange", function (event, newKey, oldKey) {
            postViewer.pushSettings("hotkey_upvote", newKey);
            HotkeyCustomizer.unregister(oldKey);
            postViewer.registerHotkeys();
        });

        hotkeyFormInput.get("hotkey-downvote").on("re621:keychange", function (event, newKey, oldKey) {
            postViewer.pushSettings("hotkey_downvote", newKey);
            HotkeyCustomizer.unregister(oldKey);
            postViewer.registerHotkeys();
        });

        hotkeyFormInput.get("hotkey-favorite").on("re621:keychange", function (event, newKey, oldKey) {
            postViewer.pushSettings("hotkey_favorite", newKey);
            HotkeyCustomizer.unregister(oldKey);
            postViewer.registerHotkeys();
        });

        hotkeyFormInput.get("hotkey-scale").on("re621:keychange", function (event, newKey, oldKey) {
            imageScaler.pushSettings("hotkey_scale", newKey);
            HotkeyCustomizer.unregister(oldKey);
            imageScaler.registerHotkeys();
        });
    }

    /** Creates the DOM for the miscellaneous settings page */
    private createTabMiscellaneous() {
        let module = <Miscellaneous>this.modules.get("Miscellaneous");

        // Create the settings form
        let form = new Form(
            {
                id: "settings-misc",
                columns: 2,
                parent: "re-modal-container",
            },
            [
                {
                    id: "redesign-fixes",
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
        let miscFormInput = form.getInputList();

        miscFormInput.get("redesign-fixes").change(element => {
            let enabled = $(element.target).is(":checked");
            let miscModule = <Miscellaneous>this.modules.get("Miscellaneous");
            miscModule.pushSettings("loadRedesignFixes", enabled);

            if (enabled) { miscModule.enableRedesignFixes(); }
            else { miscModule.disableRedesignFixes(); }
        });
    }

}
