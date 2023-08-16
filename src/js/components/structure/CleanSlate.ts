import { XM } from "../api/XM";
import { KeybindManager } from "../data/Keybinds";
import { Page, PageDefinition } from "../data/Page";
import { Debug } from "../utility/Debug";
import { ErrorHandler } from "../utility/ErrorHandler";
import { Util } from "../utility/Util";


declare const GM: any;
declare const attachedStylesheet: string;

export class CleanSlate {

    public static async createDOM(): Promise<boolean> {
        const actions: ActionDefinition[] = [];

        // Append stylesheets, inject scripts
        actions.push({
            selector: "head",
            action: async () => {
                try {
                    const stylesheet = Util.DOM.addStyle(
                        XM.isUserscript()
                            ? attachedStylesheet
                            : await XM.Connect.getResourceText("re621_css")
                    );
                    // Move the stylesheet to the bottom on load
                    // This prevents other styles from overriding it
                    $(() => { stylesheet.appendTo("head"); });
                    return Promise.resolve(stylesheet);
                }
                catch (error) { ErrorHandler.log("DOM", "styles", error.stack); }

                if (typeof GM == "undefined") {
                    $("<script>").attr("src", XM.Chrome.getResourceURL("injector.js")).appendTo("head");
                }
            },
        });

        // Create themes
        // E621's native theme switcher does it later, making the background briefly flash blue
        actions.push({
            selector: "body",
            action: () => {
                $("body").attr({
                    "re621": true,
                    "data-th-main": window.localStorage.getItem("theme"),
                    "data-th-extra": window.localStorage.getItem("theme-extra"),
                    "data-th-nav": window.localStorage.getItem("theme-nav"),
                });
            },
        });

        // Creates the modal container
        actions.push({
            selector: "#page",
            action: () => { $("<div>").attr("id", "modal-container").prependTo("div#page"); },
        });

        // Create the header
        actions.push({
            selector: "#nav",
            action: () => {

                // Add a section for re621 settings buttons
                $("#nav").addClass("re621-nav")
                $("<menu>")
                    .addClass("extra")
                    .insertAfter("#nav menu.main");

                // Replace the logo's URL if necessary
                // I don't remember why it's stored in LS
                const titlePageRouting = Util.LS.getItem("re621.mainpage") || "default";
                if(titlePageRouting !== "default")
                    $("#nav a.logo").attr("href", titlePageRouting);
            },
        });

        // Clear the existing thumbnails
        if (Page.matches([PageDefinition.posts.list, PageDefinition.favorites]) && Util.LS.getItem("re621.bs.enabled") === "true") {
            actions.push({
                selector: "div.paginator menu",
                action: () => {
                    $("div.paginator menu")
                        .css("display", "none")
                        .attr("id", "paginator-old")
                        .appendTo("body");

                    $("#content").html("");
                },
            });
        }

        if (Page.matches(PageDefinition.posts.view)) {
            actions.push({
                selector: "#image-container",
                action: () => {
                    if ($("#image-container").attr("data-file-ext") === "swf")
                        KeybindManager.block();
                }
            });
        }

        return this.elementsReady(actions);
    }

    /**
     * Awaits until the specified elements exist in the DOM, then runs the appropriate functions
     * @param actions Actions to watch for
     */
    private static async elementsReady(actions: ActionDefinition[]): Promise<boolean> {

        // console.log("awaiting " + actions.length + " items");

        const processed: Map<string, () => void> = new Map();

        for (const action of actions)
            processed.set(action.selector, action.action);

        let iterations = 0;
        return new Promise((resolve) => {

            const observer = new MutationObserver(() => {

                // console.log("iteration", iterations);
                for (const [selector, action] of processed.entries()) {
                    if ($(selector).length == 0) continue;
                    // console.log("found [" + selector + "]");
                    processed.delete(selector);
                    action();
                }

                iterations++;
                if (processed.size == 0) {
                    observer.disconnect();
                    resolve(true);
                } else if (iterations > 100) {
                    observer.disconnect();
                    resolve(false);
                }
            });
            observer.observe(document, { childList: true, subtree: true });

            $(() => {
                observer.disconnect();
                for (const action of processed.values())
                    action();
                resolve(false);
            })
        });
    }

    /** Returns a promise that gets resolved if and when the window is visible on the screen */
    public static async awaitFocus(): Promise<boolean> {
        return new Promise((resolve) => {

            // Document either has direct user focus, or is generally visible on the screen
            if (document.hasFocus() || document.visibilityState == "visible") {
                resolve(true);
                return;
            }
            Debug.log("CleanSlate: waiting for focus");

            // Window receives focus
            $(window).one("focus", () => {
                Debug.log("CleanSlate: received focus");
                resolve(true);
            });
        });
    }
}

interface ActionDefinition {
    selector: string;
    action: () => void;
}
