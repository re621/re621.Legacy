import { Hotkeys } from "../data/Hotkeys";

/**
 * Removes the hassle of creating HTML elements for a form
 */
export class Form {

    private static timeout = 500;

    private config: FormConfig;
    private elements: FormElement[] = [];

    private index = 0;
    private $form: JQuery<HTMLElement>;
    private $inputList: Map<string, JQuery<HTMLElement>> = new Map();

    public constructor(config: FormConfig, elements: FormElement[]) {
        if (config.columns === undefined) config.columns = 1;
        if (config.parent === undefined) config.parent = "body";
        this.config = config;
        elements.forEach(element => { this.addElement(element); });
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
            .attr("id", this.config.id)
            .addClass("grid-form");

        if (this.config.columns > 1) { this.$form.addClass("columns-" + this.config.columns); }

        for (const element of this.elements) {
            const $input = this.build(this.$form, element);
            this.$inputList.set(element.id, $input);
        }

        $(this.config.parent).on("submit", "form#" + this.config.id, event => {
            event.preventDefault();
            this.$form.trigger("re621:form:submit", this.getInputValues());
        });

        this.$form.trigger("re621:form:create");
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
            const $input = this.$form.find("#" + this.config.id + "-" + element.id);
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
    private build($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        const fn = "build" + element.type.charAt(0).toUpperCase() + element.type.slice(1);
        return this[fn](this.$form, element);
    }

    /**
     * Builds and appends an input element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildInput($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
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

        return $input;
    }

    /**
     * Builds and appends an input element with a copy button
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildCopy($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
                "readonly": "",
            })
            .addClass("bg-section color-text")
            .val(element.value)
            .appendTo($inputContainer);

        const $copybutton = $("<button>")
            .attr("type", "button")
            .attr("id", this.config.id + "-" + element.id + "-copy")
            .addClass("button btn-neutral border-highlight border-left")
            .html(`<i class="far fa-copy"></i>`)
            .appendTo($inputContainer);

        $($copybutton).click(function () {
            $input.select();
            document.execCommand("copy");
        });

        let timer: number;
        $input.on("input", () => {
            if (timer) clearTimeout(timer);
            timer = window.setTimeout(() => {
                $input.trigger("re621:form:input", $input.val());
            }, Form.timeout);
        });

        return $input;
    }

    /**
     * Builds and appends an input element that records a key press
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildKey($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
                "readonly": "",
            })
            .addClass("bg-section color-text")
            .val(element.value)
            .appendTo($inputContainer);

        const $recordbutton = $("<button>")
            .attr("type", "button")
            .attr("id", this.config.id + "-" + element.id + "-copy")
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

        return $input;
    }

    /**
     * Builds and appends a file input
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildFile($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
            })
            .addClass("bg-section color-text")
            .appendTo($inputContainer);

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        $input.on("change", () => {
            $input.trigger("re621:form:input", $input.prop("files"));
        });

        return $input;
    }

    /**
     * Builds and appends an icon selector element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildIcon($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
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

        return $input;
    }

    /**
     * Builds and appends a checkbox element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildCheckbox($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
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
                "id": this.config.id + "-" + element.id,
            })
            .addClass("switch")
            .attr("checked", element.value)
            .appendTo($inputContainer);

        $("<label>")
            .attr("for", this.config.id + "-" + element.id)
            .addClass("switch")
            .appendTo($inputContainer);



        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
                .html(element.label)
                .appendTo($inputContainer);
        }

        $input.on("change", () => {
            $input.trigger("re621:form:input", $input.is(":checked"));
        });

        return $input;
    }

    /**
     * Builds and appends a button element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildButton($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
            })
            .addClass("button btn-neutral")
            .html(element.value)
            .appendTo($inputContainer);

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        return $input;
    }

    /**
     * Builds and appends a submit button
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildSubmit($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
            })
            .addClass("button btn-neutral")
            .html(element.value)
            .appendTo($inputContainer);

        if (element.pattern) { $input.attr("pattern", element.pattern); }
        if (element.required) { $input.attr("required", ''); }

        return $input;
    }

    /**
     * Builds and appends a textarea
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildTextarea($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id
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

        return $input;
    }

    /**
     * Builds and appends a select
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildSelect($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id
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

        return $input;
    }

    /**
     * Builds and appends a div
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildDiv($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id,
            })
            .append(element.value)
            .appendTo($inputContainer);

        return $input;
    }

    /**
     * Builds and appends an HR element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildHr($form: JQuery<HTMLElement>, element: FormElement): JQuery<HTMLElement> {
        let labeled = false;
        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "-" + element.id)
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
                "id": this.config.id + "-" + element.id
            })
            .addClass("color-text-muted")
            .appendTo($inputContainer);

        return $input;
    }

}

interface FormConfig {
    /** Unique ID for the form */
    id: string;
    /** Number of columns that the form should take up */
    columns?: number;
    /** Nearest static parent, for improved performance */
    parent?: string;
}

export interface FormElement {
    /** Unique ID for the element. Actual ID becomes formID_elementID */
    id?: string;
    /** Supported input type */
    type: "input" | "copy" | "key" | "file" | "icon" | "checkbox" | "button" | "submit" | "textarea" | "select" | "div" | "hr";

    stretch?: "default" | "column" | "mid" | "full";

    /** Input label */
    label?: string;
    /** Default value for the input */
    value?: any;

    /** If true, the field is required to submit the form */
    required?: boolean;
    /** Pattern that the input value must match */
    pattern?: string;

    /** Value-name pairs for the select */
    data?: {
        value: string;
        name: string;
    }[];
}
