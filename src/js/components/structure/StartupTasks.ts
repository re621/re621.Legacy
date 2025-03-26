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

      // Container for various actions - subscribe, add to blacklist, etc.
      const $actions = $container.find(".tag-list-actions");

      //   ELEMENT   - METHOD  - STATE
      // - blacklist - display - hover
      // - tag count - display - normal
      // - subscribe - visibility - always

      // Fix the counter data
      const counter = $container.find(".tag-list-count");
      counter
        .attr({
          "data-count": element.dataset.count,
          "data-count-short": counter.text(),
        });

      // Subscribe button container
      $("<span>")
        .addClass("tag-list-subscribe")
        .attr({
          "data-tag": element.dataset.name,
        })
        .appendTo($actions);
    });
  }

}
