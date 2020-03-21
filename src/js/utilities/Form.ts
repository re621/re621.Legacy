/**
 * Removes the hassle of creating HTML elements for a form
 */
export class Form {

    private config: FormConfig;
    private elements: FormElement[] = [];

    private index: number = 0;
    private $form: JQuery<HTMLElement>;
    private $inputList: Map<string, JQuery<HTMLElement>> = new Map();

    public constructor(config: FormConfig, elements: FormElement[]) {
        let _self = this;
        if (config.columns === undefined) config.columns = 1;
        if (config.parent === undefined) config.parent = "body";
        this.config = config;
        elements.forEach(function (element) { _self.addElement(element); });
    }

    /**
     * Adds another element to the form.  
     * Should be run before get() in order for changes to appear
     * @param element FormElement to add
     */
    public addElement(element: FormElement) {
        if (element.id === undefined) element.id = this.index + "";
        if (element.value === undefined) element.value = "";
        if (element.label === undefined) element.label = "";
        if (element.select === undefined) element.select = [];
        if (element.class === undefined) element.class = "";

        this.elements.push(element);
        this.index++;
    }

    /**
     * Returns the DOM element for the form
     * @param force Rebuilds the form from scratch if set to true.
     */
    public get(force?: boolean) {
        if (this.$form !== undefined && !force) { return this.$form; }

        let _self = this;
        this.$form = $("<form>")
            .attr("id", this.config.id)
            .addClass("grid-form");

        if (this.config.columns > 1) { this.$form.addClass("columns-" + this.config.columns); }

        this.elements.forEach(function (element) {
            let $input;
            switch (element.type) {
                case "input": {
                    $input = _self.buildInput(_self.$form, element);
                    break;
                }
                case "copyinput": {
                    $input = _self.buildCopyInput(_self.$form, element);
                    break;
                }
                case "checkbox": {
                    $input = _self.buildCheckbox(_self.$form, element);
                    break;
                }
                case "button": {
                    $input = _self.buildButton(_self.$form, element);
                    break;
                }
                case "submit": {
                    $input = _self.buildSubmit(_self.$form, element);
                    break;
                }
                case "textarea": {
                    $input = _self.buildTextarea(_self.$form, element);
                    break;
                }
                case "select": {
                    $input = _self.buildSelect(_self.$form, element);
                    break;
                }
                case "div": {
                    $input = _self.buildDiv(_self.$form, element);
                    break;
                }
                case "hr": {
                    $input = _self.buildHr(_self.$form, element);
                    break;
                }
                default: { }
            }
            _self.$inputList.set(element.id, $input);
        });

        $(this.config.parent).on("submit", "form#" + this.config.id, function (event) {
            event.preventDefault();
            _self.$form.trigger("re-form:submit", _self.getInputValues());
        });

        _self.$form.trigger("re-form:create");
        return _self.$form;
    }

    /**
     * Returns a list of inputs in the form.  
     * This includes buttons and submit elements.
     */
    public getInputList() {
        return this.$inputList;
    }

    /**
     * Aggregates the values of all inputs in the form.  
     * This includes buttons and submit elements.
     */
    public getInputValues() {
        let values = new Map<string, any>();
        this.$inputList.forEach(function (input, key) {
            values.set(key, input.val());
        });
        return values;
    }

    /**
     * Resets the elements to their default values.  
     * Does not include buttons and submit elements
     */
    public reset() {
        if (this.$form === undefined) return;
        let _self = this;

        this.elements.forEach(function (element) {
            let $input = _self.$form.find("#" + _self.config.id + "_" + element.id);
            switch (element.type) {
                case "input":
                case "textarea":
                case "select": {
                    $input.val(element.value);
                    break;
                }
                case "checkbox": {
                    $input.attr("checked", element.value);
                    break;
                }
                default: { }
            }
        });
    }

