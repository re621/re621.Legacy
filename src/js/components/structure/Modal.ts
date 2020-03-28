
export class Modal {

    private uid: number;

    private config: ModalConfig;
    private $modal: JQuery<HTMLElement>;

    private triggers: ModalTrigger[] = [];
    private $activeTrigger: JQuery<HTMLElement>;

    public constructor(config: ModalConfig) {
        this.uid = Math.round(new Date().getTime() + (Math.random() * 100));
        this.config = this.validateConfig(config);

        this.$modal = $("<div>")
            .appendTo("re-modal-container")
            .attr("title", config.title)
            .append(this.config.content)
            .dialog({
                autoOpen: false,
                appendTo: "re-modal-container",

                closeOnEscape: config.escapable,
                draggable: config.draggable,
                resizable: config.resizable,

                width: "auto",
                minWidth: config.minWidth,
                minHeight: config.minHeight,

                position: {
                    my: config.position.my,
                    at: config.position.at,
                    of: "re-modal-container",
                    within: "re-modal-container",
                    collision: "none",
                }
            });

        this.$modal.dialog("widget")
            .addClass("re621-ui-dialog")
            .removeClass("ui-dialog")
            .draggable({
                disabled: !config.draggable,
                containment: "parent"
            })
            .resizable({
                disabled: !config.resizable,
                containment: "parent"
            });

        if (config.fixed) {
            let widget = this.$modal.dialog("widget");
            widget.addClass("modal-fixed");

            this.$modal.dialog(
                "option",
                "position",
                {
                    my: config.position.my,
                    at: config.position.at,
                    of: window,
                    within: "re-modal-container",
                    collision: "none",
                }
            );

            widget.draggable("option", "containment", "window");
            widget.resizable("option", "containment", "window");

            let timer: number = 0,
                left = widget.css("left"),
                top = widget.css("top");

            let style = $("<style>")
                .attr("id", "style-" + this.uid)
                .attr("type", "text/css")
                .html(`
                    .modal-fixed-` + this.uid + ` {
                        left: ` + left + ` !important;
                        top: ` + top + ` !important;
                    }`
                )
                .appendTo("head");

            $(window).scroll((event) => {
                if (timer) clearTimeout(timer);
                else {
                    left = widget.css("left");
                    top = widget.css("top");
                    style.html(`
                        .modal-fixed-` + this.uid + ` {
                            left: ` + left + ` !important;
                            top: ` + top + ` !important;
                        }`
                    );
                    widget.addClass("modal-fixed-" + this.uid);
                }
                timer = window.setTimeout(() => {
                    timer = 0;
                    widget.removeClass("modal-fixed-" + this.uid);
                    widget.css("left", left);
                    widget.css("top", top);
                }, 500);
            });
        }

        if (config.reserveHeight) {
            this.$modal.dialog("widget").addClass("modal-reserve-height");
        }

        for (const trigger of config.triggers) {
            this.registerTrigger(trigger);
        }
    }

    /** Returns this modal's unique ID */
    public getUID() {
        return this.uid;
    }

    /**
     * Parses the configuration and sets the default values for missing entries
     * @param config Configuration to parse
     */
    private validateConfig(config: ModalConfig) {
        if (config.title === undefined) config.title = "Dialog";
        if (config.content === undefined) config.content = $("");
        if (config.triggers === undefined) config.triggers = [];
        if (config.triggerMulti === undefined) config.triggerMulti = false;

        if (config.escapable === undefined) config.escapable = true;
        if (config.draggable === undefined) config.draggable = true;
        if (config.resizable === undefined) config.resizable = false;

        if (config.minWidth === undefined) config.minWidth = 150;
        if (config.minHeight === undefined) config.minHeight = 150;
        if (config.fixed === undefined) config.fixed = false;
        if (config.reserveHeight === undefined) config.reserveHeight = false;

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

        if (trigger.event === undefined) trigger.event = "click";
        if (this.triggers.length == 0) this.$activeTrigger = trigger.element;
        this.triggers.push(trigger);

        trigger.element.on(trigger.event, event => {
            if (this.isDisabled()) return;

            let $target = $(event.currentTarget);
            if (this.config.triggerMulti && !this.$activeTrigger.is($target) && this.isOpen()) {
                this.toggle(); // Update the modal window instead of toggling
            }
            this.$activeTrigger = $target;

            event.preventDefault();
            this.toggle();
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

    /**
     * Completely and irreversibly destorys the modal window
     */
    public destroy() {
        this.$modal.dialog("destroy");
        this.$modal.remove();
    }

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

    escapable?: boolean,
    resizable?: boolean,
    draggable?: boolean,

    minWidth?: number,
    minHeight?: number,
    fixed?: boolean,
    reserveHeight?: boolean,

    disabled?: boolean,
    position?: {
        at: string,
        my: string,
    };
}

interface ModalTrigger {
    /** Query selector containing a trigger - or a collection of triggers */
    element: JQuery<HTMLElement>,
    /** Event that the trigger should respond to */
    event?: string,
}
