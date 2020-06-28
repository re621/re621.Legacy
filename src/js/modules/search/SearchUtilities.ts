import { Page, PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";

export class SearchUtilities extends RE6Module {

    public constructor() {
        super([PageDefintion.search, PageDefintion.post]);
        this.registerHotkeys(
            { keys: "hotkeyFocusSearch", fnct: this.focusSearchbar },
            { keys: "hotkeyRandomPost", fnct: this.randomPost },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            improveTagCount: true,
            shortenTagNames: true,

            collapseCategories: true,
            categoryData: [],

            hotkeyFocusSearch: "q",
            hotkeyRandomPost: "r",
        }
    }

    public create(): void {
        super.create();

        // Auto-focus on the searchbar
        if (Page.matches(PageDefintion.search)) {
            const searchbox = $("section#search-box input");
            if (searchbox.val() == "") searchbox.focus();
        }

        // Remove the query string on posts
        if (Page.matches(PageDefintion.post)) {
            this.removeSearchQueryString();
        }

        // Replaces the tag count estimate with the real number
        if (Page.matches([PageDefintion.search, PageDefintion.post])) {
            this.improveTagCount(this.fetchSettings("improveTagCount"));
            this.shortenTagNames(this.fetchSettings("shortenTagNames"));
        }

        // Restore the collapsed categories
        if (this.fetchSettings("collapseCategories") === true && Page.matches(PageDefintion.post)) {
            this.collapseTagCategories();
        }
    }

    /**
     * Removes the search query from the address bar
     */
    private removeSearchQueryString(): void {
        Page.removeQueryParameter("q");
    }

    /**
     * Replaces the tag estimates with the real count
     * @param state True to replace, false to restore
     */
    public async improveTagCount(state = true): Promise<void> {
        const source = state ? "data-count" : "data-count-short";
        $("span.re621-post-count").each(function (index, element) {
            const tag = $(element);
            tag.text(tag.attr(source));
        });
    }

    /**
     * Shortens the tag names to fit in one line
     * @param state True to shorten, false to restore
     */
    public shortenTagNames(state = true): void {
        $("section#tag-box, section#tag-list").attr("data-shorten-tagnames", state + "");
    }

    /**
     * Records which tag categories the user has collapsed.
     */
    private async collapseTagCategories(): Promise<void> {
        let storedCats: string[] = await this.fetchSettings("categoryData", true);
        $("section#tag-list .tag-list-header").each((index, element) => {
            const $header = $(element),
                cat = $header.attr("data-category");
            if (storedCats.indexOf(cat) !== -1) $header.get(0).click();

            $header.on("click.danbooru", async () => {
                storedCats = await this.fetchSettings("categoryData", true);
                if ($header.hasClass("hidden-category")) {
                    storedCats.push(cat);
                } else {
                    const index = storedCats.indexOf(cat);
                    if (index !== -1) storedCats.splice(index, 1);
                }
                await this.pushSettings("categoryData", storedCats);
            });
        });

    }

    /** Sets the focus on the search bar */
    private focusSearchbar(event): void {
        event.preventDefault();
        $("section#search-box input").focus();
    }

    /** Switches the location over to a random post */
    private randomPost(): void {
        location.pathname = "/posts/random";
    }

}
