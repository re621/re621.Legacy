import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion, Page } from "../../components/data/Page";
import { XM } from "../../components/api/XM";

/**
 * Adds the wiki page name into the url and adds a button to copy the wiki page name to clipboard
 */
export class WikiEnhancer extends RE6Module {

    private $buttonCopy: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.wiki);
    }

    protected getDefaultSettings(): Settings {
        return { enabled: true };
    }

    public create(): void {
        super.create();
        const $title = $("#wiki-page-title");
        const removeThis = ["Artist: ", "Copyright: ", "Character: ", "Species: ", "Meta: ", "Lore: "];
        let tagName = $title.text().trim();
        for (const string of removeThis) {
            tagName = tagName.replace(string, "");
        }
        tagName = tagName.replace(/ /g, "_");
        Page.setQueryParameter("title", tagName);
        this.$buttonCopy = $("<button>")
            .attr("id", "wiki-page-copy-tag")
            .addClass("button btn-neutral border-highlight border-left")
            .on("click", () => {
                XM.setClipboard(tagName);
            });
        $("<i>")
            .addClass("far fa-copy")
            .appendTo(this.$buttonCopy);
        this.$buttonCopy.appendTo($title);
    }

    public destroy(): void {
        if (!this.isInitialized()) return;
        super.destroy();
        this.$buttonCopy.remove();
    }
}
