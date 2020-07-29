import { XM } from "../api/XM";
import { Hotkeys } from "../data/Hotkeys";
import { Util } from "../utility/Util";
import { PreparedStructure } from "./PreparedStructure";

/**
 * Form Engine v.2.0  
 * Simplifies the process of creating complex, visually consistent forms.
 */
export class Form implements PreparedStructure {

    private static inputTimeout = 500;          // Typing timeout on text input fields

    private created: boolean;                   // Used for caching, true if get() has been called before
    private element: JQuery<HTMLElement>;       // DOM element for the form
    private content: FormElement[];            // Array of form elements

    private inputList: Map<string, JQuery<HTMLElement>>;

    /**
     * Prepares the form structure and settings.  
     * Use `get()` to return an actual DOM element.
     * @param options Form options
     * @param content Form elements
     * @param onSubmit Form submittion callback
     */
    public constructor(options?: SectionOptions, content?: FormElement[], onSubmit?: FormSubmitEvent) {
        if (!options.name) options.name = Util.makeUniqueID();
        if (!options.columns) options.columns = 1;
        if (!options.width) options.width = options.columns;

        this.element = $("<form>")
            .addClass("form-section" + (options.wrapper ? " " + options.wrapper : ""))
            .attr({
                "id": options.name,
                "columns": options.columns !== 1 ? options.columns : null,
                "formspan": options.width !== 1 ? options.width : null,
            })
            .on("submit", (event) => {
                event.preventDefault();
                const values = {};
                this.inputList.forEach((input, name) => {
                    values[name] = input.val().toString();
                });
                onSubmit(values, this);
            });

        this.content = content;
        this.inputList = new Map();
    }

    /**
     * Builds and returns the form DOM element
     * @param force If true, ignores any cached data and rebuilds the structure from scratch
     */
    public render(force = false): JQuery<HTMLElement> {
        if (this.created && !force) { return this.element; }

        // Build form elements
        this.element[0].innerHTML = "";
        const formID = this.element.attr("id");

        for (const entry of this.content) {
            for (const childElem of entry.build(formID, force))
                childElem.appendTo(this.element);
        }

        // Compile input lists
        for (const entry of this.content) {
            for (const input of entry.getInputs()) {
                const name = input.attr("name");
                if (name !== undefined)
                    this.inputList.set(name, input);
            }
        }

        // Return the form element
        this.created = true;
        return this.element;
    }

    /**
     * Resets the elements to their default values.  
     * Does not include buttons and submit elements
     */
    public reset(): void {
        this.inputList.forEach((input) => {
            const defval = input.attr("defval");
            if (defval !== undefined)
                input.val(defval);
        });
    }

    /**
     * Returns a list of elements in the form.  
     * If no parameter is specified, returns all inputs
     * @param names Names of inputs to return
     */
    public getInputList(...names: string[]): Map<string, JQuery<HTMLElement>> {
        if (names.length == 0) { return this.inputList; }
        const results: Map<string, JQuery<HTMLElement>> = new Map();

        this.inputList.forEach((input, name) => {
            if (names.includes(name)) results.set(name, input);
        });

        return results;
    }

    /**
     * An empty, placeholder form. Used to properly space out and center modals
     * @param width Form width
     */
    public static placeholder(width = 1): JQuery<HTMLElement> {
        return new Form(
            { columns: width, width: width },
            [Form.spacer(width)]
        ).render();
    }

    /**
     * Creates a form section FormElement based on the provided parameters  
     * @param options Section configuration
     * @param content Form elements
     */
    public static section(options?: SectionOptions, content?: FormElement[]): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();
        if (!options.columns) options.columns = 1;
        if (!options.width) options.width = options.columns;

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = $("<form-section>")
            .toggleClass(options.wrapper, options.wrapper)
            .attr({
                "id": options.name,
                "labeled": options.label !== undefined ? "" : null,
                "columns": options.columns !== 1 ? options.columns : null,
                "colspan": options.width !== 1 ? options.width : null,
            });

