import { Hotkeys } from "../data/Hotkeys";
import { XM } from "../api/XM";
import { Util } from "./Util";

/**
 * Removes the hassle of creating HTML elements for a form
 */
export class Form {

    private static timeout = 500;

    private config: FormConfig;
    private elements: FormElement[] = [];
    private formID: string;

    private index = 0;
    private $form: JQuery<HTMLElement>;
    private $inputList: Map<string, JQuery<HTMLElement>> = new Map();

    public constructor(config: FormConfig, elements: FormElement[], parent?: string) {
        if (config.name === undefined) config.name = config.id;
        if (config.columns === undefined) config.columns = 1;
        if (config.parent === undefined) config.parent = "body";
        if (config.collapse === undefined) config.collapse = false;
        if (config.collapseState === undefined) config.collapseState = true;
        this.config = config;

        this.formID = (parent === undefined) ? config.id : config.id + "-" + parent;

        elements.forEach((element: FormElement | FormElement[]) => {
            if (Array.isArray(element)) {
                element.forEach((subElement) => { this.addElement(subElement); });
            } else this.addElement(element);
        });
    }

    /**
     * Adds another element to the form.  
     * Should be run before get() in order for changes to appear
     * @param element FormElement to add
     */
    public addElement(element: FormElement): void {
        if (element.id === undefined) element.id = this.index + "";

        if (element.stretch === undefined) element.stretch = "default";

        if (element.label === undefined) element.label = "";
        if (element.value === undefined) element.value = "";

        if (element.required === undefined) element.required = false;
        if (element.pattern === undefined) element.pattern = "";

        if (element.data === undefined) element.data = [];

        if (element.onChange === undefined) element.onChange = ((): void => { return; });

        this.elements.push(element);
        this.index++;
    }

    /**
     * Returns the DOM element for the form
     * @param force Rebuilds the form from scratch if set to true.
     */
    public get(force?: boolean): JQuery<HTMLElement> {
        if (this.$form !== undefined && !force) { return this.$form; }

        this.$form = $("<form>")
            .attr("id", this.formID)
            .addClass("grid-form");

        if (this.config.columns > 1) { this.$form.addClass("columns-" + this.config.columns); }

        let curInput;
        for (const element of this.elements) {
            curInput = this.build(this.$form, element);
            if (Array.isArray(curInput)) {
                (curInput as FormInput[]).forEach((input) => {
                    this.$inputList.set(input.id, input.el);
                });
            }
            else {
                this.$inputList.set(curInput.id, curInput.el);
                curInput.el.on("re621:form:input", (event: Event, ...data: any[]) => {
                    if (data.length === 0) data = null;
                    else if (data.length === 1) data = data[0];
                    element.onChange(event, data);
                });
            }
        }

        $(this.config.parent).on("submit", "form#" + this.formID, event => {
            event.preventDefault();
            this.$form.trigger("re621:form:submit", this.getInputValues());
        });

        this.$form.trigger("re621:form:create");

        if (this.config.collapse) {
            const section = $("<div>")
                .addClass(this.formID + "-collapse form-collapse")
                .append($("<h3>").addClass("form-collapse-header").html(this.config.name))
                .append($("<div>").addClass("form-collapse-content").append(this.$form));
            section.accordion({
                active: this.config.collapseState,
                animate: false,
                collapsible: true,
                header: "h3",
            });
            return section;
        }

        return this.$form;
    }

    /**
     * Returns a list of elements in the form.  
     * If no parameter is specified, returns all inputs
     * @param types Types of input to return
     */
    public getInputList(...types: FormElement["type"][]): Map<string, JQuery<HTMLElement>> {
        if (types.length == 0) { return this.$inputList; }
        const results: Map<string, JQuery<HTMLElement>> = new Map();

        this.$inputList.forEach((element, key) => {
            if ($.inArray(element.attr("data-type"), types) !== -1) {
                results.set(key, element);
            }
        });

        return results;
    }

    /**
     * Aggregates the values of all inputs in the form.  
     * This includes buttons and submit elements.
     */
    public getInputValues(): Map<string, string | number | string[]> {
        const values = new Map<string, string | number | string[]>();
        this.$inputList.forEach(function (input, key) {
            values.set(key, input.val());
        });
        return values;
    }

