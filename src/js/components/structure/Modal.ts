import { Util } from "../utility/Util";
import { PreparedStructure } from "./PreparedStructure";

export class Modal {

    private id: string;

    private config: ModalConfig;
    private $modal: JQuery<HTMLElement>;

    private triggers: ModalTrigger[] = [];
    private $activeTrigger: JQuery<HTMLElement>;

    public constructor(config: ModalConfig) {
        this.id = Util.ID.make();
        this.config = this.validateConfig(config);

        // Create the DOM structure for the modal window
        this.$modal = $("<div>")
            .addClass(config.wrapperClass)
            .attr("title", config.title)
            .append(this.config.content)
            .appendTo("div#modal-container")
            .dialog({
                autoOpen: false,
                appendTo: "#modal-container",

                closeOnEscape: config.escapable,
                draggable: config.draggable,
                resizable: false,
                // resizable: config.resizable,

                width: "auto",
                minWidth: config.minWidth,
                minHeight: config.minHeight,

                position: {
                    my: config.position.my,
                    at: config.position.at,
                    of: $("#modal-container"),
                    within: $("#modal-container"),
                    collision: "none",
                },

                classes: {
                    "ui-dialog": "bg-foreground border-section color-text",
                    "ui-dialog-titlebar": "color-text",
                    "ui-dialog-titlebar-close": "border-foreground",
                }
            });

        // Initialize JQueryUI functionality
        this.$modal.dialog("widget")
            .addClass("re621-ui-dialog")
            .removeClass("ui-dialog ui-widget ui-widget-content")
            .toggleClass("modal-reserve-height", config.reserveHeight)
            /*
            .resizable({
                disabled: !config.resizable,
                containment: "parent"
            })
            */
            .draggable({
                disabled: !config.draggable,
                containment: "parent"
            });

        // Replace the modal structure on window open, if necessary
        if (config.structure) {
            let modalOpened = false;
            this.$modal.on("dialogopen", () => {
                if (modalOpened) return;
                modalOpened = true;
                this.$modal.html("");
                this.$modal.append(config.structure.render());
            });
        }

        // Fix resizing and dragging issue with the "position: fixed"
        // This code is terrible, and should be fixed by a braver soul than I
        if (config.fixed) {
            const widget = this.$modal.dialog("widget");
            widget.addClass("modal-fixed");

            this.$modal.dialog(
                "option",
                "position",
                {
                    my: config.position.my,
                    at: config.position.at,
                    of: window,
                    within: "div#modal-container",
                    collision: "none",
                }
            );

            widget.draggable("option", "containment", "window");
            // widget.resizable("option", "containment", "window");

            let timer = 0,
                left = widget.css("left"),
                top = widget.css("top");

            const style = $("<style>")
                .attr({
                    "id": "style-" + this.id,
                    "type": "text/css"
                })
                .html(`
                    .modal-fixed-${this.id} {
                        left: ${left} !important;
                        top: ${top} !important;
                    }
                `)
                .appendTo("head");

            // This effectively clamps down the modal position while scrolling
            // Without this, the modal gets run off the screen for some reason
            $(window).on("scroll", () => {
                if (timer) clearTimeout(timer);
                else {
                    left = widget.css("left");
                    top = widget.css("top");
                    style.html(`
                        .modal-fixed-${this.id} {
                            left: ${left} !important;
                            top: ${top} !important;
                        }
                    `);
                    widget.addClass("modal-fixed-" + this.id);
                }
                timer = window.setTimeout(() => {
                    timer = 0;
                    widget.removeClass("modal-fixed-" + this.id);
                    widget.css("left", left);
                    widget.css("top", top);
                }, 500);
            });
        }

        for (const trigger of config.triggers)
            this.registerTrigger(trigger);
    }

