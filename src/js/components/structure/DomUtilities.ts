import { XM } from "../api/XM";
import { Page, PageDefintion } from "../data/Page";
import { ErrorHandler } from "../ErrorHandler";
import { Util } from "./Util";

declare const GM;

/**
 * StructureUtilities  
 * DOM changes that don't belong to any specific project
 */
export class DomUtilities {

    /**
     * Builds the structures used by several modules.  
     * Returns a promise that is fulfilled when all DOM is created
     */
    public static async createStructure(): Promise<void> {
        return this.prepareStructure().then(this.buildStructure);
    }

    /**
     * Builds elements that would make the page jump around.  
     * They should be loaded as soon as their parent element exists.
     */
    private static async prepareStructure(): Promise<any> {
        try { await DomUtilities.elementReady("head", DomUtilities.addStylesheets); }
        catch (error) { ErrorHandler.error("DOM", error.stack, "styles"); }

        // This is terrible for performance, so keep the number of these to a minimum
        try {
            const promises: Promise<any>[] = [];
            promises.push(DomUtilities.elementReady("head", DomUtilities.injectChromeScript));
            promises.push(DomUtilities.elementReady("body", DomUtilities.createThemes));
            promises.push(DomUtilities.elementReady("div#page", DomUtilities.createModalContainer));
            promises.push(DomUtilities.elementReady("menu.main", DomUtilities.createHeader));
            return Promise.all(promises);
        } catch (error) {
            ErrorHandler.error("DOM", error.stack, "prepare");
            return Promise.reject();
        }
    }

    /**
     * Build the less important elements that can wait until the page fully loads.  
     * This function mainly exists for the sake of performance issues caused by prepareStructure()
     */
    private static async buildStructure(): Promise<void> {
        return new Promise((resolve) => {
            $(() => {
                try {
                    DomUtilities.createSearchbox();
                    DomUtilities.createTagList();
                    DomUtilities.createFormattedTextareas();
                    DomUtilities.createPostPreviews();
                } catch (error) { ErrorHandler.error("DOM", error.stack, "build"); }
                resolve();
            });
        });
    }

    /**
     * Attaches Chrome extension's injector script to the header.  
     * Does nothing in the userscript version.  
     */
    private static async injectChromeScript(): Promise<any> {
        if (typeof GM !== "undefined") return Promise.resolve();

        $("<script>").attr("src", XM.Chrome.getResourceURL("injector.js")).appendTo("head");
        return Promise.resolve();
    }

    /**
     * Attaches the script's stylesheets to the document.  
     * This is handled throught the manifest in the extension version.  
     */
    private static async addStylesheets(): Promise<any> {
        return XM.Connect.getResourceText("re621_css").then(
            (css) => { return Promise.resolve(DomUtilities.addStyle(css)); },
            () => { return Promise.reject(); }
        )
    }

    /**
     * Sets the saved theme as soon as possible.
     * E621's theme switched does it later, making the background briefly flash blue
     */
    private static createThemes(): void {
        $("body").attr("data-th-main", window.localStorage.getItem("theme"));
        $("body").attr("data-th-extra", window.localStorage.getItem("theme-extra"));
        $("body").attr("data-th-nav", window.localStorage.getItem("theme-nav"));
    }

    /**
     * Creates the container that all modals attach themselves to
     */
    private static createModalContainer(): void {
        $("<div>").attr("id", "modal-container").prependTo("div#page");
    }

    /**
     * Creates a gridified header structure
     */
    private static createHeader(): void {
        const $menuContainer = $("nav#nav");
        const $menuMain = $("menu.main");

        if ($("nav#nav menu").length < 2) {
            $menuContainer.append(`<menu>`);
        }

        const $menuLogo = $("<menu>").addClass("logo desktop-only").html(`<a href="/" data-ytta-id="-">` + Page.getSiteName() + `</a>`);
        $menuContainer.prepend($menuLogo);
        $menuMain.find("a[href='/']").remove();

        const $menuExtra = $("<menu>").addClass("extra");
        $menuMain.after($menuExtra);

        $("menu:last-child").addClass("submenu");

        $menuContainer.addClass("grid");
    }

    /**
     * Creates a sticky searchbox container
     */
    private static createSearchbox(): void {
        if (Page.matches([PageDefintion.search, PageDefintion.post, PageDefintion.favorites])) {
            const $searchContainer = $("<div>").attr("id", "re621-search").prependTo("aside#sidebar");
            $("aside#sidebar section#search-box").appendTo($searchContainer);
            $("aside#sidebar section#mode-box").appendTo($searchContainer);

            const observer = new IntersectionObserver(
                ([event]) => {
                    $(event.target).toggleClass("re621-search-sticky bg-foreground", event.intersectionRatio < 1)
                },
                { threshold: [1] }
            );

            observer.observe($searchContainer[0]);
        }
    }

