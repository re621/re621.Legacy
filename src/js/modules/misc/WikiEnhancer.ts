import { XM } from "../../components/api/XM";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Adds the wiki page name into the url and adds a button to copy the wiki page name to clipboard
 */
export class WikiEnhancer extends RE6Module {

    public constructor() {
        super([PageDefintion.wiki, PageDefintion.wikiNA]);
    }

    protected getDefaultSettings(): Settings {
        return { enabled: true };
    }

    public create(): void {
        super.create();
        const $title = $("#wiki-page-title");
        const tagName = $title.text().trim()
            .replace(/^((Species|Character|Copyright|Artist|Lore|Meta): )/g, "")
            .replace(/ /g, "_");

        $("<button>")
            .attr("id", "wiki-page-copy-tag")
            .addClass("button btn-neutral border-highlight border-left")
            .html(`<i class="far fa-copy"></i>`)
            .appendTo($title)
            .on("click", () => {
                XM.Util.setClipboard(tagName);
            });
    }

    public destroy(): void {
        if (!this.isInitialized()) return;
        super.destroy();
        $("#wiki-page-copy-tag").remove();
    }
}
