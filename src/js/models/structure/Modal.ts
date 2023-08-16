import { Util } from "../../utility/Util";
import PreparedStructure from "./PreparedStructure";

export default class Modal {

    public static isReady = false;

    private id: string;
    private $modal: JQuery<HTMLElement>;

    // private config: ModalConfig;

    private triggers: ModalTrigger[] = [];
    private activeTrigger: JQuery<HTMLElement>;
    private triggersMulti: boolean;

    public isDisabled = false;
    public enable(): void { this.isDisabled = false; }
    public disable(): void { this.isDisabled = true; }
    public get isOpen() { return this.$modal.dialog("isOpen") }
    public set isOpen(open: boolean) { this.$modal.dialog(open ? "open" : "close"); }
    public open(): void { this.isOpen = true; }
    public close(): void { this.isOpen = false; }
    public toggle(): void { this.isOpen = !this.isOpen; }

    public constructor(config: ModalConfig) {
        this.id = Util.ID.make();
        config = this.validateConfig(config);

        this.triggersMulti = config.triggerMulti;
        this.isDisabled = config.disabled;

        // Create the DOM structure for the modal window
        this.$modal = $("<div>")
            .attr("title", config.title)
            .append(config.content)
            .dialog({
                autoOpen: config.autoOpen,
                appendTo: "#modal-container",

                resizable: false,

                width: config.width,
                height: config.height,
                minWidth: config.minWidth,
                minHeight: config.minHeight,
                maxWidth: config.maxWidth,
                maxHeight: config.maxHeight,

                closeOnEscape: config.escapable,

                position: {
                    my: config.position.my,
                    at: config.position.at,
                    of: "#modal-container",
                    within: "#modal-container",
                    // collision: "none",
                },

                classes: {
                    "ui-dialog": "bg-foreground border-section color-text",
                    "ui-dialog-titlebar": "color-text",
                    "ui-dialog-titlebar-close": "border-foreground",
                }
            });

        const ui = this.$modal.closest('.ui-dialog');
        ui
            .addClass("re621-ui-dialog")
            .removeClass("ui-dialog ui-widget ui-widget-content")
            .toggleClass("modal-reserve-height", config.reserveHeight)
            .draggable('option', 'containment', '#modal-container');

        // Replace the modal structure on window open, if necessary
        if (config.structure)
            this.$modal.one("dialogopen.lazyload", () => {
                this.$modal.html("");
                this.$modal.append(config.structure.render());
            });

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

        this.registerTrigger(config.triggers);
    }

    /**
     * Parses the configuration and sets the default values for missing entries
     * @param config Configuration to parse
     */
    private validateConfig(config: ModalConfig): ModalConfig {
        const result: ModalConfig = {};

        result.title = typeof config.title === "undefined" ? "Dialog" : config.title;
        result.autoOpen = typeof config.autoOpen === "undefined" ? false : config.autoOpen;
        result.triggers = typeof config.triggers === "undefined" ? [] : config.triggers;
        result.triggerMulti = typeof config.triggerMulti === "undefined" ? false : config.triggerMulti;

        result.content = typeof config.content === "undefined" ? $("") : config.content;
        result.structure = typeof config.structure === "undefined" ? null : config.structure;

        result.width = typeof config.width === "undefined" ? "auto" : config.width;
        result.height = typeof config.height === "undefined" ? "auto" : config.height;
        result.minWidth = typeof config.minWidth === "undefined" ? 150 : config.minWidth;
        result.minHeight = typeof config.minHeight === "undefined" ? 150 : config.minHeight;
        result.maxWidth = typeof config.maxWidth === "undefined" ? undefined : config.maxWidth;
        result.maxHeight = typeof config.minHeight === "undefined" ? undefined : config.maxHeight;

        result.fixed = config.fixed === true;
        result.reserveHeight = config.reserveHeight === true;
        result.escapable = config.escapable !== false;

        result.disabled = typeof config.disabled === "undefined" ? false : config.disabled;
        if (typeof config.position === "undefined") result.position = { my: "center", at: "center" };
        else
            result.position = {
                my: !config.position.my ? "center" : config.position.my,
                at: !config.position.at ? "center" : config.position.at,
            }

        return result;
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
    public registerTrigger(trigger: ModalTrigger | ModalTrigger[]): void {
        if (!trigger) return;
        else if (Array.isArray(trigger)) {
            for (const one of trigger) this.registerTrigger(one);
            return;
        }

        if (typeof trigger.event === "undefined") trigger.event = "click";
        if (this.triggers.length == 0) this.activeTrigger = trigger.element;
        this.triggers.push(trigger);

        trigger.element.on(trigger.event + ".re621.dialog-" + this.id, (event) => {
            if (this.isDisabled) return;
            event.preventDefault();

            const $target = $(event.currentTarget);
            if (this.triggersMulti && !this.activeTrigger.is($target) && this.isOpen) {
                this.toggle(); // TODO Update the modal window instead of toggling
            }
            this.activeTrigger = $target;

            this.toggle();
            return false;
        });
    }

    public clearTriggers(): void {
        for (const trigger of this.triggers)
            trigger.element.off(trigger.event + ".re621.dialog-" + this.id);
        this.triggers = [];
    }

    public getElement(): JQuery<HTMLElement> { return this.$modal; }


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
        return this.activeTrigger;
    }

}

interface ModalConfig {
    /** String displayed on top of the modal window */
    title?: string;

    /** Should the modal open on initialization */
    autoOpen?: boolean;

    /** Modal content, created on page load */
    content?: JQuery<HTMLElement>;
    /**
     * Optional. The modal content is replaced with this generated structure when the window is open.  
     * If used, the content parameter is used as a placeholder to properly size and center the window.
     */
    structure?: PreparedStructure;

    /** List of JQuery object & event name pairs that trigger the modal opening */
    triggers?: ModalTrigger | ModalTrigger[];
    /** Refreshes the modal instead of toggling it. Special case for HeaderCustomizer */
    triggerMulti?: boolean;

    width?: number | "auto";
    height?: number | "auto";
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    
    /** If true, the modal window has "position: fixed" style set. */
    fixed?: boolean;
    /** Sets the modal window to 80vh. Special case for the Settings modal */
    reserveHeight?: boolean; // TODO This really shouldn't be a thing
    /** If true, modal window is closed when the ESC key is pressed */
    escapable?: boolean;

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
