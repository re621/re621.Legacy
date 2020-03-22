import { HeaderCustomizer } from "./HeaderCustomizer";
import { Modal } from "../components/Modal";
import { Tabbed, TabContent } from "../components/Tabbed";
import { RE6Module } from "../components/RE6Module";
import { Miscellaneous } from "./Miscellaneous";
import { Form } from "../utilities/Form";
import { TitleCustomizer } from "./TitleCustomizer";

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
        let titleCustomizerTab = this.createTabTitleCustomizer();
        let miscSettingsTab = this.createTabMiscellaneous();

        let $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "TitleCustomizer", page: titleCustomizerTab.get() },
                { name: "Miscellaneous", page: miscSettingsTab.get() },
                // { name: "Posts", page: $postSettings },
            ]
        });

        // Create the modal
        this.modal = new Modal({
            title: "Settings",
            triggers: [{ element: addSettingsButton.link }],
            content: $settings.create(),
            position: { my: "right top", at: "right top" }
        });

        // Establish handlers
        this.handleTabMiscellaneous(miscSettingsTab);
        this.handleTabTitleCustomizer(titleCustomizerTab);
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

    /** Create the DOM for the Title Customizer page */
    private createTabTitleCustomizer() {
        let _self = this;
        let module = <TitleCustomizer>this.modules.get("TitleCustomizer");

        let form = new Form(
            {
                id: "title-customizer-misc",
                columns: 2,
                parent: "re-modal-container",
            },
            [
                {
                    id: "template",
                    type: "input",
                    value: module.fetchSettings("template"),
                    label: "Template",
                    class: "full-width",
                },
                {
                    id: "symbols-enabled",
                    type: "checkbox",
                    value: module.fetchSettings("symbolsEnabled"),
                    label: "Vote / Favorite Icons",
                },
                {
                    id: "symbol-fav",
                    type: "input",
                    value: module.fetchSettings("symbol-fav"),
                    label: "Favorite",
                },
                {
                    id: "symbol-spacer-1",
                    type: "div",
                    value: "",
                    label: "",
                },
                {
                    id: "symbol-voteup",
                    type: "input",
                    value: module.fetchSettings("symbol-voteup"),
                    label: "Upvote",
                },
                {
                    id: "symbol-spacer-2",
                    type: "div",
                    value: "",
                    label: "",
                },
                {
                    id: "symbol-votedown",
                    type: "input",
                    value: module.fetchSettings("symbol-votedown"),
                    label: "Downvote",
                },
            ]
        );

        return form;
    }

    /**
     * Event handlers for the title customizer settings page
     * @param form Miscellaneous settings form
     */
    private handleTabTitleCustomizer(form: Form) {
        let _self = this;
        let module = <TitleCustomizer>this.modules.get("TitleCustomizer");
        let titleFormInput = form.getInputList();

        titleFormInput.get("template").change(function (event) {
            module.pushSettings("template", $(this).val());
        });

        titleFormInput.get("symbols-enabled").change(function (event) {
            module.pushSettings("symbolsEnabled", $(this).is(":checked"));
        });

        titleFormInput.get("symbol-fav").change(function (event) {
            module.pushSettings("symbol-fav", $(this).val());
        });

        titleFormInput.get("symbol-voteup").change(function (event) {
            module.pushSettings("symbol-voteup", $(this).val());
        });

        titleFormInput.get("symbol-votedown").change(function (event) {
            module.pushSettings("symbol-votedown", $(this).val());
        });
    }

    /** Creates the DOM for the miscellaneous settings page */
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
