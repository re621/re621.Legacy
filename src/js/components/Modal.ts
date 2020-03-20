/**
 * Modal  
 * Creates adjustable windows of various shapes and sizes
 */
export class Modal {

    private static uid_iterator = 0;

    private config: ModalConfig;
    private $element: JQuery<HTMLElement>;

    private triggers: ModalTrigger[] = [];
    private $activeTrigger: JQuery<HTMLElement>;

    private index: number;

    /**
     * Creates a new Modal instance
     * @param config ModalConfig with the configuration
     */
    constructor(config: ModalConfig) {
        let _self = this;

        if (config.uid === undefined) config.uid = Modal.getUID() + "";
        if (config.title === undefined) config.title = "Modal";
        if (config.width === undefined) config.width = "auto";
        if (config.height === undefined) config.height = "auto";
        if (config.position === undefined) config.position = {};
        if (config.subtabbed === undefined) config.subtabbed = false;

        if (config.triggers === undefined) config.triggers = [];
        if (config.triggerMulti === undefined) config.triggerMulti = false;
        if (config.disabled === undefined) config.disabled = false;

        if (config.content === undefined) config.content = [];
        this.config = config;

        this.create();
        if (this.config.disabled) this.disable();

        this.config.triggers.forEach(function (trigger) {
            _self.registerTrigger(trigger);
        });
    }

    /**
     * Returns a "unique" ID for the modal
     * Unless there are collisions. Then it won't be unique.
     */
    private static getUID() {
        return this.uid_iterator++;
    }

    /**
     * Creates a modal based on the configuration
     */
    public create() {
        let _self = this;

        // Container
        this.$element = $("<re-modal>")
            .addClass("ui-draggable")
            .attr("data-open", "false")
            .css("width", this.config.width)
            .css("height", this.config.height);

        if (this.config.position.position != undefined) this.$element.css("position", this.config.position.position);
        if (this.config.position.left != undefined) this.$element.css("left", this.config.position.left);
        if (this.config.position.right != undefined) this.$element.css("right", this.config.position.right);
        if (this.config.position.top != undefined) this.$element.css("top", this.config.position.top);
        if (this.config.position.bottom != undefined) this.$element.css("bottom", this.config.position.bottom);

        // Side Tabs
        let $tabs = $("<re-modal-tabs>")
            .appendTo(this.$element);

        // Header
        let $header = $("<re-modal-header>")
            .addClass("bg-foreground")
            .appendTo(this.$element);

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

        $("re-modal-container").append(this.$element);
        this.$element.draggable({
            handle: "re-modal-header",
            containment: "parent",
            stack: "re-modal",
        });

        $(this.$element).trigger("modal:create", [this]);
    }

    /**
     * Destroys modal's DOM structure and disables triggers
     */
    public destroy() {
        this.$element.remove();
        this.disable();
    }

    /**
     * Listens to the specified element in order to trigger the modal
     * @param trigger Element-event pair to listen to
     */
    public registerTrigger(trigger: ModalTrigger) {
        let _self = this;

        if (trigger.event === undefined) trigger.event = "click";
        if (this.triggers.length == 0) this.$activeTrigger = trigger.element;
        this.triggers.push(trigger);

        trigger.element.on(trigger.event, function (event) {
            if (_self.isDisabled()) return;

            let $target = $(event.currentTarget);
            if (_self.config.triggerMulti && !_self.$activeTrigger.is($target) && _self.isVisible()) {
                _self.toggle(); // Update the modal window instead of toggling
            }
            _self.$activeTrigger = $target;

            event.preventDefault();
            _self.toggle();
        });
    }

    /**
     * Toggles the visibility of the modal
     */
    public toggle() {
        if (this.isVisible()) this.setHidden();
        else this.setShown();
        $(this.$element).trigger("modal:toggle", [this]);
    }

    /**
     * Returns true if the modal is visible
     * @returns boolean True if the modal is visible, false otherwise
     */
    public isVisible() {
        return this.$element.attr("data-open") == "true";
    }

    /**
     * Set the modal to be visible
     */
    public setShown() {
        this.$element.attr("data-open", "true");
    }

    /**
     * Set the modal to be hidden
     */
    public setHidden() {
        this.$element.attr("data-open", "false");
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
        this.$activeTrigger = this.triggers[0].element;  // Reset to default state
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
        return this.$element;
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
            .appendTo(this.$element);
        if (this.index == 0) { modalTabInput.attr("checked", "checked"); }
        let modalTabLabel = $("<label>")
            .attr("for", "tab-" + this.config.uid + "-" + this.index)
            .addClass("re-modal-tab-label")
            .html(content.name)
            .appendTo(this.$element);
        let modalTabContent = $("<div>")
            .addClass("re-modal-tab-content")
            .addClass("bg-highlight")
            .append(content.page)
            .appendTo(this.$element);
        if (content.tabbable) { modalTabContent.addClass("subtabbed"); }

        if (this.index == 0) { this.$element.find("label.re-modal-tab-label").css("display", "none"); }
        else { this.$element.find("label.re-modal-tab-label").css("display", ""); }

        this.index++;
    }

}

interface ModalConfig {
    /** Modal ID. Must be unique, or things will break. */
    uid?: string,
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

    /** Element that triggers the modal to appear */
    triggers?: ModalTrigger[],
    /** If true, updates the window when clicking on a trigger different from original */
    triggerMulti?: boolean,

    /** If true, prevents the modal from being triggered */
    disabled?: boolean,

    /** List of elements with the modal content. */
    content?: TabContent[],
}

interface ModalPosition {
    position?: "absolute" | "fixed",
    left?: string,
    right?: string,
    top?: string,
    bottom?: string
}

interface ModalTrigger {
    /** Query selector containing a trigger - or a collection of triggers */
    element: JQuery<HTMLElement>,
    /** Event that the trigger should respond to */
    event?: string,
}

export interface TabContent {
    /** Tab name. If there is only one tab, does nothing. */
    name: string,
    /** JQuery element with the modal contents */
    page: JQuery<HTMLElement>,
    /** If true, strips the top margins so that a Tabbed object could be fitted in it */
    tabbable?: boolean,
}