        return new FormElement($element, undefined, $label, content);
    }

    /**
     * Creates a collapsable section FormElement based on the provided parameters  
     * @param options Section configuration
     * @param content Form elements
     */
    public static accordion(options?: SectionOptions & { active?: boolean | number; collapsible?: boolean }, content?: FormAccordionElement[]): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();
        if (!options.columns) options.columns = 1;
        if (!options.width) options.width = options.columns;

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = $("<form-accordion>")
            .toggleClass(options.wrapper, options.wrapper)
            .attr({
                "id": options.name,
                "labeled": options.label !== undefined ? "" : null,
                "columns": options.columns !== 1 ? options.columns : null,
                "colspan": options.width !== 1 ? options.width : null,
            });

        return new FormElement($element, undefined, $label, content, undefined, (postElement) => {
            postElement.accordion({
                active: options.active,
                animate: false,
                collapsible: options.collapsible === true,
                header: "form-header",
            });

            // Accordions fail to properly show visible elements
            postElement.find("form-section[aria-hidden=false]").css("display", "");
        });
    }

    public static accordionTab(options?: SectionOptions & { badge?: JQuery<HTMLElement>; subheader?: string }, content?: FormElement[]): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();
        if (!options.columns) options.columns = 1;
        if (!options.width) options.width = options.columns;

        const $label = $("<form-header>")
            .attr("for", options.name)
            .html(options.label || "TITLE_ERROR");

        if (options.subheader)
            $("<span>")
                .addClass("form-collapse-subheader")
                .append(options.subheader)
                .appendTo($label);

        if (options.badge)
            $("<span>")
                .addClass("form-collapse-badge")
                .append(options.badge)
                .appendTo($label);

        const $element = $("<form-section>")
            .addClass("collapse-content")
            .attr({
                "id": options.name,
                "labeled": options.label !== undefined ? "" : null,
                "columns": options.columns !== 1 ? options.columns : null,
                "colspan": options.width !== 1 ? options.width : null,
            });

        return new FormElement($element, undefined, $label, content);
    }

    /**
     * Creates a collapsable section FormElement based on the provided parameters  
     * @param options Section configuration
     * @param content Form elements
     */
    public static collapse(options?: SectionOptions & { title?: string; badge?: JQuery<HTMLElement>; collapsed?: boolean }, content?: FormElement[]): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();
        if (!options.columns) options.columns = 1;
        if (!options.width) options.width = options.columns;

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = $("<form-collapse>")
            .attr({
                "id": options.name,
                "colspan": options.width || 1,
            });

        const header = $("<h3>")
            .addClass("collapse-header")
            .html(options.title || "Details")
            .appendTo($element);
        if (options.badge)
            $("<span>")
                .addClass("form-collapse-badge")
                .append(options.badge)
                .appendTo(header);

        const container = $("<form-section>")
            .addClass("collapse-content")
            .attr({
                "labeled": options.label !== undefined ? "" : null,
                "columns": options.columns !== 1 ? options.columns : null,
                "colspan": options.width !== 1 ? options.width : null,
            })
            .appendTo($element);

        $element.accordion({
            active: !options.collapsed,
            animate: false,
            collapsible: true,
            header: "h3",
        });

        return new FormElement($element, undefined, $label, content, container);
    }

    /**
     * Creates an input FormElement based on the provided parameters  
     * @param options Element configuration
     * @param changed Input change callback
     */
    public static input(options?: InputElementOptions, changed?: InputChangeEvent): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.wrapper, options.width);

        const $input = $("<input>")
            .attr({
                "type": "text",
                "id": options.name,
                "name": options.name,
            })
            .addClass("bg-section color-text")
            .appendTo($element);

        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($input);
                    break;
                }
                case "object": {
                    $input.val(options.value.text());
                    break;
                }
                case "boolean":
                    options.value = options.value + "";
                default: {
                    $input
                        .val(options.value)
                        .attr("defval", options.value);
                }
            }
        }

        if (options.pattern) { $input.attr("pattern", options.pattern); }
        if (options.required) { $input.attr("required", ''); }

        if (changed !== undefined) {
            let timer: number;
            $input.on("input", () => {
                if (timer) clearTimeout(timer);
                timer = window.setTimeout(
                    () => { changed($input.val().toString(), $input); },
                    Form.inputTimeout
                );
            });
        }

        return new FormElement($element, $input, $label);
    }

    /**
     * Creates a copy input FormElement based on the provided parameters  
     * @param options Element configuration
     */
    public static copy(options?: ElementOptions): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.wrapper, options.width)
            .addClass("copybox");

        const $input = $("<input>")
            .attr({
                "type": "text",
                "id": options.name,
                "readonly": "",
            })
            .addClass("bg-section color-text")
            .appendTo($element);

        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($input);
                    break;
                }
                case "object": {
                    $input.val(options.value.text());
                    break;
                }
                case "boolean":
                    options.value = options.value + "";
                default: {
                    $input
                        .val(options.value)
                        .attr("defval", options.value);
                }
            }
        }

        const $copybutton = $("<button>")
            .attr({
                "type": "button",
                "id": options.name + "-copy",
            })
            .addClass("button btn-neutral border-highlight border-left")
            .html(`<i class="far fa-copy"></i>`)
            .appendTo($element);

        let copyTimer: number;
        $($copybutton).click(function () {
            XM.Util.setClipboard($input.val());

            window.clearTimeout(copyTimer);
            $input.addClass("highlight");
            copyTimer = window.setTimeout(() => $input.removeClass("highlight"), 250);
        });

        return new FormElement($element, $input, $label);
    }

    /**
     * Creates a key input FormElement based on the provided parameters  
     * @param options Element configuration
     */
    public static key(options?: ElementOptions, changed?: InputChangeEvent): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.wrapper, options.width)
            .addClass("keyinput");

        const $input = $("<input>")
            .attr({
                "type": "text",
                "id": options.name,
                "readonly": "",
            })
            .addClass("bg-section color-text")
            .appendTo($element);

        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($input);
                    break;
                }
                case "object": {
                    $input.val(options.value.text());
                    break;
                }
                case "boolean":
                    options.value = options.value + "";
                default: {
                    $input
                        .val(options.value)
                        .attr("defval", options.value);
                }
            }
        }

        const $recordbutton = $("<button>")
            .attr({
                "type": "button",
                "id": options.name + "-key",
            })
            .addClass("button btn-neutral border-highlight border-left")
            .html(`<i class="far fa-keyboard"></i>`)
            .appendTo($element);

        let occupied = false;
        $($recordbutton).click(function () {
            if (occupied) return;
            occupied = true;

            const $oldKey = $input.val();
            $input
                .addClass("input-info")
                .val("Recording");

            Hotkeys.recordSingleKeypress(function (key: string) {
                if (key.includes("escape")) {
                    $input.removeClass("input-info").val("");
                    if (changed !== undefined) changed(["", $oldKey], $input);
                    occupied = false;
                }
                else if (Hotkeys.isRegistered(key)) {
                    $input.val("Already Taken");
                    setTimeout(() => {
                        $input
                            .removeClass("input-info")
                            .val($oldKey);
                        occupied = false;
                    }, 1000);
                }
                else {
                    $input.removeClass("input-info").val(key);
                    if (changed !== undefined) changed([key, $oldKey], $input);
                    occupied = false;
                }
            });
        });

        return new FormElement($element, $input, $label);
    }

    /**
     * Creates a file input FormElement based on the provided parameters  
     * @param options Element configuration
     */
    public static file(options?: ElementOptions & { accept: string }, changed?: InputChangeEvent): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.wrapper, options.width)
            .addClass("fileinput");

        const $input = $("<input>")
            .attr({
                "type": "file",
                "accept": options.accept,
                "id": options.name,
            })
            .addClass("bg-section color-text")
            .appendTo($element);

        if (changed !== undefined) {
            $input.on("change", () => {
                changed($input.prop("files"), $input);
            });
        }

        return new FormElement($element, $input, $label);
    }

    public static icon(options?: ElementOptions, content?: { [name: string]: any }, changed?: InputChangeEvent): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils.makeInputWrapper(options.label, options.wrapper, options.width);

        const $input = $("<input>")
            .attr({
                "type": "text",
                "id": options.name,
                "name": options.name,
            })
            .css("display", "none")
            .appendTo($element);

        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($input);
                    break;
                }
                case "object": {
                    $input.val(options.value.text());
                    break;
                }
                case "boolean":
                    options.value = options.value + "";
                default: {
                    $input
                        .val(options.value)
                        .attr("defval", options.value);
                }
            }
        }

        const $selectContainer = $("<div>")
            .addClass("icon-picker")
            .appendTo($element);

        for (const key in content) {
            $("<a>")
                .attr("href", "#")
                .attr("data-value", key)
                .html(content[key])
                .appendTo($selectContainer);
        }

        $selectContainer.find("a").click((event) => {
            event.preventDefault();
            $selectContainer.find("a").removeClass("active");

            const $target = $(event.target);
            $input.val($target.attr("data-value"));
            $target.addClass("active");

            if (changed) changed($input.val().toString(), $input);
        });

        if (options.value) { $selectContainer.find("a[data-value='" + options.value + "']").first().click(); }
        else { $selectContainer.find("a").first().click(); }

        // When the field value is set externally, this event needs to be triggered on the text input field.
        // There is probably a better way to do this, but this should work for now.
        $input.on("re621:form:update", () => {
            if ($input.val() == "") { $selectContainer.find("a").first().click(); }
            else { $selectContainer.find("a[data-value='" + $input.val() + "']").first().click(); }
        });

        return new FormElement($element, $input, $label);
    }

    /**
     * Creates a button FormElement based on the provided parameters  
     * @param options Element configuration
     * @param changed Input change callback
     */
    public static button(options?: ElementOptions & { "type"?: "submit" | "button" }, changed?: InputChangeEvent): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.wrapper, options.width);

        const $input = $("<button>")
            .attr({
                "id": options.name,
                "type": options.type ? options.type : "button",
            })
            .addClass("button btn-neutral")
            .appendTo($element);

        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($input);
                    break;
                }
                case "object": {
                    $input.append(options.value);
                    break;
                }
                case "number":
                case "boolean":
                    options.value = options.value + "";
                default: {
                    $input
                        .html(options.value)
                        .attr("defval", options.value);
                }
            }
        }

        if (changed !== undefined)
            $input.on("click", (event) => {
                event.preventDefault();
                changed(true, $input);
            });

        return new FormElement($element, $input, $label);
    }

    /**
     * Creates a checkbox FormElement based on the provided parameters  
     * @param options Element configuration
     * @param changed Input change callback
     */
    public static checkbox(options?: ElementOptions, changed?: InputChangeEvent): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        const $element = FormUtils
            .makeInputWrapper(undefined, options.wrapper, options.width)
            .addClass("checkbox-switch");

        const $input = $("<input>")
            .attr({
                "id": options.name,
                "name": options.name,
                "type": "checkbox",
            })
            .addClass("switch")
            .appendTo($element);

        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($input);
                    break;
                }
                case "object": {
                    break;
                }
                default: {
                    $input
                        .prop("checked", options.value)
                        .attr("defval", options.value + "");
                }
            }
        }

        $("<label>")
            .attr("for", options.name)
            .addClass("switch")
            .appendTo($element);

        if (options.label) {
            $("<label>")
                .attr("for", options.name)
                .html(options.label)
                .appendTo($element);
        }

        if (changed !== undefined)
            $input.on("change", () => { changed($input.is(":checked"), $input); });

        return new FormElement($element, $input);
    }

    /**
     * Creates a select FormElement based on the provided parameters  
     * @param options Element configuration
     * @param content Select options data
     * @param changed Input change callback
     */
    public static select(options?: ElementOptions, content?: SelectOptionSet | SelectOptionFunction, changed?: InputChangeEvent): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.wrapper, options.width);

        const $input = $("<select>")
            .attr({
                "id": options.name,
                "name": options.name,
            })
            .addClass("button btn-neutral")
            .appendTo($element);

        if (content !== undefined) {
            if (typeof content === "function") content = content();
            for (const key in content)
                $("<option>").val(key).text(content[key]).appendTo($input);
        }
        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($input);
                    break;
                }
                case "object": {
                    $input.val(options.value.text());
                    break;
                }
                case "boolean":
                    options.value = options.value + "";
                default: {
                    $input
                        .val(options.value)
                        .attr("defval", options.value);
                }
            }
        }

        if (changed !== undefined)
            $input.on("change", () => { changed($input.val().toString(), $input); });

        return new FormElement($element, $input, $label);
    }

    /**
     * Creates a header FormElement based on the provided parameters
     * @param text Header text
     * @param width Element span
     */
    public static header(text: string, width?: number): FormElement {
        const $element = FormUtils.makeInputWrapper(undefined, undefined, width);

        $("<h3>")
            .attr("id", Util.makeUniqueID())
            .addClass("color-text")
            .html(text)
            .appendTo($element);

        return new FormElement($element);
    }

    /**
     * Creates a div FormElement based on the provided parameters  
     * @param options Element configuration
     */
    public static div(options?: ElementOptions): FormElement {
        if (!options.name) options.name = Util.makeUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.wrapper, options.width)
            .addClass("text-div")
            .attr("id", options.name);

        if (options.value !== undefined) {
            switch (typeof options.value) {
                case "function": {
                    options.value($element);
                    break;
                }
                case "object": {
                    $element.append(options.value.text());
                    break;
                }
                case "number":
                case "boolean":
                    options.value = options.value + "";
                default: {
                    $element
                        .html(options.value)
                        .attr("defval", options.value);
                }
            }
        }

        return new FormElement($element, undefined, $label);
    }

    /**
     * Alias for `Form.div` with streamlined options
     * @param text Div contents
     * @param width Wrapper width
     */
    public static text(text: string, width = 1, wrapper?: string): FormElement {
        return Form.div({ value: text, width: width, wrapper: wrapper });
    }

    /**
     * Alias for `Form.div` with some pre-built markup
     * @param header First line of the header
     * @param subheader Second line of the header
     * @param width Wrapper width
     */
    public static subheader(header: string, subheader: string, width = 1): FormElement {
        return Form.div({ value: `<b>${header}</b><br />${subheader}`, width: width, wrapper: "subheader" });
    }

    /**
     * Creates an hr FormElement based on the provided parameters  
     * @param width Element width
     */
    public static hr(width?: number): FormElement {
        const $element = FormUtils.makeInputWrapper(undefined, undefined, width);

        $("<hr>")
            .attr("id", Util.makeUniqueID())
            .addClass("color-text-muted")
            .appendTo($element);

        return new FormElement($element);
    }

    /**
     * Creates an empty spacer element
     * @param width Element width
     */
    public static spacer(width?: number): FormElement {
        const $element = FormUtils.makeInputWrapper(undefined, undefined, width);

        $("<div>")
            .attr("id", Util.makeUniqueID())
            .html("&nbsp;")
            .appendTo($element);

        return new FormElement($element);
    }
}

