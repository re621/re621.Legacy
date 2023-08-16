import Script from "../models/data/Script";
import Modal from "../models/structure/Modal";
import PageObserver from "../models/structure/PageObserver";


export class ErrorHandler {

    public static async write(message: string, error?: Error): Promise<void> {
        const notice = $("<div>").html([
            `<p>RE621 had encountered an error during script execution.</p>`,
            `<p>Please, report this message, including the error log below, through the <a href="${Script.url.issues}">issue tracker</a>, or in the <a href="${Script.url.thread}">forum thread</a>.</p>`,
        ].join("\n"));
        const textarea = $("<textarea>").val([
            `RE621 v.${Script.version} for ${Script.handler.name} v.${Script.handler.version}`,
            window.navigator.userAgent,
            message,
            (error && error.stack) ? error.stack : error,
        ].join("\n"));

        console.error([
            "[ErrorHandler]",
            notice.text().trim(),
            (textarea.val() + "").trim(),
        ].join("\n"));

        if (!Modal.isReady)
            await PageObserver.watch("modal-container");

        const dialog = new Modal({
            title: "Error",
            autoOpen: true,

            width: 650,
            position: { my: "center", at: "center center-15%" }

        });
        dialog.getElement()
            .addClass("error-handler")
            .append(notice)
            .append(textarea);
    }

    /**
     * @deprecated
     */
    public static async log(_module: "ModuleController" | "DOM" | string, message: string, error?: Error): Promise<void> {
        return this.write(message, error);
    }

}
