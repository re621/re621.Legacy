import { Util } from "../utility/Util";
import { PreparedStructure } from "./PreparedStructure";

/**
 * Tabbed
 * Relatively easy tabbed content, powered by CSS
 */
export class Tabbed implements PreparedStructure {

  private id: string;

  private config: TabbedConfig;

  private $container: JQuery<HTMLElement>;

  constructor (config: TabbedConfig) {
    this.id = Util.ID.make();
    this.config = config;
  }

  /**
   * Creates a JQuery-UI tab element based on the provided configuration
   * @param clearCache If true, clears cache and re-creates the element from scratch
   */
  public render (clearCache = false): JQuery<HTMLElement> {
    if (this.$container !== undefined && !clearCache)
      return this.$container;

    this.$container = $("<tabbed>");
    const $tabList = $("<ul>").appendTo(this.$container);

    if (this.config.class) this.$container.addClass(this.config.class);

    this.config.content.forEach((entry, index) => {
      let $tab: JQuery<HTMLElement>;
      if (typeof entry.name === "string")
        $tab = $("<a>").html(entry.name);
      else $tab = entry.name;
      $tab.attr("href", "#" + this.id + "-fragment-" + index);
      $("<li>").appendTo($tabList).append($tab);

      const elem = $("<div>")
        .attr("id", this.id + "-fragment-" + index)
        .appendTo(this.$container);

      if (entry.structure) elem.append(entry.structure.render());
      else if (entry.content) elem.append(entry.content);
      else elem.append($("<span>ERROR: Missing Tabbed Content</span>"));
    });

    this.$container.tabs({
      classes: {
        "ui-tabs": "color-text",
        "ui-tabs-tab": "color-text",
      },
    });

    this.$container.tabs("widget").find(".ui-tabs-nav li").off("keydown");

    return this.$container;
  }

  /**
   * Replaces the content of a tab by index with the passed element
   * @param index Tab index to replace the content from
   * @param $element Element which will replace the current content
   */
  public replace (index: number, $element: JQuery<HTMLElement>): void {
    this.$container.find("#" + this.id + "-fragment-" + index).children().replaceWith($element);
  }

}

interface TabbedConfig {
  name: string;
  class?: string;
  content: TabContent[];
}

export interface TabContent {
  /** Either the tab name, or JQuery element corresponding to the selector */
  name: string | JQuery<HTMLElement>;

  /** JQuery element with the modal contents */
  content?: JQuery<HTMLElement>;

  /** If specified, the content parameter is ignored, replaced by this DomStructure */
  structure?: PreparedStructure;

  /** If true, strips the top margins so that a Tabbed object could be fitted in it */
  tabbable?: boolean;
}
