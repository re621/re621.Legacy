import { XM } from "../api/XM";
import { Page, PageDefintion } from "../data/Page";
import { ErrorHandler } from "../utility/ErrorHandler";
import { Util } from "../utility/Util";
import { DomUtilities } from "./DomUtilities";


declare const GM: any;

export class CleanSlate {

    public static async run(): Promise<boolean> {
        const actions: ActionDefinition[] = [];

        // Append stylesheets, inject scripts
        actions.push({
            selector: "head",
            action: async () => {
                try {
                    const css = await XM.Connect.getResourceText("re621_css")
                    const stylesheet = DomUtilities.addStyle(css);
                    // Move the stylesheet to the bottom on load
                    // This prevents other styles from overriding it
                    $(() => { stylesheet.appendTo("head"); });
                    return Promise.resolve(stylesheet);
                }
                catch (error) { ErrorHandler.error("DOM", error.stack, "styles"); }

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
        })

        // Create the header
        actions.push({
            selector: "#nav",
            action: () => {
                const $menuContainer = $("nav#nav");
                const $menuMain = $("menu.main");

                if ($("#nav").find("menu").length < 2) {
                    $menuContainer.append(`<menu>`);
                }

                // Replace the logo in menu.main with a separate element
                const titlePageRouting = Util.LS.getItem("re621.mainpage") || "default";
                $("<menu>")
                    .addClass("logo desktop-only")
                    .html(`<a href="${titlePageRouting == "default" ? "/" : "/" + titlePageRouting}" data-ytta-id="-">` + Page.getSiteName() + `</a>`)
                    .prependTo($menuContainer);
                $menuMain.find("a[href='/']").remove();

                // Add a section for re621 settings buttons
                $("<menu>")
                    .addClass("extra")
                    .insertAfter($menuMain);

                $menuContainer.addClass("grid");
            },
        })

        // Clear the existing thumbnails
        if (Page.matches([PageDefintion.search, PageDefintion.favorites]) && Util.LS.getItem("re621.bs.enabled") === "true") {
            actions.push({
                selector: "div.paginator menu",
                action: () => {
                    $("div.paginator menu")
                        .css("display", "none")
                        .attr("id", "paginator-old")
                        .appendTo("body");

                    $("#content").html("");
                },
            })
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
            new MutationObserver(function () {

                // console.log("iteration", iterations);

                for (const [selector, action] of processed.entries()) {
                    if ($(selector).length == 0) continue;
                    // console.log("found [" + selector + "]");
                    processed.delete(selector);
                    action();
                }

                iterations++;
                if (processed.size == 0) {
                    this.disconnect();
                    resolve(true);
                } else if (iterations > 100) {
                    this.disconnect();
                    resolve(false);
                }
            }).observe(document, { childList: true, subtree: true });
        });
    }

    public static async awaitFocus(): Promise<boolean> {
        return new Promise((resolve) => {
            if (document.hasFocus()) { resolve(true); return; }
            $(window).one("focus", () => {
                resolve(true);
            });
        });
    }

}

interface ActionDefinition {
    selector: string;
    action: () => void;
}