    /**
     * Parses the configuration and sets the default values for missing entries
     * @param config Configuration to parse
     */
    private validateConfig(config: ModalConfig): ModalConfig {
        if (config.title === undefined) config.title = "Dialog";
        if (config.content === undefined) config.content = $("");
        if (config.triggers === undefined) config.triggers = [];
        if (config.triggerMulti === undefined) config.triggerMulti = false;

        if (config.escapable === undefined) config.escapable = true;
        if (config.draggable === undefined) config.draggable = true;
        // if (config.resizable === undefined) config.resizable = false;

        if (config.minWidth === undefined) config.minWidth = 150;
        if (config.minHeight === undefined) config.minHeight = 150;
        if (config.fixed === undefined) config.fixed = false;
        if (config.reserveHeight === undefined) config.reserveHeight = false;

        if (config.wrapperClass === undefined) config.wrapperClass = "";

        if (config.disabled === undefined) config.disabled = false;
        if (config.position === undefined) config.position = { my: "center", at: "center" };

        return config;
    }

    /**
     * Appends more content to the modal
     * @param $content Content to add
     */
    public addContent($content: JQuery<HTMLElement>): void {
        this.$modal.append($content);
    }

    /**
     * Sets the modal content
     * @param $content Content to add
     */
    public setContent($content: JQuery<HTMLElement>): void {
        this.$modal.html("");
        this.$modal.append($content);
    }

    /**
     * Listens to the specified element in order to trigger the modal
     * @param trigger Element-event pair to listen to
     */
    public registerTrigger(trigger: ModalTrigger): void {

        if (trigger.event === undefined) trigger.event = "click";
        if (this.triggers.length == 0) this.$activeTrigger = trigger.element;
        this.triggers.push(trigger);

        trigger.element.on(trigger.event, (event) => {
            if (this.isDisabled()) return;

            const $target = $(event.currentTarget);
            if (this.config.triggerMulti && !this.$activeTrigger.is($target) && this.isOpen()) {
                this.toggle(); // Update the modal window instead of toggling
            }
            this.$activeTrigger = $target;

            event.preventDefault();
            this.toggle();
            return false;
        });
    }

    public getElement(): JQuery<HTMLElement> { return this.$modal; }

    /** Toggle the modal visibility */
    public toggle(): void {
        if (this.isOpen()) this.close();
        else this.open();
    }
    public isOpen(): boolean { return this.$modal.dialog("isOpen"); }
    public open(): JQuery<HTMLElement> { return this.$modal.dialog("open"); }
    public close(): JQuery<HTMLElement> { return this.$modal.dialog("close"); }

    public isDisabled(): boolean { return this.config.disabled; }
    public enable(): void { this.config.disabled = false; }
    public disable(): void { this.config.disabled = true; }

    /**
     * Completely and irreversibly destroys the modal window
     */
    public destroy(): void {
        this.$modal.dialog("destroy");
        this.$modal.remove();
    }

    /**
     * Returns the element that triggered the modal
     * @returns JQuery<HTMLElement> trigger
     */
    public getActiveTrigger(): JQuery<HTMLElement> {
        return this.$activeTrigger;
    }

}

interface ModalConfig {
    /** String displayed on top of the modal window */
    title?: string;

    /** Modal content, created on page load */
    content?: JQuery<HTMLElement>;
    /**
     * Optional. The modal content is replaced with this generated structure when the window is open.  
     * If used, the content parameter is used as a placeholder to properly size and center the window.
     */
    structure?: PreparedStructure;

    /** List of JQuery object & event name pairs that trigger the modal opening */
    triggers?: ModalTrigger[];
    /** Refreshes the modal instead of toggling it. Special case for HeaderCustomizer */
    triggerMulti?: boolean;

    /** If true, modal window is closed when the ESC key is pressed */
    escapable?: boolean;
    /** Users can resize the window at will. Glitchy. */
    // resizable?: boolean;
    /** Users can drag the window around the screen. Glitchy when used with "fixed" option. */
    draggable?: boolean;

    /** Minimum modal window width, in pixels */
    minWidth?: number;
    /** Minimum modal window width, in pixels */
    minHeight?: number;
    /** If true, the modal window has "position: fixed" style set. */
    fixed?: boolean;
    /** Sets the modal window to 80vh. Special case for the Settings modal */
    reserveHeight?: boolean;

    /** Additional class added to the window */
    wrapperClass?: string;

    /** If true, triggers are disabled */
    disabled?: boolean;
    /** Initial position of the modal window */
    position?: {
        at: string;
        my: string;
    };
}

interface ModalTrigger {
    /** Query selector containing a trigger - or a collection of triggers */
    element: JQuery<HTMLElement>;
    /** Event that the trigger should respond to */
    event?: string;
}
