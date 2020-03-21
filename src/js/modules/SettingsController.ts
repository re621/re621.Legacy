import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal, TabContent } from "../components/Modal";
import { Tabbed } from "../components/Tabbed";
import { RE6Module } from "../components/RE6Module";
import { Miscellaneous } from "./Miscellaneous";
import { Form } from "../utilities/Form";

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
        let miscSettingsTab = this.createTabMiscellaneous();

        let $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Miscellaneous", page: miscSettingsTab.get() },
                // { name: "Header", page: $headerSettings },
                // { name: "Posts", page: $postSettings },
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

        // Establish handlers
        this.handleTabMiscellaneous(miscSettingsTab);

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

    /**
     * Creates the DOM for the miscellaneous settings page
     */
    private createTabMiscellaneous() {
        let _self = this;
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
                }
            ]
        );

        return form;
    }

    /**
     * Event handlers for the miscellaneous settings page
     * @param form Miscellaneous settings form
     */
    private handleTabMiscellaneous(form: Form) {
        let _self = this;
        let miscFormInput = form.getInputList();

        miscFormInput.get("redesign-fixes").change(function (event) {
            let enabled = $(this).is(":checked");
            let miscModule = <Miscellaneous>_self.modules.get("Miscellaneous");
            miscModule.pushSettings("loadRedesignFixes", enabled);

            if (enabled) { miscModule.enableRedesignFixes(); }
            else { miscModule.disableRedesignFixes(); }
        });
    }

}
