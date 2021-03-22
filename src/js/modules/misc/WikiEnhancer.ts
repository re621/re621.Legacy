import { XM } from "../../components/api/XM";
import { Page, PageDefinition } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Adds the wiki page name into the url and adds a button to copy the wiki page name to clipboard
 */
export class WikiEnhancer extends RE6Module {

    public constructor() {
        super([PageDefinition.wiki, PageDefinition.wikiNA, PageDefinition.artist]);
    }

    protected getDefaultSettings(): Settings {
        return { enabled: true };
    }

    public create(): void {
        super.create();
        const $title = Page.matches(PageDefinition.artist)
            ? $("#a-show h1").first()
            : $("#wiki-page-title");
        const tagName = WikiEnhancer.sanitizeWikiTagName($title.text());

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

    public static sanitizeWikiTagName(raw: string): string {
        return raw.trim()
            .replace(/^.+: /g, "")
            .replace("\n\n          (locked)", "")
            .replace(/ /g, "_");
    }
}
