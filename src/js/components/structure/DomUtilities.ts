import { GM } from "../api/GM";
import { Page, PageDefintion } from "../data/Page";

/**
 * StructureUtilities  
 * DOM changes that don't belong to any specific project
 */
export class DomUtilities {

    public static createStructure(): void {
        // Load in the external stylesheet
        GM.addStyle(GM.getResourceText("re621_styles"));

        // Create a modal container
        $("<div>").attr("id", "modal-container").prependTo("div#page");

        // Create a more sensible header structure
        const $menuContainer = $("nav#nav");
        const $menuMain = $("menu.main");

        if ($("nav#nav menu").length < 2) {
            $menuContainer.append(`<menu>`);
        }

        const $menuLogo = $("<menu>").addClass("logo desktop-only").html(`<a href="/" data-ytta-id="-">` + Page.getSiteName() + `</a>`);
        $menuContainer.prepend($menuLogo);

        const $menuExtra = $("<menu>").addClass("extra");
        $menuMain.after($menuExtra);

        $("menu:last-child").addClass("submenu");

        // Create a sticky searchbox container
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

        // Tweak the tag lists
        const $tags = $("#tag-box > ul > li, #tag-list > ul > li");
        $tags.each((index, element) => {
            const $container = $(element);

            const $tagLink = $container.find("a.search-tag").first();

            // Container for various actions - subscribe, add to blacklist, etc.
            const $actionsBox = $("<div>")
                .addClass("tag-actions")
                .attr("data-tag", $container.find("a.search-tag").text().replace(/ /g, "_"))
                .appendTo($container);
            $container.find("a.wiki-link").first().insertBefore($tagLink);

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
                .appendTo($actionsBox);

            // Subscribe button container
            $("<span>").addClass("tag-action-subscribe").appendTo($actionsBox);
        });

        /** Wrap the post description textareas in FormattingHelper compatible tags */
        if (Page.matches(PageDefintion.upload) || Page.matches(PageDefintion.post)) {
            const $textarea = $("textarea#post_description");

            $("<div>")
                .addClass("dtext-previewable")
                .append($(`<div class="dtext-preview">`))
                .insertBefore($textarea)
                .append($textarea);
        }

        // Prepare post-preview elements
        $("div#posts-container article.post-preview").each((index, element) => {
            $(element).find("a").first().addClass("preview-box");
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

        const $tab = $(`<li>`).appendTo("menu.extra");
        const $link = $("<a>")
            .html(config.name)
            .attr("title", config.title)
            .appendTo($tab);

        if (config.href) { $link.attr("href", config.href); }
        if (config.class) { $tab.addClass(config.class); }

        return $link;
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
}
