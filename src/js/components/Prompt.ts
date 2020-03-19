import { Modal } from "./Modal";

/**
 * Creates a draggable window asking for user input
 */
export class Prompt extends Modal {

    constructor(title: string = "Prompt") {
        super({
            title: "Prompt",
            width: "40%",
            height: "auto",
            position: {
                left: "25%",
                top: "25%",
            },
        });
    }

}
