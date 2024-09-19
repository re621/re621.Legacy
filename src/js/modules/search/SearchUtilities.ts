import { Danbooru } from "../../components/api/Danbooru";
import { Blacklist } from "../../components/data/Blacklist";
import { Page, PageDefinition } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

export class SearchUtilities extends RE6Module {

    private static randomPostURL = "";

    public constructor() {
        super([PageDefinition.search, PageDefinition.post, PageDefinition.favorites]);
        this.registerHotkeys(
            { keys: "hotkeyFocusSearch", fnct: this.focusSearchbar },
            { keys: "hotkeyRandomPost", fnct: this.randomPost },

            { keys: "hotkeySwitchModeView", fnct: this.switchModeView },
            { keys: "hotkeySwitchModeEdit", fnct: this.switchModeEdit },
            { keys: "hotkeySwitchModeOpen", fnct: this.switchModeOpen },
            { keys: "hotkeySwitchModeAddFav", fnct: this.switchModeAddFav },
            { keys: "hotkeySwitchModeRemFav", fnct: this.switchModeRemFav },
            { keys: "hotkeySwitchModeBlacklist", fnct: this.switchModeBlacklist },
            { keys: "hotkeySwitchModeAddSet", fnct: this.switchModeAddSet },
            { keys: "hotkeySwitchModeRemSet", fnct: this.switchModeRemSet },
            { keys: "hotkeySwitchModeScript", fnct: this.switchModeScript },

            { keys: "hotkeyScriptOne", fnct: () => { SearchUtilities.switchScript(1); } },
            { keys: "hotkeyScriptTwo", fnct: () => { SearchUtilities.switchScript(2); } },
            { keys: "hotkeyScriptThree", fnct: () => { SearchUtilities.switchScript(3); } },
            { keys: "hotkeyScriptFour", fnct: () => { SearchUtilities.switchScript(4); } },
            { keys: "hotkeyScriptFive", fnct: () => { SearchUtilities.switchScript(5); } },
            { keys: "hotkeyScriptSix", fnct: () => { SearchUtilities.switchScript(6); } },
            { keys: "hotkeyScriptSeven", fnct: () => { SearchUtilities.switchScript(7); } },
            { keys: "hotkeyScriptEight", fnct: () => { SearchUtilities.switchScript(8); } },
            { keys: "hotkeyScriptNine", fnct: () => { SearchUtilities.switchScript(9); } },
            { keys: "hotkeyScriptTen", fnct: () => { SearchUtilities.switchScript(0); } },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            improveTagCount: true,
            shortenTagNames: true,
            hidePlusMinusIcons: false,
            autoFocusSearch: false,

            collapseCategories: true,
            categoryData: [],

            persistentTags: "",

            quickBlacklist: true,
            trimQueryParameters: true,

            hotkeyFocusSearch: "q",
            hotkeyRandomPost: "r",

            hotkeySwitchModeView: "",
            hotkeySwitchModeEdit: "",
            hotkeySwitchModeOpen: "",
            hotkeySwitchModeAddFav: "",
            hotkeySwitchModeRemFav: "",
            hotkeySwitchModeAddSet: "",
            hotkeySwitchModeRemSet: "",
            hotkeySwitchModeBlacklist: "",
            hotkeySwitchModeScript: "",

            hotkeyScriptOne: "alt+1|",
            hotkeyScriptTwo: "alt+2|",
            hotkeyScriptThree: "alt+3|",
            hotkeyScriptFour: "alt+4|",
            hotkeyScriptFive: "alt+5|",
            hotkeyScriptSix: "alt+6|",
            hotkeyScriptSeven: "alt+7|",
            hotkeyScriptEight: "alt+8|",
            hotkeyScriptNine: "alt+9|",
            hotkeyScriptTen: "alt+0|",
        }
    }

