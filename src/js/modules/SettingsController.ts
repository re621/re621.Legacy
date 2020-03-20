import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal, TabContent } from "../components/Modal";
import { Tabbed } from "../components/Tabbed";
import { RE6Module } from "../components/RE6Module";

/**
 * SettingsController  
 * Interface for accessing and changing project settings
 */
export class SettingsController {

    private static instance: SettingsController;

    private modules: Map<string, RE6Module> = new Map();
    private modal: Modal;

    private constructor() {

        // Create a button in the header
        let addSettingsButton = HeaderCustomizer.getInstance().createTab({
            name: `<i class="fas fa-wrench"></i>`,
            parent: "menu.extra",
            class: "float-right"
        });

        // Establish the settings window contents
        let $commonSettings = $("<div>");
        $commonSettings.append(`... Coming Soon`);

        let $headerSettings = $("<div>");
        $headerSettings.append(`... Coming Soon`);

        let $postSettings = $("<div>");
        $postSettings.append(`... Coming Soon`);

        let $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Common", page: $commonSettings },
                { name: "Header", page: $headerSettings },
                { name: "Posts", page: $postSettings },
            ]
        });

        // Create the modal
        this.modal = new Modal({
            uid: "settings-modal",
            title: "Settings",
            width: "30rem",
            height: "200px",
            position: {
                right: "0",
                top: "4.5rem",
            },
            subtabbed: true,
            triggers: [{ element: addSettingsButton.link }],
            content: [{ name: "re621", page: $settings.create(), tabbable: true }],
        });
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
        let _self = this;
        moduleList.forEach(function (module) {
            _self.getInstance().modules.set(module.constructor.name, module);
        });
    }

    /**
     * Registers a new settings page
     * @param page ModalContent with the page data
     */
    public static addPage(page: TabContent) {
        //this.getInstance().modal.addPage(page);
    }

}