class FormUtils {

    public static makeLabel(name: string, text: string): JQuery<HTMLElement> {
        return $("<label>")
            .attr("for", name)
            .html(text);
    }

    public static makeInputWrapper(label: string, wrapper: string, width = 1): JQuery<HTMLElement> {
        return $("<form-input>")
            .addClass(wrapper ? " " + wrapper : "")
            .attr({
                "labeled": label !== undefined ? "" : null,
                "colspan": width !== 1 ? width : null,
            });
    }

}

export class FormElement {

    private created: boolean;

    private wrapper: JQuery<HTMLElement>;
    private input: JQuery<HTMLElement>;
    private label: JQuery<HTMLElement>;
    private content: FormElement[];
    private container: JQuery<HTMLElement>;
    private postProcessing: Function;

    /**
     * Constructs a form element based on provided data.  
     * Only the `wrapper` parameter is required, everything else is optional.
     * @param wrapper Element that wraps the rest of the inputs
     * @param input Input element, if there is one
     * @param label Input label, if there is one
     * @param content Contains other FormElements that need to be built and appended to this element
     * @param container Container object for content. If omitted, defaults to wrapper
     * @param postProcessing Function to run after the object has been built. Takes the wrapper as a parameter.
     */
    public constructor(
        wrapper: JQuery<HTMLElement>,
        input?: JQuery<HTMLElement>,
        label?: JQuery<HTMLElement>,
        content?: FormElement[],
        container?: JQuery<HTMLElement>,
        postProcessing?: (wrapper: JQuery<HTMLElement>) => void) {

        this.wrapper = wrapper;
        this.input = input;
        this.label = label;
        this.content = content ? content : [];
        this.container = container ? container : wrapper;

        this.postProcessing = postProcessing ? postProcessing : (): void => { return; };
    }