    /**
     * Re-structures the tag lists
     */
    private static createTagList(): void {
        $("#tag-box > ul > li, #tag-list > ul > li").each((index, element) => {
            const $container = $(element);

            const $tagLink = $container.find("a.search-tag").first();
            const $tagWrap = $("<span>").addClass("tag-wrap").insertAfter($tagLink).append($tagLink);

            // Container for various actions - subscribe, add to blacklist, etc.
            const $actionsBox = $("<div>")
                .addClass("tag-actions")
                .attr("data-tag", $container.find("a.search-tag").text().replace(/ /g, "_"))
                .appendTo($container);
            $container.find("a.wiki-link").first().insertBefore($tagWrap);

            //   ELEMENT   - METHOD  - STATE
            // - blacklist - display - hover
            // - tag count - display - normal
            // - subscribe - visibility - always

            // Blacklist button container
            $("<span>").addClass("tag-action-blacklist").appendTo($actionsBox);

            // Tag counter container
            const $countBox = $container.find(".post-count").first();
            $countBox
                .addClass("re621-post-count")
                .attr("data-count-short", $countBox.text())
                .insertAfter($tagLink);

            // Subscribe button container
            $("<span>").addClass("tag-action-subscribe").appendTo($actionsBox);
        });
    }

    /**
     * Wraps all appropriate textareas in FormattingHelper-readable structures
     */
    private static createFormattedTextareas(): void {
        /** Wrap the post description textareas in FormattingHelper compatible tags */
        if (Page.matches(PageDefintion.upload) || Page.matches(PageDefintion.post)) {
            const $textarea = $("textarea#post_description");

            $("<div>")
                .addClass("dtext-previewable")
                .append($(`<div class="dtext-preview">`))
                .insertBefore($textarea)
                .append($textarea);
        }
    }

    /**
     * Wraps all post-previews in ThumbnailEnhancer-readable structures
     */
    private static createPostPreviews(): void {
        $("div#posts-container article.post-preview").each((index, element) => {
            $(element).find("a").first().addClass("preview-box");
        });
    }

    /**
     * Fires the callback as soon as the specified element exists.  
     * Runs every 250ms, and gives up after 10 seconds
     * @param element Selector to search for
     * @param callback Callback function
     */
    private static async elementReady(element: string, callback: Function): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let timeout = 0;
            while ($(element).length == 0 && timeout < (1000 * 10)) {
                await new Promise((resolve) => { window.setTimeout(() => { resolve(); }, 100) });
                timeout += 100;
            }

            if ($(element).length > 0) { callback(); resolve(); }
            else reject();
        });
    }

    /**
     * Adds a button to the top-right of the navbar
     * @param config Button configuration
     */
    public static addSettingsButton(config: SettingsButton): JQuery<HTMLElement> {
        if (config.name === undefined) config.name = "T";
        if (config.href === undefined) config.href = "";
        if (config.title === undefined) config.title = "";
        if (config.class === undefined) config.class = "";
        if (config.attr === undefined) config.attr = {};

        const $tab = $(`<li>`).appendTo("menu.extra");
        const $link = $("<a>")
            .html(config.name)
            .attr("title", config.title)
            .appendTo($tab);

        if (config.href) { $link.attr("href", config.href); }
        if (config.class) { $tab.addClass(config.class); }
        if (config.attr) { $link.attr(config.attr); }

        return $link;
    }

    /**
     * Adds the given style to the document and returns the injected style element
     * @param css string CSS styles
     */
    public static addStyle(css: string): JQuery<HTMLElement> {
        return $("<style>")
            .attr({
                "id": getID(),
                "type": "text/css"
            })
            .html(css)
            .appendTo("head");

        function getID(): string {
            let id: string;
            do { id = Util.makeID(); }
            while ($("style#" + id).length > 0);
            return id;
        }
    };

    /**
     * Returns a base-64 encoded image used for placeholder during lazy loading
     */
    public static getPlaceholderImage(): string {
        return "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    }

}

interface SettingsButton {
    /** Text inside the link */
    name?: string;
    /** Link address */
    href?: string;
    /** Hover text */
    title?: string;

    /** Extra class to append to the tab */
    class?: string;

    /** Name-value pairs of the attribute to set */
    attr?: { [prop: string]: string };
}