    /**
     * Resets the elements to their default values.  
     * Does not include buttons and submit elements
     */
    public reset(): void {
        if (this.$form === undefined) return;
        for (const element of this.elements) {
            const $input = this.$form.find("#" + this.formID + "-" + element.id);
            switch (element.type) {
                case "input":
                case "textarea":
                case "select": {
                    $input.val(element.value);
                    break;
                }
                case "icon": {
                    $input
                        .val(element.value)
                        .trigger("re621:form:update");
                    break;
                }
                case "checkbox": {
                    $input.attr("checked", element.value);
                    break;
                }
                default: { }
            }
        }
    }

    /**
     * Builds and appends a form element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private build($form: JQuery<HTMLElement>, element: FormElement): FormInput | FormInput[] {
        const fn = "build" + element.type.charAt(0).toUpperCase() + element.type.slice(1);
        return this[fn](this.$form, element);
    }

    /**
     * Creates an input FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param type Element type
     * @param id Unique element ID
     * @param label Form label
     * @param value Element value
     * @param stretch Column span
     * @param required Required state
     * @param pattern Pattern to match
     * @param data Extra data
     * @param onChange Change callback
     */
    private static make(type: FormElementType, id: string, label?: string, value?: any, stretch: FormElementWidth = "column", required?: boolean, pattern?: string, data?: FormExtraData[], onChange?: FormChangeEvent): FormElement {
        return {
            id: id,
            type: type,

            stretch: stretch,

            label: label,
            value: value,

            required: required,
            pattern: pattern,

            data: data,

            onChange: onChange,
        };
    }

    /**
     * Builds and appends an input element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildInput($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<input>")
            .attr({
                "type": "text",
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
            })
            .addClass("bg-section color-text")
            .val(element.value)
            .appendTo($inputContainer);

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        let timer: number;
        $input.on("input", () => {
            if (timer) clearTimeout(timer);
            timer = window.setTimeout(() => {
                $input.trigger("re621:form:input", $input.val());
            }, Form.timeout);
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates an input FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param reqs Input requirements
     * @param onChange Input change callback
     */
    public static input(id: string, value?: string, label?: string, stretch?: FormElementWidth, reqs?: FormEntryRequirements, onChange?: FormChangeEvent): FormElement {
        if (reqs === undefined) reqs = { required: undefined, pattern: undefined, };
        return this.make("input", id, label, value, stretch, reqs.required, reqs.pattern, undefined, onChange);
    }

    /**
     * Builds and appends an input element with a copy button
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildCopy($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("copybox")
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<input>")
            .attr({
                "type": "text",
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
                "readonly": "",
            })
            .addClass("bg-section color-text")
            .val(element.value)
            .appendTo($inputContainer);

        const $copybutton = $("<button>")
            .attr("type", "button")
            .attr("id", this.formID + "-" + element.id + "-copy")
            .addClass("button btn-neutral border-highlight border-left")
            .html(`<i class="far fa-copy"></i>`)
            .appendTo($inputContainer);

        $($copybutton).click(function () {
            XM.Util.setClipboard($input.val());
        });

        let timer: number;
        $input.on("input", () => {
            if (timer) clearTimeout(timer);
            timer = window.setTimeout(() => {
                $input.trigger("re621:form:input", $input.val());
            }, Form.timeout);
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates a copy input FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static copy(id: string, value = "", label?: string, stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("copy", id, label, value, stretch, undefined, undefined, undefined, onChange);
    }

    /**
     * Builds and appends an input element that records a key press
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildKey($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("keyinput")
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<input>")
            .attr({
                "type": "text",
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
                "readonly": "",
            })
            .addClass("bg-section color-text")
            .val(element.value)
            .appendTo($inputContainer);

        const $recordbutton = $("<button>")
            .attr("type", "button")
            .attr("id", this.formID + "-" + element.id + "-copy")
            .addClass("button btn-neutral border-highlight border-left")
            .html(`<i class="far fa-keyboard"></i>`)
            .appendTo($inputContainer);

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
                    $input
                        .removeClass("input-info")
                        .val("")
                        .trigger("re621:form:input", [key, $oldKey]);
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
                    $input
                        .removeClass("input-info")
                        .val(key)
                        .trigger("re621:form:input", [key, $oldKey]);
                    occupied = false;
                }
            });
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates a key input FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static key(id: string, value = "", label?: string, stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("key", id, label, value, stretch, undefined, undefined, undefined, onChange);
    }

    /**
     * Builds and appends a file input
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildFile($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<input>")
            .attr({
                "type": "file",
                "accept": element.value,
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
            })
            .addClass("bg-section color-text")
            .appendTo($inputContainer);

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        $input.on("change", () => {
            $input.trigger("re621:form:input", $input.prop("files"));
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates a file input FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param reqs Input requirements
     * @param onChange Input change callback
     */
    public static file(id: string, value = "", label?: string, stretch: FormElementWidth = "column", reqs?: FormEntryRequirements, onChange?: FormChangeEvent): FormElement {
        if (reqs === undefined) reqs = { required: undefined, pattern: undefined, };
        return this.make("file", id, label, value, stretch, reqs.required, reqs.pattern, undefined, onChange);
    }

