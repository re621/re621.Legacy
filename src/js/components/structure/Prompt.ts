import { Modal } from "./Modal";

/**
 * Creates a draggable window asking for user input
 */
export class Prompt extends Modal {

  private promise: Promise<string | number | string[]>;

  private $form: JQuery<HTMLElement>;

  private $input: JQuery<HTMLElement>;

  constructor (title = "Prompt") {
    super({
      title: title,
      fixed: true,
      minHeight: 50,
    });

    this.createForm();
    this.addContent(this.$form);
    this.open();
    this.$input.trigger("focus");

    this.promise = new Promise((resolve, reject) => {
      this.$form.on("submit", (event) => {
        event.preventDefault();
        this.destroy();
        resolve(this.$input.val());
        reject();
      });
    });
  }

  private createForm (): void {
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

  public getPromise (): Promise<string | number | string[]> {
    return this.promise;
  }
}
