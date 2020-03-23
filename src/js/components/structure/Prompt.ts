import { Modal } from "./Modal";

/**
 * Creates a draggable window asking for user input
 */
export class Prompt extends Modal {

    private promise;

    private $form: JQuery<HTMLElement>;
    private $input: JQuery<HTMLElement>;

    constructor(title: string = "Prompt") {
        super({
            title: title,
            fixed: true,
            minHeight: 50,
        });

        this.createForm();
        this.addContent(this.$form);
        this.open();
        this.$input.focus();

        this.promise = new Promise((resolve, reject) => {
            this.$form.submit(event => {
                event.preventDefault();
                this.destroy();
                resolve(this.$input.val());
            });
        });
    }

    private createForm() {
        this.$form = $("<form>")
            .addClass("prompt-input");

        this.$input = $("<input>")
            .attr("id", "text")
            .appendTo(this.$form);

        $("<button>")
            .attr("type", "submit")
            .html("Submit")
            .appendTo(this.$form);
    }

    public getPromise() {
        return this.promise;
    }
}