    /**
     * Builds and appends an icon selector element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildIcon($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<input>")
            .attr({
                "type": "text",
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
            })
            .css("display", "none")
            .val(element.value)
            .appendTo($inputContainer);

        const $selectContainer = $("<div>")
            .addClass("icon-picker")
            .appendTo($inputContainer);


        element.data.forEach((icon) => {
            $("<a>")
                .attr("href", "#")
                .attr("data-value", icon.value)
                .html(icon.name)
                .appendTo($selectContainer);
        });

        $selectContainer.find("a").click((event) => {
            event.preventDefault();
            $selectContainer.find("a").removeClass("active");
            const $target = $(event.target);
            $input.val($target.attr("data-value"));
            $target.addClass("active");
            $input.trigger("re621:form:input", $input.val());
        });

        if (element.value === "") { $selectContainer.find("a").first().click(); }
        else { $selectContainer.find("a[data-value='" + element.value + "']").first().click(); }

        $input.on("re621:form:update", () => {
            if ($input.val() == "") { $selectContainer.find("a").first().click(); }
            else { $selectContainer.find("a[data-value='" + $input.val() + "']").first().click(); }
        });

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ""); }

        return { id: element.id, el: $input };
    }

    /**
     * Creates an icon input FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static icon(id: string, value = "", label?: string, stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("icon", id, label, value, stretch, undefined, undefined, undefined, onChange);
    }

    /**
     * Builds and appends a checkbox element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildCheckbox($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .addClass("checkbox-switch")
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<input>")
            .attr({
                "type": "checkbox",
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
            })
            .addClass("switch")
            .attr("checked", element.value)
            .appendTo($inputContainer);

        $("<label>")
            .attr("for", this.formID + "-" + element.id)
            .addClass("switch")
            .appendTo($inputContainer);

        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($inputContainer);
        }

        $input.on("change", () => {
            $input.trigger("re621:form:input", $input.is(":checked"));
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates a checkbox FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static checkbox(id: string, value = "", label?: string, stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("checkbox", id, label, value, stretch, undefined, undefined, undefined, onChange);
    }

    /**
     * Builds and appends a radio element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildRadio($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .addClass("radio-switch")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<input>")
            .addClass("display-hidden")
            .attr("id", this.formID + "-" + element.id + "-input")
            .val(element.value)
            .appendTo($inputContainer);

        let $radioContainer: JQuery<HTMLElement>,
            checked: boolean;
        element.data.forEach((entry, index) => {
            checked = (element.value === entry.value);
            $radioContainer = $("<div>")
                .addClass("radio-element")
                .toggleClass("bg-section", !checked)
                .toggleClass("bg-highlight", checked)
                .attr("id", this.formID + "-" + element.id + "-" + index + "-cont")
                .appendTo($inputContainer);
            $("<input>")
                .attr({
                    "type": "radio",
                    "name": this.formID + "-" + element.id,
                    "id": this.formID + "-" + element.id + "-" + index,
                })
                .prop("checked", checked)
                .val(entry.value)
                .appendTo($radioContainer)
                .on("click", function () {
                    $input.val($(this).val()).trigger("change");
                    $inputContainer.find("div.radio-element.bg-highlight").toggleClass("bg-section bg-highlight");
                    $(this).parent().toggleClass("bg-section bg-highlight");
                });
            $("<label>")
                .attr("for", this.formID + "-" + element.id + "-" + index)
                .html(entry.name)
                .appendTo($radioContainer);
        });

        if (element.required) { $input.attr("required", ''); }

        $input.on("change", () => {
            $input.trigger("re621:form:input", $input.val());
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates a select FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param data Extra data
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static radio(id: string, value = "", label?: string, data?: FormExtraData[], stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("radio", id, label, value, stretch, undefined, undefined, data, onChange);
    }

    /**
     * Builds and appends a button element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildButton($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<button>")
            .attr({
                "type": "button",
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
            })
            .addClass("button btn-neutral")
            .html(element.value)
            .appendTo($inputContainer)
            .on("click", () => {
                $input.trigger("re621:form:input", true);
            });

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        return { id: element.id, el: $input };
    }

    /**
     * Creates a button FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static button(id: string, value = "", label?: string, stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("button", id, label, value, stretch, undefined, undefined, undefined, onChange);
    }

    /**
     * Builds and appends a submit button
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildSubmit($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<button>")
            .attr({
                "type": "submit",
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
            })
            .addClass("button btn-neutral")
            .html(element.value)
            .appendTo($inputContainer)
            .on("click", () => {
                $input.trigger("re621:form:input", true);
            });

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        return { id: element.id, el: $input };
    }

    /**
     * Creates a submit button FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static submit(id: string, value = "", label?: string, stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("submit", id, label, value, stretch, undefined, undefined, undefined, onChange);
    }

    /**
     * Builds and appends a textarea
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildTextarea($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<textarea>")
            .attr({
                "data-type": element.type,
                "id": this.formID + "-" + element.id
            })
            .addClass("bg-section color-text")
            .val(element.value)
            .appendTo($inputContainer);

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        let timer: number;
        $input.on("input", () => {
            if (timer) clearTimeout(timer);
            timer = window.setTimeout(() => {
                $input.trigger("re621:form:input", $input.val());
            }, Form.timeout);
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates a textarea FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     * @param reqs Input requirements
     * @param onChange Input change callback
     */
    public static textarea(id: string, value = "", label?: string, stretch: FormElementWidth = "column", reqs?: FormEntryRequirements, onChange?: FormChangeEvent): FormElement {
        if (reqs === undefined) reqs = { required: undefined, pattern: undefined, };
        return this.make("textarea", id, label, value, stretch, reqs.required, reqs.pattern, undefined, onChange);
    }

