import { Danbooru } from "../../components/api/Danbooru";
import { Page, PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";

export class SearchUtilities extends RE6Module {

    public constructor() {
        super([PageDefintion.search, PageDefintion.post, PageDefintion.favorites]);
        this.registerHotkeys(
            { keys: "hotkeyFocusSearch", fnct: this.focusSearchbar },
            { keys: "hotkeyRandomPost", fnct: this.randomPost },

            { keys: "hotkeySwitchModeView", fnct: this.switchModeView },
            { keys: "hotkeySwitchModeEdit", fnct: this.switchModeEdit },
            { keys: "hotkeySwitchModeAddFav", fnct: this.switchModeAddFav },
            { keys: "hotkeySwitchModeRemFav", fnct: this.switchModeRemFav },
            { keys: "hotkeySwitchModeAddSet", fnct: this.switchModeAddSet },
            { keys: "hotkeySwitchModeRemSet", fnct: this.switchModeRemSet },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            improveTagCount: true,
            shortenTagNames: true,

            collapseCategories: true,
            categoryData: [],

            persistentTags: "",

            hotkeyFocusSearch: "q",
            hotkeyRandomPost: "r",

            hotkeySwitchModeView: "",
            hotkeySwitchModeEdit: "",
            hotkeySwitchModeAddFav: "",
            hotkeySwitchModeRemFav: "",
            hotkeySwitchModeAddSet: "",
            hotkeySwitchModeRemSet: "",
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

        // Append custom string to searches
        const persistentTags = this.fetchSettings<string>("persistentTags").trim().toLowerCase();
        if (persistentTags !== "" && Page.matches([PageDefintion.search, PageDefintion.post, PageDefintion.favorites])) {
            const $tagInput = $("input#tags");
            $tagInput.val(($tagInput.val() + "").replace(persistentTags, ""));

            $("section#search-box form").on("submit", () => {
                $tagInput.val($tagInput.val() + " " + persistentTags);
                return true;
            });
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
        let storedCats = new Set<string>(await this.fetchSettings<string[]>("categoryData", true));
        for (const element of $("section#tag-list .tag-list-header").get()) {
            const $header = $(element),
                cat = $header.attr("data-category");
            if (storedCats.has(cat)) $header.get(0).click();

            $header.on("click.danbooru", async () => {
                storedCats = new Set<string>(await this.fetchSettings<string[]>("categoryData", true));
                if ($header.hasClass("hidden-category")) storedCats.add(cat);
                else storedCats.delete(cat);
                await this.pushSettings("categoryData", Array.from(storedCats));
            });
        }
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

    private switchModeView(): void { SearchUtilities.switchMode("view"); }
    private switchModeEdit(): void { SearchUtilities.switchMode("edit"); }
    private switchModeAddFav(): void { SearchUtilities.switchMode("add-fav"); }
    private switchModeRemFav(): void { SearchUtilities.switchMode("remove-fav"); }
    private switchModeAddSet(): void { SearchUtilities.switchMode("add-to-set"); }
    private switchModeRemSet(): void { SearchUtilities.switchMode("remove-from-set"); }

    private static switchMode(mode: string): void {
        $("select#mode-box-mode").val(mode);
        Danbooru.PostModeMenu.change();
    }

}
