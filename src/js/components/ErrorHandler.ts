import { XM } from "./api/XM";
import { RE6Module } from "./RE6Module";
import { Modal } from "./structure/Modal";

declare const UAParser;

export class ErrorHandler {

    private static instance: ErrorHandler;

    private modal: Modal;

    private feedback: JQuery<HTMLElement>;
    private trigger: JQuery<HTMLElement>;

    private constructor() {
        const $contentWrapper = $("<div>")
            .append("<p>RE621 has encountered an error during script execution.</p>")
            .append(`<p>Please, report this message, including the error log below, through the <a href="` + window["re621"]["links"]["issues"] + `">issue tracker</a>, or in the <a href="` + window["re621"]["links"]["forum"] + `">forum thread</a>.</p>`);

        this.feedback = $("<textarea>")
            .addClass("error-feedback bg-section color-text")
            .val(
                window["re621"]["name"] + ` v.` + window["re621"]["version"] + `-` + window["re621"]["build"] + ` for ` + XM.info().scriptHandler + ` v.` + XM.info().version + `\n` +
                window.navigator.userAgent + `\n`
            )
            .appendTo($contentWrapper);

        this.trigger = $("<a>");

        this.modal = new Modal({
            title: "An error has occurred",
            content: $contentWrapper,
            triggers: [{ element: this.trigger }],

            fixed: true,
        });

        this.modal.getElement().dialog("open");
    }

    private static getInstance(): ErrorHandler {
        if (this.instance === undefined) this.instance = new ErrorHandler();
        return this.instance;
    }

    /**
     * Writes a message into the error log, but does not trigger the error modal to open.  
     * Useful if you need to write several messages into the log.  
     * @param module Module that triggered the error. ex. TinyAlias
     * @param message Error message, preferably the stack trace
     * @param context Error context. ex. API Lookup
     */
    public static log(module: "ModuleController" | "DOM" | { new(): RE6Module }, message: string, context?: string): void {
        const instance = this.getInstance();

        if (typeof module !== "string") module = module.prototype.constructor.name;
        if (context !== undefined) module += "/" + context;

        instance.feedback.val((index, value) => {
            const entry = (value === "") ? module + "\n" + message + "\n" : value + "\n" + module + "\n" + message + "\n";
            console.log(entry);
            return entry;
        });
    }

    /**
     * Writes a message into the error log and shows it to the user. 
     * @param module Module that triggered the error. ex. TinyAlias
     * @param message Error message, preferably the stack trace
     * @param context Error context. ex. API Lookup
     */
    public static error(module: "ModuleController" | "DOM" | { new(): RE6Module }, message: string, context?: string): void {
        const instance = this.getInstance();
        if (!instance.modal.isOpen()) instance.trigger.get(0).click();
        this.log(module, message, context);
    }

    public static async report(): Promise<boolean> {
        //    if(await XM.Storage.getValue("re621.stats", false)) return;
        //    XM.Storage.setValue("re621.stats", true);

        const userAgent = UAParser(navigator.userAgent);
        const userInfo = {
            browserName: userAgent.browser.name,
            browserVersion: userAgent.browser.major,
            osName: userAgent.os.name,
            osVersion: userAgent.os.version,
            handlerName: XM.info().scriptHandler,
            handlerVersion: XM.info().version,
        }

        XM.Connect.xmlHttpRequest({
            method: "POST",
            url: "https://bitwolfy.com/re621/report.php",
            headers: { "User-Agent": window["re621"]["useragent"] },
            data: JSON.stringify(userInfo),
            onload: (data) => { console.log(JSON.parse(data.responseText)); }
        });

        return Promise.resolve(true);
    }

}

export class Patcher {

    public static version: number;

    /**
     * Runs patch-ups on the settings to preserve backwards compatibility.  
     * All patches MUST be documented and versioned.
     */
    public static async run(): Promise<void> {

        let counter = 0;

        Patcher.version = await XM.Storage.getValue("re621.patchVersion", 0);

        // Patch 1 - Version 1.3.5
        // The subscription modules were renamed to make the overall structure more clear.
        // Cache was removed from the module settings to prevent event listeners from being
        // triggered needlessly.
        if (Patcher.version < 1) {
            for (const type of ["Comment", "Forum", "Pool", "Tag"]) {
                const entry = await XM.Storage.getValue("re621." + type + "Subscriptions", undefined);
                if (entry === undefined) continue;
                if (entry["cache"] !== undefined) {
                    await XM.Storage.setValue("re621." + type + "Tracker.cache", entry["cache"]);
                    delete entry["cache"];
                    counter++;
                }
                await XM.Storage.setValue("re621." + type + "Tracker", entry);
                await XM.Storage.deleteValue("re621." + type + "Subscriptions");
                counter++;
            }
            Patcher.version = 1;
        }

        // Patch 2 - Version 1.3.7
        // The "Miscellaneous" module was split apart into several more specialized modules
        if (Patcher.version < 2) {
            const miscSettings = await XM.Storage.getValue("re621.Miscellaneous", {}),
                searchUtilities = await XM.Storage.getValue("re621.SearchUtilities", {});

            for (const property of ["improveTagCount", "shortenTagNames", "collapseCategories", "hotkeyFocusSearch", "hotkeyRandomPost"]) {
                if (miscSettings.hasOwnProperty(property)) {
                    searchUtilities[property] = miscSettings[property];
                    delete miscSettings[property];
                    counter++;
                }
            }

            for (const property of ["removeSearchQueryString", "categoryData"]) {
                if (miscSettings.hasOwnProperty(property)) {
                    delete miscSettings[property];
                    counter++;
                }
            }

            await XM.Storage.setValue("re621.Miscellaneous", miscSettings);
            await XM.Storage.setValue("re621.SearchUtilities", searchUtilities);

            Patcher.version = 2;
        }

        Debug.log(`Patcher: ${counter} records changed`)
        await XM.Storage.setValue("re621.patchVersion", Patcher.version);
    }

}

export class Debug {

    private static enabled: boolean;
    private static connect: boolean;

    /** Initialize the debug logger */
    public static async init(): Promise<boolean> {
        Debug.enabled = await XM.Storage.getValue("re621.debug.enabled", false);
        Debug.connect = await XM.Storage.getValue("re621.debug.connect", false);
        return Promise.resolve(true);
    }

    /** Returns true if the debug messages are enabled, false otherwise */
    public static isEnabled(): boolean {
        return Debug.enabled;
    }

    /** Enables or disables the debug message output */
    public static setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        XM.Storage.setValue("re621.debug.enabled", enabled);
    }

    /** Logs the provided data into the console log if debug is enabled */
    public static log(...data: any[]): void {
        if (Debug.enabled) console.log(...data);
    }

    /** Returns true if connections log is enabled, false otherwise */
    public static isConnectLogEnabled(): boolean {
        return Debug.connect;
    }

    /** Enables or disables the connect log output */
    public static setConnectLogEnabled(enabled: boolean): void {
        this.connect = enabled;
        XM.Storage.setValue("re621.debug.connect", enabled);
    }

    /** Logs the provided data into the console log if connections logging is enabled */
    public static connectLog(...data: any[]): void {
        if (Debug.connect) console.warn("CONNECT", ...data);
    }

}
