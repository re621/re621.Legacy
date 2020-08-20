import { PageDefintion } from "../../components/data/Page";
import { Post, PostData } from "../../components/post/Post";
import { PostFilter } from "../../components/post/PostFilter";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

/**
 * Adds a extra search input below the current one where 
 * you can filter posts instantaneously
 */
export class InstantSearch extends RE6Module {

    private static filter: PostFilter;

    private $searchbox: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefintion.search, PageDefintion.favorites], true);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return { enabled: false };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        $("search-content").on("re621:insearch", "post", (event) => {
            const $article = $(event.currentTarget),
                post = Post.get($article);

            if (InstantSearch.filter == undefined) $article.removeAttr("filtered");
            else {
                InstantSearch.filter.update(post);
                if (InstantSearch.filter.matches(post)) $article.removeAttr("filtered");
                else $article.attr("filtered", "true");
            }
        });

        const $section = $("<section>")
            .attr("id", "re621-insearch")
            .html("<h1>Filter</h1>")
            .insertAfter("#search-box");
        const $searchForm = $("<form>").appendTo($section);

        let typingTimeout: number;
        this.$searchbox = $("<input>")
            .attr("id", "re621-insearch-input")
            .attr("type", "text")
            .val(Util.SS.getItem("re621.insearch") || "")
            .appendTo($searchForm)
            .on("input", () => {
                clearTimeout(typingTimeout);
                typingTimeout = window.setTimeout(() => { this.applyFilter(); }, 500);
            });

        // The user might have paginated, which means the input is not empty, but there was no input event yet.
        this.$searchbox.trigger("input");

        $("<button>")
            .attr("type", "submit")
            .html(`<i class="fas fa-search"></i>`)
            .appendTo($searchForm);

        $("#sidebar").trigger("re621:reflow");
    }

    public destroy(): void {
        super.destroy();

        this.$searchbox.val("");
        this.applyFilter();
        $("#re621-insearch").remove();

        $("search-content").off("re621:insearch", "post");
        $("#sidebar").trigger("re621:reflow");
    }

    public static get(): PostFilter {
        return InstantSearch.filter;
    }

    public static addPost(...posts: PostData[]): boolean {
        const filter = InstantSearch.get();
        if (!filter) return false;
        return filter.update(posts);
    }

    public applyFilter(): void {
        const filterText = this.$searchbox.val().toString().trim();
        if (filterText.length == 0) {
            InstantSearch.filter = undefined;
            Util.SS.removeItem("re621.insearch");
        } else {
            InstantSearch.filter = new PostFilter(filterText);
            Util.SS.setItem("re621.insearch", filterText);
        }
        $("post").trigger("re621:insearch");
    }
}