    public getInput(): JQuery<HTMLElement> {
        return this.input;
    }

    public getInputs(): JQuery<HTMLElement>[] {
        const result: JQuery<HTMLElement>[] = [];

        if (this.input) result.push(this.input);
        for (const entry of this.content)
            result.push(...entry.getInputs());

        return result;
    }

    public build(parentID: string, force = false): JQuery<HTMLElement>[] {
        if (force || !this.created) {
            for (const entry of this.content) {
                for (const childElem of entry.build(parentID + "-" + this.wrapper.attr("id"), force))
                    childElem.appendTo(this.container);
            }

            if (this.label !== undefined) this.label.attr("for", parentID + "-" + this.label.attr("for"));
            if (this.input !== undefined) this.input.attr("id", parentID + "-" + this.input.attr("id"));
            switch (this.wrapper.prop("tagName")) {
                case "FORM-INPUT": {
                    for (const label of this.wrapper.find("> label")) {
                        const $subLabel = $(label);
                        $subLabel.attr("for", parentID + "-" + $subLabel.attr("for"));
                    }
                    break;
                }
                case "FORM-SECTION":
                case "FORM-ACCORDION": {
                    this.wrapper.attr("id", parentID + "-" + this.wrapper.attr("id"));
                    break;
                }
            }

            this.postProcessing(this.wrapper);

            this.created = true;
        }

        if (this.label) return [this.label, this.wrapper];
        else return [this.wrapper];
    }

}

class FormAccordionElement extends FormElement { }

interface SectionOptions {
    name?: string;
    label?: string;
    columns?: number;
    width?: number;
    wrapper?: string;
}

interface ElementOptions {
    name?: string;
    label?: string;
    value?: string | boolean | number | JQuery<HTMLElement> | ElementInputValue;
    width?: number;
    wrapper?: string;
}

interface InputElementOptions extends ElementOptions {
    required?: boolean;
    pattern?: string;
}

type SelectOptionSet = { [name: string]: any }
type SelectOptionFunction = () => SelectOptionSet;

type ElementInputValue = (element: JQuery<HTMLElement>) => void;

type FormSubmitEvent = (values: any, form: Form) => void;
type InputChangeEvent = (value: any, input: JQuery<HTMLElement>) => void;
