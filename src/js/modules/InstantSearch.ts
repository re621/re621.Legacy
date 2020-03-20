import { RE6Module } from "../components/RE6Module";
import { Url } from "../components/Url";
import { Post } from "../components/Post";

/**
 * Adds a extra search input below the current one where 
 * you can filter posts instantaneously
 */
export class InstantSearch extends RE6Module {

    private locationConstrain = "=/posts|/posts?";

    // TODO: this can be of type HTMLInputElememnt, but I don't know how to do that
    private $searchbox: JQuery<HTMLElement>;

    private static instance: InstantSearch = new InstantSearch();

    private constructor() {
        super();
        // TODO: Maybe somehow put this into RE6Module
        if (!Url.matches(this.locationConstrain)) {
            return;
        }

        this.createDOM();

        this.$searchbox.on("input", e => {
            const filter = this.$searchbox.val().toString();
            const posts = Post.getVisiblePosts();
            if (filter === "") {
                for (const post of posts) {
                    $(post.getDomElement).css("display", "");
                }
            } else {
                for (const post of posts) {
                    if (post.tagsMatchesFilter(filter)) {
                        post.getDomElement().css("display", "");
                    } else {
                        post.getDomElement().css("display", "none");
                    }
                }
            }

        })
    }

    protected createDOM() {
        const $section = $("<section>").attr("id", "re-instantsearch");
        this.$searchbox = $("<input>").
            attr("id", "re-instantsearch-input");
        this.$searchbox.attr("type", "text");
        $section.append("<h1>Insant Search</h1>")
        $section.append(this.$searchbox)
        $section.append($("<div>").addClass("fas fa-search"));
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
