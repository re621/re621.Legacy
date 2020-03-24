import { RE6Module } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";

/**
 * Adds a extra search input below the current one where 
 * you can filter posts instantaneously
 */
export class InstantSearch extends RE6Module {

    // TODO: this can be of type HTMLInputElememnt, but I don't know how to do that
    private $searchbox: JQuery<HTMLElement>;

    private startingQuery: string;

    private static instance: InstantSearch = new InstantSearch();

    private constructor() {
        super(PageDefintion.search);
        if (!this.eval()) return;

        this.createDOM();
        this.startingQuery = Page.getQueryParameter("tags") === null ? "" : Page.getQueryParameter("tags");
        let typingTimeout: number; // TODO NodeJS.Timeout;
        let doneTyping = 500;

        this.$searchbox.on("input", () => {
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => { this.applyFilter() }, doneTyping);
        });
        //The user might have paginated, which means the input is not empty,
        //but there was no input event yet.
        this.applyFilter();
    }

    public applyFilter() {
        const filter = this.$searchbox.val().toString().trim();
        sessionStorage.setItem("re-instantsearch", filter);
        const posts = Post.fetchPosts();
        const filterTags = (this.startingQuery + (this.startingQuery.length === 0 ? "" : "+") + filter.replace(/ /g, "+")).split("+");
        //Remove duplicates
        const queryString = [...new Set(filterTags)].join("+");
        //when the user clears the input, show all posts
        if (filter === "") {
            for (const post of posts) {
                post.setVisibility(true);
            }
        } else {
            for (const post of posts) {
                post.setVisibility(post.tagsMatchesFilter(filter));
            }
        }

    }

    protected createDOM() {
        const $section = $("<section>").attr("id", "re-instantsearch");
        this.$searchbox = $("<input>").
            attr("id", "re-instantsearch-input").
            val(sessionStorage.getItem("re-instantsearch"));
        this.$searchbox.attr("type", "text");
        $section.append("<h1>Filter</h1>")
        $section.append(this.$searchbox)
        $section.append($("<button>").attr("type", "submit").append($("<i>").addClass("fas fa-search")));
        $section.insertAfter($("#search-box"));
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new InstantSearch();
        return this.instance;
    }
}