    /**
     * Builds and appends a select
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildSelect($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<select>")
            .attr({
                "data-type": element.type,
                "id": this.formID + "-" + element.id
            })
            .addClass("button btn-neutral")
            .appendTo($inputContainer);

        element.data.forEach(function (entry) {
            $("<option>").val(entry.value).text(entry.name).appendTo($input);
        });
        $input.val(element.value);

        if (element.required) { $input.attr("required", ''); }

        $input.on("change", () => {
            $input.trigger("re621:form:input", $input.val());
        });

        return { id: element.id, el: $input };
    }

    /**
     * Creates a select FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param id Unique element ID
     * @param value Element value
     * @param label Form label
     * @param data Extra data
     * @param stretch Column span
     * @param onChange Input change callback
     */
    public static select(id: string, value = "", label?: string, data?: FormExtraData[], stretch: FormElementWidth = "column", onChange?: FormChangeEvent): FormElement {
        return this.make("select", id, label, value, stretch, undefined, undefined, data, onChange);
    }

    /**
     * Builds and appends a div
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildDiv($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<div>")
            .addClass("input-div")
            .attr({
                "data-type": element.type,
                "id": this.formID + "-" + element.id,
            })
            .append(element.value)
            .appendTo($inputContainer);

        return { id: element.id, el: $input };
    }

    /**
     * Creates a div FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     */
    public static div(value = "", stretch: FormElementWidth = "full"): FormElement {
        return this.make("div", Util.makeID(), undefined, value, stretch);
    }

    /**
     * Creates a header FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param value Element value
     * @param stretch Column span
     */
    public static header(value = "", stretch: FormElementWidth = "full"): FormElement {
        return this.make("div", Util.makeID(), undefined, $("<h3>").html(value), stretch);
    }

    /**
     * Creates a header FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param value Element value
     * @param stretch Column span
     */
    public static label(value = "", stretch: FormElementWidth = "column"): FormElement {
        return this.make("div", Util.makeID(), undefined, value, stretch);
    }

