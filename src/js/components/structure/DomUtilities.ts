import { Page, PageDefinition } from "../data/Page";
import { Util } from "../utility/Util";

/**
 * StructureUtilities  
 * DOM changes that don't belong to any specific project
 */
export class DomUtilities {

    /** Creates a sticky search box container */
    public static createSearchbox(): void {

        // If favorites are private, the sidebar does not exist
        if (Page.matches([PageDefinition.search, PageDefinition.post, PageDefinition.favorites]) && $("aside#sidebar").length > 0) {
            const $searchContainer = $("<div>").attr("id", "re621-search").prependTo("aside#sidebar");
            $("aside#sidebar section#search-box").appendTo($searchContainer);
            $("aside#sidebar section#mode-box").appendTo($searchContainer);

            const observer = new IntersectionObserver(
                ([event]) => { $(event.target).toggleClass("re621-search-sticky bg-foreground", event.intersectionRatio < 1) },
                { threshold: [1] }
            );

            observer.observe($searchContainer[0]);
        }
    }

    /**
     * Re-structures the tag lists
     */
    public static createTagList(): void {
        $("#tag-box > ul > li, #tag-list > ul > li").each((index, element) => {
            const $container = $(element);

            const $tagLink = $container.find("a.search-tag").first();
            $("<span>").addClass("tag-wrap").insertAfter($tagLink).append($tagLink);

            // Container for various actions - subscribe, add to blacklist, etc.
            const $actionsBox = $("<div>")
                .addClass("tag-actions")
                .attr("data-tag", $container.find("a.search-tag").text().replace(/ /g, "_"))
                .appendTo($container);

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
     * Adds a button to the top-right of the navbar
     * @param config Button configuration
     */
    public static addSettingsButton(config: SettingsButton): JQuery<HTMLElement> {
        if (config.name === undefined) config.name = "T";
        if (config.href === undefined) config.href = "";
        if (config.title === undefined) config.title = "";

        if (config.tabClass === undefined) config.tabClass = "";
        if (config.linkClass === undefined) config.linkClass = "";

        if (config.attr === undefined) config.attr = {};

        const $tab = $(`<li>`).appendTo("menu.extra");
        const $link = $("<a>")
            .html(config.name)
            .attr({
                "title": config.title,
                "id": config.id,
            })
            .appendTo($tab);

        if (config.onClick !== undefined)
            $link.on("click", () => { config.onClick($link); });

        if (config.href) { $link.attr("href", config.href); }
        if (config.tabClass) { $tab.addClass(config.tabClass); }
        if (config.linkClass) { $link.addClass(config.linkClass); }
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
                "id": Util.ID.make(),
                "type": "text/css"
            })
            .html(css)
            .appendTo("head");
    };

    /**
     * Returns a base-64 encoded image used for placeholder during lazy loading
     */
    public static getPlaceholderImage(): string {
        return "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    }

    public static getKoFiImage(): string {
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALsAAAAkBAMAAAAjjlbPAAAAHlBMVEVDS1dDS1dDS1f+/v5DS1fi4uOLjpO8vcD/X1z/p6boDZakAAAAA3RSTlMCtVgF8JOLAAACCElEQVRIx+3XMW7bMBQGYLUnCIoeoENv8OuZ8NbAP8kDUBTRWbRyANLxAbKwc1AguW0H2nJSq6kBV0sRDhpI4BP19PhINs3Hz1yofWqapllMJ2+a5sNyOm+b5uuCPL8sGRvypllS57d3/gLe+KmF+O95jVOTuCiP1eGLxvFySftoffw7Lw5S+xKgLuadj8nnN/j1T3x/BFo61FmksMPFvJDuzeCU8lyKQ8sN6ixSJrin7XRmIBmSsuio0ZE0TnmSFooaPXcIW3hukWnRz/BSSinlES31ke9HoaNuNx2FJATOKcILyUGckHSC6DxyggzACKeYPOI5vz7ngdUrnkNrxK6YMumyFdIIjVUc2hqcTUs3Cod2NjgHfjjyYYf4ghcOHUWLdx0ppJBWkbqlXVV+EI+9eDfHP5VSfgCtcYcfmjJTfsVvKu/zxK9+5/2deN/NZU4p5QGQKR3P+aGj6LoqHE0NDrWiXk3BoVV/yPunUmrqH16ewh4x9anbqO1p9gb3LpIpJCGJPo24d13lrew9XZ/yHL8uDwCAwBfLSgPRQE48E4SkrX1bSBwgx7xPUNxiLnMAPAOAmipBLQpjJMdRSEYaMtae47MORzKShjTjaWS+KLTnK9KGpK4raXbiuxkeyFfW+4mfq8YmXrtb3XnvfQj7/L7X/i/8wofAhY+wCx/AF74+LHv5+QUPP47PCU3CGwAAAABJRU5ErkJggg==";
    }

}

interface SettingsButton {

    /** Unique button ID */
    id: string;

    /** Text inside the link */
    name?: string;
    /** Link address */
    href?: string;
    /** Hover text */
    title?: string;

    /** Extra class to append to the tab */
    tabClass?: string;
    /** Extra class to append to the link */
    linkClass?: string;

    /** Name-value pairs of the attribute to set */
    attr?: { [prop: string]: string };

    onClick?: ($element: JQuery<HTMLElement>) => void;
}
