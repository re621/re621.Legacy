import { Page, PageDefinition } from "../data/Page";

/**
 * StructureUtilities
 * DOM changes that don't belong to any specific project
 */
export class StartupTasks {

    /** Creates a sticky search box container */
    public static createSearchbox (): void {

        // If favorites are private, the sidebar does not exist
        if (Page.matches([PageDefinition.search, PageDefinition.post, PageDefinition.favorites]) && $("aside#sidebar").length > 0) {
            const $searchContainer = $("<div>").attr("id", "re621-search").prependTo("aside#sidebar");
            $("aside#sidebar section#search-box").appendTo($searchContainer);
            $("aside#sidebar section#mode-box").appendTo($searchContainer);

            const observer = new IntersectionObserver(
                ([event]) => { $(event.target).toggleClass("re621-search-sticky bg-foreground", event.intersectionRatio < 1); },
                { threshold: [1] },
            );

            observer.observe($searchContainer[0]);
        }
    }

    /**
     * Re-structures the tag lists
     */
    public static createTagList (): void {
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

}
