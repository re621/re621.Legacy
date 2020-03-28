import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";
import { PostFilter } from "../../components/data/PostFilter";

/**
 * Adds a extra search input below the current one where 
 * you can filter posts instantaneously
 */
export class InstantSearch extends RE6Module {

    // TODO: this can be of type HTMLInputElememnt, but I don't know how to do that
    private $searchbox: JQuery<HTMLElement>;

    private static instance: InstantSearch = new InstantSearch();

    private constructor() {
        super(PageDefintion.search);
    }

    /**
     * Returns a singleton instance of the class
     * @returns InstantSearch instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new InstantSearch();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return { enabled: true };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();

        this.createDOM();
        let typingTimeout: number;
        let doneTyping = 500;

        this.$searchbox.on("input", () => {
            clearTimeout(typingTimeout);
            typingTimeout = window.setTimeout(() => { this.applyFilter(); }, doneTyping);
        });
        //The user might have paginated, which means the input is not empty,
        //but there was no input event yet.
        this.$searchbox.trigger("input");
    }

    public destroy() {
        super.destroy();
        this.$searchbox.val("");
        this.applyFilter();
        $("section#re-instantsearch").remove();
    }

    public applyFilter() {
        const filterText = this.$searchbox.val().toString().trim();
        const filter = new PostFilter(filterText);
        sessionStorage.setItem("re-instantsearch", filterText);
        const posts = Post.fetchPosts();
        //when the user clears the input, show all posts
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

    protected createDOM() {
        const $section = $("<section>").attr("id", "re-instantsearch");
        this.$searchbox = $("<input>").
            attr("id", "re-instantsearch-input").
            val(sessionStorage.getItem("re-instantsearch"));
        this.$searchbox.attr("type", "text");
        $section.append("<h1>Filter</h1>");
        $section.append(this.$searchbox);
        $section.append($("<button>").attr("type", "submit").append($("<i>").addClass("fas fa-search")));
        $section.insertAfter($("#search-box"));
    }
}
