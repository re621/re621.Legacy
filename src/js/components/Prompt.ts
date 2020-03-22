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
        });

        let _self = this;

        this.createForm();
        this.addContent(this.$form);
        this.open();
        this.$input.focus();

        this.promise = new Promise(function (resolve, reject) {
            _self.$form.submit(function (event) {
                event.preventDefault();
                _self.destroy();
                resolve(_self.$input.val());
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
