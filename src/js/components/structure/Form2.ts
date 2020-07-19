import { XM } from "../api/XM";
import { Util } from "../utility/Util";

export class Form2 {

    private static inputTimeout = 500;          // Typing timeout on text input fields

    private created: boolean;                   // Used for caching, true if get() has been called before
    private element: JQuery<HTMLElement>;       // DOM element for the form
    private content: Form2Element[];            // Array of form elements

    private inputList: Map<string, JQuery<HTMLElement>>;

    /**
     * Prepares the form structure and settings.  
     * Use `get()` to return an actual DOM element.
     * @param options Form options
     * @param content Form elements
     * @param onSubmit Form submittion callback
     */
    public constructor(options?: SectionOptions, content?: Form2Element[], onSubmit?: FormSubmitEvent) {
        this.element = $("<form>")
            .addClass("form-section")
            .attr({
                "id": FormUtils.getUniqueID(),
                "columns": options.columns || 1,
                "formspan": options.width || 1,
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
    public get(force = false): JQuery<HTMLElement> {
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
     * Creates a form section FormElement based on the provided parameters  
     * @param options Section configuration
     * @param content Form elements
     */
    public static section(options?: SectionOptions, content?: Form2Element[]): Form2Element {
        if (!options.name) options.name = FormUtils.getUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = $("<form-section>")
            .attr({
                "id": options.name,
                "labeled": options.label !== undefined,
                "columns": options.columns || 1,
                "colspan": options.width || 1,
            });

        return new Form2Element($element, $label, undefined, content);
    }

    /**
     * Creates an input FormElement based on the provided parameters  
     * @param options Element configuration
     * @param changed Input change callback
     */
    public static input(options?: InputElementOptions, changed?: InputChangeEvent): Form2Element {
        if (!options.name) options.name = FormUtils.getUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.width);

        const $input = $("<input>")
            .attr({
                "type": "text",
                "id": options.name,
                "name": options.name,
            })
            .addClass("bg-section color-text")
            .appendTo($element);

        if (options.value !== undefined) {
            $input
                .val(options.value)
                .attr("defval", options.value);
        }

        if (options.pattern) { $input.attr("pattern", options.pattern); }
        if (options.required) { $input.attr("required", ''); }

        if (changed !== undefined) {
            let timer: number;
            $input.on("input", () => {
                if (timer) clearTimeout(timer);
                timer = window.setTimeout(
                    () => { changed($input.val().toString()); },
                    Form2.inputTimeout
                );
            });
        }

        return new Form2Element($element, $input, $label);
    }

    /**
     * Creates a copy input FormElement based on the provided parameters  
     * @param options Element configuration
     */
    public static copy(options?: ElementOptions): Form2Element {
        if (!options.name) options.name = FormUtils.getUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.width)
            .addClass("copybox");

        const $input = $("<input>")
            .attr({
                "type": "text",
                "id": options.name,
                "readonly": "",
            })
            .addClass("bg-section color-text")
            .val(options.value)
            .appendTo($element);

        const $copybutton = $("<button>")
            .attr({
                "type": "button",
                "id": options.name + "-copy",
            })
            .addClass("button btn-neutral border-highlight border-left")
            .html(`<i class="far fa-copy"></i>`)
            .appendTo($element);

        $($copybutton).click(function () {
            XM.Util.setClipboard($input.val());
        });

        return new Form2Element($element, $input, $label);
    }

    /**
     * Creates a button FormElement based on the provided parameters  
     * @param options Element configuration
     * @param changed Input change callback
     */
    public static button(options?: ElementOptions & { "type"?: "submit" | "button" }, changed?: InputChangeEvent): Form2Element {
        if (!options.name) options.name = FormUtils.getUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.width);

        const $input = $("<button>")
            .attr({
                "id": options.name,
                "type": options.type ? options.type : "button",
            })
            .addClass("button btn-neutral")
            .html(options.value)
            .appendTo($element);

        if (changed !== undefined)
            $input.on("click", () => { changed(true); });

        return new Form2Element($element, $input, $label);
    }

    /**
     * Creates a select FormElement based on the provided parameters  
     * @param options Element configuration
     * @param content Select options data
     * @param changed Input change callback
     */
    public static select(options?: ElementOptions, content?: { [name: string]: any }, changed?: InputChangeEvent): Form2Element {
        if (!options.name) options.name = FormUtils.getUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.width);

        const $input = $("<select>")
            .attr({
                "id": options.name,
                "name": options.name,
            })
            .addClass("button btn-neutral")
            .appendTo($element);

        for (const key in content) {
            $("<option>").val(key).text(content[key]).appendTo($input);
        }
        if (options.value !== undefined) {
            $input
                .val(options.value)
                .attr("defval", options.value);
        }

        if (changed !== undefined)
            $input.on("change", () => { changed($input.val().toString()); });

        return new Form2Element($element, $input, $label);
    }

