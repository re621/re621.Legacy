import { PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";
import { PostFilter } from "../../components/data/PostFilter";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Adds a extra search input below the current one where 
 * you can filter posts instantaneously
 */
export class InstantSearch extends RE6Module {

    private $searchbox: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.search);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return { enabled: true };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        this.createDOM();

        let typingTimeout: number;
        this.$searchbox.on("input", () => {
            clearTimeout(typingTimeout);
            typingTimeout = window.setTimeout(() => { this.applyFilter(); }, 500);
        });

        // The user might have paginated, which means the input is not empty, but there was no input event yet.
        this.$searchbox.trigger("input");

        InstantSearch.on("applyFilter.main", () => {
            this.applyFilter();
        });
    }

    public destroy(): void {
        super.destroy();

        this.$searchbox.val("");
        this.applyFilter();
        $("section#re-instantsearch").remove();

        InstantSearch.off("applyFilter.main");
    }

    public applyFilter(): void {
        const filterText = this.$searchbox.val().toString().trim();
        const filter = new PostFilter(filterText);
        sessionStorage.setItem("re-instantsearch", filterText);
        const posts = Post.fetchPosts();
        // When the user clears the input, show all posts
        if (filterText === "") {
            for (const post of posts) {
                post.show();
            }
        } else {
            for (const post of posts) {
                filter.addPost(post, true) ? post.show() : post.hide();
            }
        }
    }

    protected createDOM(): void {
        const $section = $("<section>")
            .attr("id", "re-instantsearch")
            .insertAfter("section#search-box");
        $("<h1>").html("Filter").appendTo($section);
        const $searchForm = $("<form>").appendTo($section);

        this.$searchbox = $("<input>")
            .attr("id", "re-instantsearch-input")
            .attr("type", "text")
            .val(sessionStorage.getItem("re-instantsearch"))
            .appendTo($searchForm);

        $("<button>")
            .attr("type", "submit")
            .html(`<i class="fas fa-search"></i>`)
            .appendTo($searchForm);
    }
}
