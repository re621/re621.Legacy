import { Page, PageDefinition } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { BetterSearch } from "./BetterSearch";

export class ProgressTracker extends RE6Module {

    public constructor () {
        super(PageDefinition.search, true, true, [BetterSearch]);
    }

    public getDefaultSettings (): Settings {
        return {
            enabled: true,
            data: {},
        };
    }

    public create (): void {
        super.create();

        const data = this.fetchSettings<TrackedData>("data");
        const tags = (Page.getQueryParameter("tags") || "").trim().toLowerCase();

        // Don't track the main search page
        if (tags == "") return;

        // Build the structure once BetterSearch has loaded
        BetterSearch.one("ready", () => {
            this.createDOM(data, tags);
        });

    }

    private createDOM (data: TrackedData, tags: string): void {

        const lastPost = data[tags];
        const page = Page.getQueryParameter("page") || "1";

        const container = $("<span>")
            .prependTo("search-stats");

        // Create the structure
        const trackButton = $("<a>")
            .on("click", async () => {
                data = await this.fetchSettings<TrackedData>("data", true);
                if (data[tags] == undefined) {
                    data[tags] = getNewPost();
                    this.pushSettings("data", data);
                    trackButton.html("Untrack");
                } else {
                    delete data[tags];
                    this.pushSettings("data", data);
                    trackButton.html("Track");
                }
            })
            .html(lastPost == undefined ? "Track" : "Untrack")
            .attr("title", "Highlight previously unseen posts")
            .prependTo(container);

        // Abort if the page is not being tracked
        if (lastPost == undefined) return;

        // Avoid issues when opening posts on other pages
        if (page != "1") return;

        data[tags] = getNewPost();
        this.pushSettings("data", data);

        // Add "new" attribute to unseen posts
        if (lastPost == -1) return;
        Post.find(lastPost).each((post) => {
            post.$ref.attr("new", "true");
        });

        function getNewPost (): number {
            const post = Post.get("first");
            const page = Page.getQueryParameter("page") || "1";
            if (post == null) return -1;     // Must have some posts on the page
            if (page !== "1") return -1;     // Only record the posts on the first page
            return post.id;
        }
    }

}

interface TrackedData {
    [tags: string]: number;
}