    /**
     * Creates a div FormElement based on the provided parameters  
     * @param options Element configuration
     */
    public static div(options?: ElementOptions): Form2Element {
        if (!options.name) options.name = FormUtils.getUniqueID();

        let $label: JQuery<HTMLElement>;
        if (options.label)
            $label = FormUtils.makeLabel(options.name, options.label);

        const $element = FormUtils
            .makeInputWrapper(options.label, options.width)
            .addClass("text-div")
            .append(options.value);

        return new Form2Element($element, $label);
    }

    /**
     * Creates an hr FormElement based on the provided parameters  
     * @param width Element width
     */
    public static hr(width?: number): Form2Element {
        const $element = FormUtils.makeInputWrapper(undefined, width);

        $("<hr>")
            .attr("id", FormUtils.getUniqueID())
            .addClass("color-text-muted")
            .appendTo($element);

        return new Form2Element($element);
    }
}

class FormUtils {

    private static elementIDs: string[] = [];   // Used to make sure that IDs are unique

    /** Creates and returns a unique element ID */
    public static getUniqueID(): string {
        let uniqueID: string;
        do { uniqueID = Util.makeID(8); }
        while (this.elementIDs.includes(uniqueID));
        this.elementIDs.push(uniqueID);
        return uniqueID;
    }

    public static makeLabel(name: string, text: string): JQuery<HTMLElement> {
        return $("<label>")
            .attr("for", name)
            .html(text);
    }

    public static makeInputWrapper(label: string, width: number): JQuery<HTMLElement> {
        return $("<form-input>")
            .attr({
                "labeled": label !== undefined,
                "colspan": width || 1
            });
    }

}

class Form2Element {

    private created: boolean;               // Used for caching, true if build() has been called before
    private element: JQuery<HTMLElement>;   // Container element
    private input: JQuery<HTMLElement>;     // Actual form element, if it exists
    private label: JQuery<HTMLElement>;     // Input label, if it exists
    private content: Form2Element[];        // Additional elements to be appended

    public constructor(element: JQuery<HTMLElement>, input?: JQuery<HTMLElement>, label?: JQuery<HTMLElement>, content?: Form2Element[]) {
        this.element = element;
        this.input = input;
        this.label = label;
        this.content = content ? content : [];
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
                for (const childElem of entry.build(parentID + "-" + this.element.attr("id"), force))
                    childElem.appendTo(this.element);
            }
            this.created = true;

            if (this.label !== undefined) this.label.attr("for", parentID + "-" + this.label.attr("for"));
            if (this.input !== undefined) this.input.attr("id", parentID + "-" + this.input.attr("id"));
        }

        if (this.label) return [this.label, this.element];
        else return [this.element];
    }

}

interface SectionOptions {
    name?: string;
    label?: string;
    columns?: number;
    width?: number;
}

interface ElementOptions {
    name?: string;
    label?: string;
    value?: any;
    width?: number;
}

interface InputElementOptions extends ElementOptions {
    required?: boolean;
    pattern?: string;
}

type FormSubmitEvent = (values: any, form: Form2) => void;
type InputChangeEvent = (value: any) => void;
