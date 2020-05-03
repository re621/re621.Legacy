/**
 * Tabbed  
 * Relateively easy tabbed content, powered by CSS
 */
export class Tabbed {

    private config: TabbedConfig;
    private $container: JQuery<HTMLElement>;

    constructor(config: TabbedConfig) {
        this.config = config;
    }

    /**
     * Creates a JQuery-UI tab element based on the provided configuration
     * @deprecated Alias of a more standard `get()`. Use that instead.
     */
    public create(): JQuery<HTMLElement> {
        return this.get();
    }

    /**
     * Creates a JQuery-UI tab element based on the provided configuration
     * @param clearCache If true, clears cache and re-creates the element from scratch
     */
    public get(clearCache = false): JQuery<HTMLElement> {
        if (this.$container !== undefined && !clearCache)
            return this.$container;

        this.$container = $("<div>");
        const $tabList = $("<ul>").appendTo(this.$container);

        this.config.content.forEach((entry, index) => {
            let $tab: JQuery<HTMLElement>;
            if (typeof entry.name === "string")
                $tab = $("<a>").html(entry.name);
            else $tab = entry.name;
            $tab.attr("href", "#fragment-" + index)
            $("<li>").appendTo($tabList).append($tab);

            $("<div>")
                .attr("id", "fragment-" + index)
                .append(entry.page)
                .appendTo(this.$container);
        });

        this.$container.tabs({
            classes: {
                "ui-tabs": "color-text",
                "ui-tabs-tab": "color-text",
            },
        });

        this.$container.tabs("widget").find('.ui-tabs-nav li').off('keydown');

        return this.$container;
    }

    /**
     * Replaces the content of a tab by index with the passed element
     * @param index Tab index to replace the content from
     * @param $element Element which will replace the current content
     */
    public replace(index: number, $element: JQuery<HTMLElement>): void {
        this.$container.find("#fragment-" + index).children().replaceWith($element);
    }

}

interface TabbedConfig {
    name: string;
    content: TabContent[];
}

export interface TabContent {
    /** Either the tab name, or JQuery element corresponding to the selector */
    name: string | JQuery<HTMLAnchorElement>;
    /** JQuery element with the modal contents */
    page: JQuery<HTMLElement>;
    /** If true, strips the top margins so that a Tabbed object could be fitted in it */
    tabbable?: boolean;
}