    public create(): void {
        super.create();

        // Auto-focus on the searchbar
        if (Page.matches(PageDefinition.search) && this.fetchSettings<boolean>("autoFocusSearch")) {
            const searchbox = $("section#search-box input");
            if (searchbox.val() == "") searchbox.trigger("focus");
        }

        // Remove the query string on posts
        const queryParams = (Page.getQueryParameter("tags") || Page.getQueryParameter("q") || "").split(" ").filter(n => n);
        const queryEncoded = [];
        for (const part of queryParams) queryEncoded.push(encodeURIComponent(part));

        SearchUtilities.randomPostURL = "/posts/random" + (queryEncoded.length ? ("?tags=" + queryEncoded.join("+")) : "");
        if (Page.matches(PageDefinition.post) && this.fetchSettings("trimQueryParameters")) {
            const qParam = Page.getQueryParameter("q");
            // console.log(qParam);
            Page.removeQueryParameter(["q", "tags"]);

            if (qParam)
                for (const link of $("#has-children-relationship-preview article a, #has-parent-relationship-preview article a").get())
                    $(link).on("click", () => {
                        Page.setQueryParameter("q", qParam);
                    });
        }

        // Replaces the tag count estimate with the real number
        if (Page.matches([PageDefinition.search, PageDefinition.post])) {
            this.improveTagCount(this.fetchSettings("improveTagCount"));
            this.shortenTagNames(this.fetchSettings("shortenTagNames"));
            this.hidePlusMinusIcons(this.fetchSettings("hidePlusMinusIcons"));
        }

        // Restore the collapsed categories
        if (this.fetchSettings("collapseCategories") === true && Page.matches(PageDefinition.post)) {
            this.collapseTagCategories();
        }

        // Append custom string to searches
        const persistentTags = this.fetchSettings<string>("persistentTags").trim().toLowerCase();
        if (persistentTags !== "" && Page.matches([PageDefinition.search, PageDefinition.post, PageDefinition.favorites])) {
            const $tagInput = $("input#tags");
            $tagInput.val(($tagInput.val() + "").replace(persistentTags, ""));

            $("section#search-box form").on("submit", () => {
                $tagInput.val($tagInput.val() + " " + persistentTags);
                return true;
            });

            $("a.search-tag").each((index, el) => {
                const $el = $(el);
                $el.attr("href", $el.attr("href") + "+" + persistentTags.split(" ").join("+"));
            });
        }

        // Initialize the quick-blacklist buttons
        this.initQuickBlacklist(this.fetchSettings("quickBlacklist"));

        // Handle sidebar collapse
        if (Page.matches([PageDefinition.search, PageDefinition.favorites]))
            this.handleSidebarCollapse();

        // Handle the sidebar collapse on the post page
        if (Page.matches([PageDefinition.post]))
            this.handleSidebarCollapsePost();
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
     * Removes the + and - icons next to the tags
     * @param state True to remove, false to restore
     */
    public hidePlusMinusIcons(state = true): void {
        $("section#tag-box, section#tag-list").attr("data-hide-plusminus", state + "");
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
    private focusSearchbar(event: Event): void {
        event.preventDefault();
        const searchbar = $("section#search-box input");
        if(this.fetchSettings("switchCursorFocus")){
            searchbar.each(function () {
                const textbox = this as HTMLInputElement;
                textbox.focus();
                textbox.setSelectionRange(textbox.value.length, textbox.value.length);
            });
        } else searchbar.trigger("focus");
    }

    /** Switches the location over to a random post */
    private randomPost(): void {
        location.href = SearchUtilities.randomPostURL;
    }

    // Search Modes
    private switchModeView(): void { SearchUtilities.switchMode("view"); }
    private switchModeEdit(): void { SearchUtilities.switchMode("edit"); }
    private switchModeOpen(): void { SearchUtilities.switchMode("open"); }
    private switchModeAddFav(): void { SearchUtilities.switchMode("add-fav"); }
    private switchModeRemFav(): void { SearchUtilities.switchMode("remove-fav"); }
    private switchModeBlacklist(): void { SearchUtilities.switchMode("blacklist"); }
    private switchModeAddSet(): void {
        SearchUtilities.switchMode("add-to-set");
        $("#set-id").trigger("focus");
    }
    private switchModeRemSet(): void {
        SearchUtilities.switchMode("remove-from-set");
        $("#set-id").trigger("focus");
    }
    private switchModeScript(): void { SearchUtilities.switchMode("tag-script"); }

    private static switchMode(mode: string): void {
        $("select#mode-box-mode").val(mode);
        Danbooru.PostModeMenu.change();
    }

    /** Switches the tag script to the specified one */
    private static switchScript(script: number): void {
        Danbooru.PostModeMenu.change_tag_script(script);
    }

    /** Reset quick blacklist buttons */
    public initQuickBlacklist(state = true): void {

        if (!state) $("div.tag-actions span.tag-action-blacklist").html("");
        else {
            for (const element of $("div.tag-actions span.tag-action-blacklist").get()) {
                const $container = $(element);

                $("<a>")
                    .attr({
                        "href": "#",
                        "title": "Blacklist Tag",
                    })
                    .addClass("blacklist-tag-toggle")
                    .html(`<i class="fas fa-times"></i>`)
                    .prependTo($container)
                    .on("click", (event) => {
                        event.preventDefault();
                        Blacklist.toggleBlacklistTag($container.parent().attr("data-tag"));
                    });
            }
        }
    }

    /** Handle sidebar expansion and collapse */
    private handleSidebarCollapse(): void {
        const sidebar = $("#sidebar");
        const button = $("<a>")
            .attr({ "id": "sidebar-collapse" })
            .insertBefore(sidebar)
            .on("click", () => {
                sidebar.toggleClass("collapsed");
                button.toggleClass("collapsed");
            });
    }

    /** Handle sidebar expansion and collapse */
    private handleSidebarCollapsePost(): void {
        let collapsed = Util.LS.getItem("re621.sidebar") == "true";

        const sidebar = $("#sidebar");
        const button = $("<a>")
            .attr({ "id": "sidebar-collapse" })
            .insertBefore(sidebar)
            .on("click", () => {
                sidebar.toggleClass("collapsed");
                button.toggleClass("collapsed");

                collapsed = !collapsed;
                if (collapsed) Util.LS.setItem("re621.sidebar", "true");
                else Util.LS.removeItem("re621.sidebar");
            });

        if (collapsed) {
            sidebar.toggleClass("collapsed");
            button.toggleClass("collapsed");
        }
    }

}