    /**
     * Builds and appends an input element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildInput($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $("<input>");

        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "_" + element.id)
                .html(element.label)
                .appendTo($form);
        } else { $input.addClass("full-column"); }

        $input
            .attr("type", "text")
            .attr("id", this.config.id + "_" + element.id)
            .val(element.value)
            .appendTo($form);

        if (element.class) $input.addClass(element.class);

        return $input;
    }

    /**
     * Builds and appends an input element with a copy button
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildCopyInput($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $("<input>");
        let $inputbox = $("<div>").addClass("copybox");

        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "_" + element.id)
                .html(element.label)
                .appendTo($form);
        } else { $input.addClass("full-column"); }

        $input
            .attr("type", "text")
            .attr("id", this.config.id + "_" + element.id)
            .attr("readonly", "true")
            .val(element.value)
            .appendTo($inputbox);

        if (element.class) $input.addClass(element.class);

        let $copybutton = $("<button>")
            .attr("type", "button")
            .attr("id", this.config.id + "_" + element.id + "_copy")
            .html(`<i class="far fa-copy"></i>`)
            .appendTo($inputbox);


        $(this.config.parent).on("click", "form#" + this.config.id + " button#" + this.config.id + "_" + element.id + "_copy", function (event) {
            $input.select();
            document.execCommand("copy");
        });

        $inputbox.appendTo($form);

        return $input;
    }

    /**
     * Builds and appends a checkbox element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildCheckbox($form: JQuery<HTMLElement>, element: FormElement) {
        let $check_box = $("<div>").addClass("full-column");
        let $input = $("<input>");

        $("<label>")
            .attr("for", this.config.id + "_" + element.id)
            .html(element.label)
            .appendTo($check_box);
        $input
            .attr("type", "checkbox")
            .attr("id", this.config.id + "_" + element.id)
            .addClass("switch")
            .attr("checked", element.value)
            .appendTo($check_box);
        $("<label>")
            .attr("for", this.config.id + "_" + element.id)
            .addClass("switch")
            .appendTo($check_box);
        $check_box.appendTo($form);

        if (element.class) $check_box.addClass(element.class);

        return $input;
    }

    /**
     * Builds and appends a button element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildButton($form: JQuery<HTMLElement>, element: FormElement) {
        let $button_box = $("<div>").appendTo($form);
        let $input = $(`<button>`)
        if (!element.label) { $button_box.addClass("full-column"); }

        $input
            .attr("type", "button")
            .attr("id", this.config.id + "_" + element.id)
            .html(element.value)
            .appendTo($button_box);

        if (element.class) $button_box.addClass(element.class);

        return $input;
    }

    /**
     * Builds and appends a submit button
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildSubmit($form: JQuery<HTMLElement>, element: FormElement) {
        let $button_box = $("<div>").appendTo($form);
        let $input = $(`<button>`)
        if (!element.label) { $button_box.addClass("full-column"); }

        $input
            .attr("type", "submit")
            .attr("id", this.config.id + "_" + element.id)
            .html(element.value)
            .appendTo($button_box);

        if (element.class) $button_box.addClass(element.class);

        return $input;
    }

    /**
     * Builds and appends a textarea
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildTextarea($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $("<textbox>");

        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "_" + element.id)
                .html(element.label)
                .appendTo($form);
        } else { $input.addClass("full-column"); }

        $input
            .attr("type", "text")
            .attr("id", this.config.id + "_" + element.id)
            .val(element.value)
            .appendTo($form);

        if (element.class) $input.addClass(element.class);

        return $input;
    }

    /**
     * Builds and appends a select
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildSelect($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $("<select>");

        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "_" + element.id)
                .html(element.label)
                .appendTo($form);
        } else { $input.addClass("full-column"); }

        element.select.forEach(function (entry) {
            $("<option>").val(entry.value).text(entry.name).appendTo($input);
        });

        $input
            .attr("id", this.config.id + "_" + element.id)
            .val(element.value)
            .appendTo($form);

        if (element.class) $input.addClass(element.class);

        return $input;
    }

    /**
     * Builds and appends a div
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildDiv($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $("<div>")
            .addClass("full-column")
            .addClass("text-block")
            .html(element.label)
            .appendTo($form);
        return $input;
    }

    /**
     * Builds and appends an HR element
     * @param $form Form to append the element to
     * @param element Element configuration data
     */
    private buildHr($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $("<hr>")
            .addClass("full-column")
            .appendTo($form);
        return $input;
    }

}

interface FormConfig {
    /** Unique ID for the form */
    id: string,
    /** Number of columns that the form should take up */
    columns?: number,
    /** Nearest static parent, for improved performance */
    parent?: string,
}

interface FormElement {
    /** Unique ID for the element. Actual ID becomes formID_elementID */
    id?: string,
    /** Supported input type */
    type: "input" | "copyinput" | "checkbox" | "button" | "submit" | "textarea" | "select" | "div" | "hr",
    /** Default value for the input */
    value?: string,
    /** Input label */
    label?: string | HTMLElement,
    /** Value-name pairs for the select */
    select?: { value: string, name: string }[],
    /** Custom class to apply to the element */
    class?: string,
}
