
/**
 * Removes the hassle of creating HTML elements for a form
 */
export class Form {

    private config: FormConfig;
    private elements: FormElement[] = [];

    private index: number = 0;
    private $form: JQuery<HTMLElement>;

    public constructor(config: FormConfig, elements: FormElement[]) {
        let _self = this;
        if (config.columns === undefined) config.columns = 1;
        if (config.parent === undefined) config.parent = "body";
        this.config = config;
        elements.forEach(function (element) { _self.addElement(element); });
    }

    public addElement(element: FormElement) {
        if (element.id === undefined) element.id = this.index + "";
        if (element.value === undefined) element.value = "";
        if (element.label === undefined) element.label = "";

        this.elements.push(element);
        this.index++;
    }

    public get(force?: boolean) {
        if (this.$form !== undefined && !force) { return this.$form; }

        let _self = this;
        this.$form = $("<form>")
            .attr("id", this.config.id)
            .addClass("grid-form");

        if (this.config.columns > 1) { this.$form.addClass("columns-" + this.config.columns); }
        let $inputList = new Map<string, JQuery<HTMLElement>>();

        this.elements.forEach(function (element) {
            let $input;
            switch (element.type) {
                case "input": {
                    $input = _self.buildInput(_self.$form, element);
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
                default: { }
            }
            $inputList.set(element.id, $input);
        });

        $(this.config.parent).on("submit", "form#" + this.config.id, function (event) {
            event.preventDefault();
            let values = new Map<string, any>();
            $inputList.forEach(function (input, key) { values.set(key, input.val()); })
            _self.$form.trigger("re-form:submit", values);
        });

        _self.$form.trigger("re-form:create");
        return _self.$form;
    }

    public reset() {
        if (this.$form === undefined) return;
        let _self = this;

        this.elements.forEach(function (element) {
            let $input = _self.$form.find("#" + _self.config.id + "_" + element.id);
            switch (element.type) {
                case "input": {
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

    private buildInput($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $("<input>");

        if (element.label) {
            $("<label>")
                .attr("for", this.config.id + "_" + element.id)
                .html(element.label)
                .appendTo($form);
        } else { $input.addClass("full-width"); }

        $input
            .attr("type", "text")
            .attr("id", this.config.id + "_" + element.id)
            .val(element.value)
            .appendTo($form);

        return $input;
    }

    private buildCheckbox($form: JQuery<HTMLElement>, element: FormElement) {
        let $check_box = $("<div>").addClass("full-width");
        let $input = $("<input>");

        $("<label>")
            .attr("for", this.config.id + "_" + element.id)
            .html(element.label)
            .appendTo($check_box);
        $input
            .attr("type", "checkbox")
            .attr("id", this.config.id + "_" + element.id)
            .attr("checked", element.value)
            .appendTo($check_box);
        $check_box.appendTo($form);

        return $input;
    }

    private buildButton($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $(`<button>`)
        if (!element.label) { $input.addClass("full-width"); }

        $input
            .attr("type", "button")
            .attr("id", this.config.id + "_" + element.id)
            .html(element.value)
            .appendTo($form);
        return $input;
    }

    private buildSubmit($form: JQuery<HTMLElement>, element: FormElement) {
        let $input = $(`<button>`)
        if (!element.label) { $input.addClass("full-width"); }

        $input
            .attr("type", "submit")
            .attr("id", this.config.id + "_" + element.id)
            .html(element.value)
            .appendTo($form);
        return $input;
    }
}

interface FormConfig {
    /** Unique ID for the form */
    id: string,
    /** Number of columns that the form should take up */
    columns?: 1,
    /** Nearest static parent, for improved performance */
    parent?: string,
}

interface FormElement {
    /** Unique ID for the element. Actual ID becomes formID_elementID */
    id?: string,
    /** Supported input type */
    type: "input" | "checkbox" | "button" | "submit",
    /** Default value for the input */
    value?: string,
    /** Input label */
    label?: string,
}