    /**
     * Creates a status FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param value Element value
     * @param stretch Column span
     */
    public static status(value = "", stretch: FormElementWidth = "full"): FormElement {
        return this.make("div", Util.makeID(), " ", value, stretch);
    }

    /**
     * Creates a spacer FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param stretch Column span
     */
    public static spacer(stretch: FormElementWidth = "column"): FormElement {
        return this.make("div", Util.makeID(), undefined, " ", stretch);
    }

    /**
     * Builds and appends an HR element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildHr($form: JQuery<HTMLElement>, element: FormElement): FormInput {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $input = $("<hr>")
            .attr({
                "data-type": element.type,
                "id": this.formID + "-" + element.id
            })
            .addClass("color-text-muted")
            .appendTo($inputContainer);

        return { id: element.id, el: $input };
    }

    /**
     * Creates an hr FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param value Element value
     * @param label Form label
     * @param stretch Column span
     */
    public static hr(stretch: FormElementWidth = "full"): FormElement {
        return this.make("hr", Util.makeID(), undefined, undefined, stretch);
    }

    /**
     * Builds and appends another Form element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildForm($form: JQuery<HTMLElement>, element: FormElement): FormInput[] {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.formID + "-" + element.id)
                .html(element.label)
                .appendTo($form);
            labeled = true;
        } else if (element.stretch === "default") { element.stretch = "column"; }

        const $inputContainer = $("<div>")
            .addClass("input-container")
            .toggleClass("labeled", labeled)
            .addClass("stretch-" + element.stretch)
            .appendTo($form);

        const $innerForm = (element.value as Form);
        $innerForm.get().appendTo($inputContainer);

        const inputs: FormInput[] = [];
        $innerForm.$inputList.forEach((value, key) => {
            inputs.push({
                id: $innerForm.config.id + "-" + key,
                el: value,
            });
        });

        return inputs;
    }

    /**
     * Creates a form section FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param config Form configuratino
     * @param elements Form elements
     * @param label Form label
     * @param stretch Column span
     */
    public static section(config: FormConfig, elements: FormElement[], label?: string, stretch: FormElementWidth = "full"): FormElement {
        return this.make("form", config.id, label, new Form(config, elements), stretch);
    }

    /**
     * Creates a collapsable subsection FormElement based on the provided parameters  
     * Alias for the more generic make() function with a specific type  
     * @param config Form configuratino
     * @param name Collapsable section title
     * @param elements Form elements
     * @param label Form label
     * @param stretch Column span
     */
    public static subsection(config: FormConfig, name: string, elements: FormElement[], label?: string, stretch: FormElementWidth = "full"): FormElement {
        config.collapse = true;
        config.name = name;
        config.collapseState = false;
        return this.make("form", config.id, label, new Form(config, elements), stretch);
    }
}

interface FormConfig {
    /** Unique ID for the form */
    id: string;
    /** Optional name for the form */
    name?: string;
    /** Number of columns that the form should take up */
    columns?: number;
    /** Nearest static parent, for improved performance */
    parent?: string;
    /** If true, the form will be wrapped in an accordeon */
    collapse?: boolean;
    /** Whether the collapsable should be open by default */
    collapseState?: boolean;
}

interface FormEntry {
    /** Unique ID for the element. Actual ID becomes formID_elementID */
    id: string;

    /** Input label */
    label?: string;

    /** Default value for the input */
    value?: any;

    /** How many columns should the element span */
    stretch?: FormElementWidth;
}

interface FormEntryRequirements {
    /** If true, the field is required to submit the form */
    required?: boolean;

    /** Pattern that the input value must match */
    pattern?: string;
}

export interface FormElement extends FormEntry, FormEntryRequirements {
    /** Supported input type */
    type: FormElementType;

    /** Value-name pairs for the select */
    data?: FormExtraData[];

    /** Fired when the value of the input changes */
    onChange?: FormChangeEvent;
}

type FormElementType = "input" | "copy" | "key" | "file" | "icon" | "checkbox" | "radio" | "button" | "submit" | "textarea" | "select" | "div" | "hr" | "form";
type FormElementWidth = "default" | "column" | "mid" | "full";
type FormExtraData = { name: string; value: string };
type FormChangeEvent = (event: Event, data: any) => void;

type FormInput = {
    id: string;
    el: JQuery<HTMLElement>;
}
