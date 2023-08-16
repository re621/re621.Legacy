import { Page, PageDefinition } from "../data/Page";
import { Debug } from "./Debug";
import { Util } from "./Util";

export class UtilDOM {

    /**
     * Adds the given style to the document and returns the injected style element
     * @param css string CSS styles
     */
    public static addStyle(css: string): JQuery<HTMLElement> {
        const id = Util.ID.make();
        Debug.log("adding style " + id);
        return $("<style>")
            .attr({
                "id": id,
                "type": "text/css"
            })
            .html(css)
            .appendTo("head");
    }

    /**
     * Alters the page header to allow components to attach to it
     */
    public static patchHeader(): void {

        // Add a section for re621 settings buttons
        $("#nav").addClass("re621-nav")
        $("<menu>")
            .addClass("extra")
            .insertAfter("#nav menu.main");
    }

    /** Sets up a container to load modals into */
    public static setupDialogContainer(): void {
        $("<div>")
            .attr("id", "modal-container")
            .prependTo("body");
    }

    /** Tweaks the search form to work with new functionality */
    public static setupSearchBox() {
        if (Page.matches([PageDefinition.posts.list, PageDefinition.posts.view, PageDefinition.favorites]) && $("aside#sidebar").length > 0) {
            const $searchContainer = $("<div>").attr("id", "re621-search").prependTo("aside#sidebar");
            $("#search-box").appendTo($searchContainer);
            $("#mode-box").appendTo($searchContainer);
            $("#blacklist-box").appendTo($searchContainer);

            const observer = new IntersectionObserver(
                ([event]) => { $(event.target).toggleClass("re621-search-sticky bg-foreground", event.intersectionRatio < 1) },
                { threshold: [1] }
            );

            observer.observe($searchContainer[0]);
        }
    }

    /**
     * Adds a button to the top-right of the navbar
     * @param config Button configuration
     * @param target Target element
     */
    public static addSettingsButton(config: SettingsButton, target = "menu.extra"): JQuery<HTMLElement> {
        if (config.name === undefined) config.name = "T";
        if (config.href === undefined) config.href = "";
        if (config.title === undefined) config.title = "";

        if (config.tabClass === undefined) config.tabClass = "";
        if (config.linkClass === undefined) config.linkClass = "";

        if (config.attr === undefined) config.attr = {};

        const $tab = $(`<li>`).appendTo(target);
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
     * Returns a base-64 encoded image used for placeholder during lazy loading
     */
    public static getPlaceholderImage(): string {
        return "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    }

    public static getKoFiImage(): string {
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALsAAAAkBAMAAAAjjlbPAAAAHlBMVEVDS1dDS1dDS1f+/v5DS1fi4uOLjpO8vcD/X1z/p6boDZakAAAAA3RSTlMCtVgF8JOLAAACCElEQVRIx+3XMW7bMBQGYLUnCIoeoENv8OuZ8NbAP8kDUBTRWbRyANLxAbKwc1AguW0H2nJSq6kBV0sRDhpI4BP19PhINs3Hz1yofWqapllMJ2+a5sNyOm+b5uuCPL8sGRvypllS57d3/gLe+KmF+O95jVOTuCiP1eGLxvFySftoffw7Lw5S+xKgLuadj8nnN/j1T3x/BFo61FmksMPFvJDuzeCU8lyKQ8sN6ixSJrin7XRmIBmSsuio0ZE0TnmSFooaPXcIW3hukWnRz/BSSinlES31ke9HoaNuNx2FJATOKcILyUGckHSC6DxyggzACKeYPOI5vz7ngdUrnkNrxK6YMumyFdIIjVUc2hqcTUs3Cod2NjgHfjjyYYf4ghcOHUWLdx0ppJBWkbqlXVV+EI+9eDfHP5VSfgCtcYcfmjJTfsVvKu/zxK9+5/2deN/NZU4p5QGQKR3P+aGj6LoqHE0NDrWiXk3BoVV/yPunUmrqH16ewh4x9anbqO1p9gb3LpIpJCGJPo24d13lrew9XZ/yHL8uDwCAwBfLSgPRQE48E4SkrX1bSBwgx7xPUNxiLnMAPAOAmipBLQpjJMdRSEYaMtae47MORzKShjTjaWS+KLTnK9KGpK4raXbiuxkeyFfW+4mfq8YmXrtb3XnvfQj7/L7X/i/8wofAhY+wCx/AF74+LHv5+QUPP47PCU3CGwAAAABJRU5ErkJggg==";
    }

    public static getLoadingImage(): string {
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAyVBMVEUAAAC9vsDCw8W9v8G9vsD29/fr7O29vsDm5+jx8fK/wML29vf///+9vsHR0tPm5+jt7u7w8PHr7Ozc3d7n6OnExcfGx8nJyszMzM7V1tjZ2tvf4OG9vsDHyMrp6uvIycu9v8HAwcTPz9HCw8W9vsC9vsDBwsTj5OXj5OXW19i9vsDm5+jw8PHy8vL09fW9vsDFxsjJyszAwsS9vsDU1dbLzM7Y2drb3N3c3d7e3+DHyMrBwsTh4uPR0tPDxcfa293R0tTV1ti9vsAll6RJAAAAQnRSTlMA7+t/MAZHQDYjHxABv6xSQjEgFgzi2M7Emop0cGVLD/ryt7Cfj3dmYWBgWjgsGd/Cv7SvopSSg4B6eHZrQjkyKx1dd0xhAAAA9klEQVR4AYWPeXOCMBBHFxIgCQKC3KCo1Wprtfd98/0/VBPb6TC0Wd+/783+ZqELrQkRoIMujFbiaLTwpESC029reB7919d7u6SgYaE8aUCivW84oEUY0lPQc408pxBqHxCIHGiw4Lxtl5h35ALFglouAAaZTj00OJ7NrvDANI/Q4PlQMDbNFA3ekiQRaHGRpmM0eMqyyxgLRlme4ydu8/n8Az3h+37xiRWv/k1RRlhxUtyVD8yCXwaDflHeP1Zr5sIey3WtfvFeVS+rTWAzFobhNhrFf4omWK03wcS2h8OzLd/1TyhiNvkJQu5amocjznm0i6HDF1RMG1aMA/PYAAAAAElFTkSuQmCC";
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
