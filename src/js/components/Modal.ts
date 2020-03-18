/**
 * Modal  
 * Creates adjustable windows of various shapes and sizes
 */
export class Modal {

    private config: ModalConfig;
    private $modal: JQuery<HTMLElement>;
    private $activeTrigger: JQuery<HTMLElement>;

    private index: number;

    /**
     * Creates a new Modal instance
     * @param config ModalConfig with the configuration
     */
    constructor(config: ModalConfig) {
        let _self = this;

        if (config.title == undefined) config.title = "Modal";
        if (config.width == undefined) config.title = "auto";
        if (config.height == undefined) config.height = "auto";
        if (config.position == undefined) config.position = {};
        if (config.subtabbed == undefined) config.subtabbed = false;

        if (config.triggerEvent == undefined) config.triggerEvent = "click";
        if (config.triggerMulti == undefined) config.triggerMulti = false;
        if (config.disabled == undefined) config.disabled = false;

        if (config.content == undefined) config.content = [];
        this.config = config;

        this.create();
        this.$activeTrigger = this.config.trigger;

        if (this.config.disabled) this.disable();

        this.registerTrigger(this.config.trigger);
    }

    /**
     * Creates a modal based on the configuration
     */
    private create() {
        let _self = this;

        // Container
        this.$modal = $("<re-modal>")
            .addClass("ui-draggable")
            .attr("data-open", "false")
            .css("width", this.config.width)
            .css("height", this.config.height);

        if (this.config.position.left != undefined) this.$modal.css("left", this.config.position.left);
        if (this.config.position.right != undefined) this.$modal.css("right", this.config.position.right);
        if (this.config.position.top != undefined) this.$modal.css("top", this.config.position.top);
        if (this.config.position.bottom != undefined) this.$modal.css("bottom", this.config.position.bottom);

        // Side Tabs
        let $tabs = $("<re-modal-tabs>")
            .appendTo(this.$modal);

        // Header
        let $header = $("<re-modal-header>")
            .addClass("bg-foreground")
            .appendTo(this.$modal);

        let $title = $("<div>")
            .addClass("re-modal-title")
            .html(this.config.title)
            .appendTo($header);

        let $closeButton = $("<a>")
            .attr("href", "#")
            .addClass("re-modal-close")
            .html(`<i class="fas fa-times"></i>`)
            .appendTo($header);

        $closeButton.click(function (event) {
            event.preventDefault();
            _self.toggle();
        });

        // Content
        this.config.content.forEach(function (entry) {
            _self.addContent(entry);
        });

        let $tabList = $tabs.find("a");
        $tabList.first().click();

        if ($tabList.length == 1) { $tabs.css("display", "none"); }

        $("re-modal-container").append(this.$modal);
        this.$modal.draggable({
            handle: "re-modal-header",
            containment: "parent",
            stack: "re-modal",
        });

        $(this.$modal).trigger("modal:create", [this]);
    }

    /**
     * Pre-toggle logic. Triggered by an event listener
     * @param event Event
     */
    private handleTriggerEvent(context, event) {
        if (context.isDisabled()) return;

        let $target = $(event.currentTarget);
        if (context.config.triggerMulti && !context.$activeTrigger.is($target) && context.isVisible()) {
            context.toggle(); // Update the modal window instead of toggling
        }
        context.$activeTrigger = $target;

        event.preventDefault();
        context.toggle();
    }

    /**
     * Listens to the specified element in order to trigger the modal
     * @param element Element to listen to
     */
    public registerTrigger(element: JQuery<HTMLElement>) {
        let context = this;
        element.on(this.config.triggerEvent, function (event) {
            context.handleTriggerEvent(context, event);
        });
    }

    /**
     * Toggles the visibility of the modal
     */
    public toggle() {
        if (this.isVisible()) this.setHidden();
        else this.setShown();
        $(this.$modal).trigger("modal:toggle", [this]);
    }

    /**
     * Returns true if the modal is visible
     * @returns boolean True if the modal is visible, false otherwise
     */
    public isVisible() {
        return this.$modal.attr("data-open") == "true";
    }

    /**
     * Set the modal to be visible
     */
    public setShown() {
        this.$modal.attr("data-open", "true");
    }

    /**
     * Set the modal to be hidden
     */
    public setHidden() {
        this.$modal.attr("data-open", "false");
    }

    /**
     * Returns true if the modal trigger is disabled
     */
    public isDisabled() {
        return this.config.disabled;
    }

    /**
     * Enable the modal trigger
     */
    public enable() {
        this.config.disabled = false;
        this.$activeTrigger = this.config.trigger;  // Reset to default state
    }

    /**
     * Disable the modal trigger
     */
    public disable() {
        this.config.disabled = true;
    }

    /**
     * Returns the modal JQuery element
     * @returns JQuery<HTMLElement> modal
     */
    public getModal() {
        return this.$modal;
    }

    /**
     * Returns the element that triggered the modal
     * @returns JQuery<HTMLElement> trigger
     */
    public getActiveTrigger() {
        return this.$activeTrigger;
    }

    /**
     * Adds a new tab with content to the modal
     * @param content Tab content
     */
    public addContent(content: TabContent) {
        if (this.index == undefined) this.index = 0;

        let modalTabInput = $("<input>")
            .attr("name", this.config.uid)
            .attr("type", "radio")
            .attr("id", "tab-" + this.config.uid + "-" + this.index)
            .addClass("re-modal-tab-input")
            .appendTo(this.$modal);
        if (this.index == 0) { modalTabInput.attr("checked", "checked"); }
        let modalTabLabel = $("<label>")
            .attr("for", "tab-" + this.config.uid + "-" + this.index)
            .addClass("re-modal-tab-label")
            .html(content.name)
            .appendTo(this.$modal);
        let modalTabContent = $("<div>")
            .addClass("re-modal-tab-content")
            .addClass("bg-highlight")
            .append(content.page)
            .appendTo(this.$modal);
        if (content.tabbable) { modalTabContent.addClass("subtabbed"); }

        if (this.index == 0) { this.$modal.find("label.re-modal-tab-label").css("display", "none"); }
        else { this.$modal.find("label.re-modal-tab-label").css("display", ""); }

        this.index++;
    }

}

interface ModalConfig {
    /** Unique modal ID */
    uid: string,
    /** Title displayed in the modal header */
    title?: string,
    /** Modal width (pixels, em, percent). Defaults to 50% */
    width?: string,
    /** Modal height (pixels, em, percent). Defaults to 200px */
    height?: string,
    /** Modal position object. Should only use two values. */
    position?: ModalPosition,

    /** If true, removes the top padding to make subtabs easier */
    subtabbed?: boolean,

    /** Element - link or button - that triggers the element */
    trigger: JQuery<HTMLElement>,
    /** Event type that triggeres the modal */
    triggerEvent?: string,
    /** If true, updates the window when clicking on a trigger different from original */
    triggerMulti?: boolean,

    /** If true, prevents the modal from being triggered */
    disabled?: boolean,

    /** List of elements with the modal content. Should have at least one. */
    content?: TabContent[]
}

interface ModalPosition {
    left?: string,
    right?: string,
    top?: string,
    bottom?: string
}

export interface TabContent {
    /** Tab name. If there is only one tab, does nothing. */
    name: string,
    /** JQuery element with the modal contents */
    page: JQuery<HTMLElement>,
    /** If true, strips the top margins so that a Tabbed object could be fitted in it */
    tabbable?: boolean,
}
