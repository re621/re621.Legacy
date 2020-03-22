
export class Modal {

    private config: ModalConfig;
    private $modal: JQuery<HTMLElement>;

    private triggers: ModalTrigger[] = [];
    private $activeTrigger: JQuery<HTMLElement>;

    public constructor(config: ModalConfig) {
        let _self = this;
        this.config = this.validateConfig(config);

        this.$modal = $("<div>")
            .appendTo("re-modal-container")
            .attr("title", config.title)
            .append(this.config.content)
            .dialog({
                autoOpen: false,
                appendTo: "re-modal-container",
                position: {
                    my: config.position.my,
                    at: config.position.at,
                    of: "re-modal-container",
                    within: "re-modal-container",
                    collision: "fit",
                },
            });
        this.$modal.dialog("widget")
            .draggable({ containment: "parent", })
            .resizable({ containment: "parent", });

        config.triggers.forEach(function (trigger) {
            _self.registerTrigger(trigger);
        });

    }

    /**
     * Parses the configuration and sets the default values for missing entries
     * @param config Configuration to parse
     */
    private validateConfig(config: ModalConfig) {
        if (config.title === undefined) config.title = "Dialog";
        if (config.content === undefined) config.content = $("<span>. . .</span>");
        if (config.triggers === undefined) config.triggers = [];
        if (config.triggerMulti === undefined) config.triggerMulti = false;

        if (config.disabled === undefined) config.disabled = false;
        if (config.position === undefined) config.position = { my: "center", at: "center" };

        return config;
    }

    /**
     * Appends more content to the modal
     * @param $content Content to add
     */
    public addContent($content: JQuery<HTMLElement>) {
        this.$modal.append($content);
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
            if (_self.config.triggerMulti && !_self.$activeTrigger.is($target) && _self.isOpen()) {
                _self.toggle(); // Update the modal window instead of toggling
            }
            _self.$activeTrigger = $target;

            event.preventDefault();
            _self.toggle();
        });
    }

    public getElement() { return this.$modal; }

    /** Togle the modal visibility */
    public toggle() {
        if (this.isOpen()) this.close();
        else this.open();
    }
    public isOpen() { return this.$modal.dialog("isOpen"); }
    public open() { return this.$modal.dialog("open"); }
    public close() { return this.$modal.dialog("close"); }

    public isDisabled() { return this.config.disabled; }
    public enable() { this.config.disabled = false; }
    public disable() { this.config.disabled = true; }

    public destroy() { this.$modal.dialog("destroy"); }

    /**
     * Returns the element that triggered the modal
     * @returns JQuery<HTMLElement> trigger
     */
    public getActiveTrigger() {
        return this.$activeTrigger;
    }

}

interface ModalConfig {
    title?: string,
    content?: JQuery<HTMLElement>,
    triggers?: ModalTrigger[],
    triggerMulti?: boolean,

    disabled?: boolean,
    position?: {
        at: string,
        my: string,
    }
}

interface ModalTrigger {
    /** Query selector containing a trigger - or a collection of triggers */
    element: JQuery<HTMLElement>,
    /** Event that the trigger should respond to */
    event?: string,
}
