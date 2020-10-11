import { Page, PageDefinition } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { BetterSearch } from "./BetterSearch";

export class ProgressTracker extends RE6Module {

    public constructor() {
        super(PageDefinition.search, true, true, [BetterSearch]);
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            data: {},
        }
    }

    public create(): void {
        super.create();

        let data = this.fetchSettings<TrackedData>("data");
        const tags = Page.getQueryParameter("tags") || "";

        // Don't track the main search page
        if (tags == "") return;
        const lastPost = data[tags];

        const container = $("<search-track>")
            .prependTo("search-content");

        const trackButton = $("<a>")
            .on("click", () => {
                data = this.fetchSettings<TrackedData>("data");
                const post = Post.get("first");
                if (data[tags] == undefined) {
                    data[tags] = post == null ? -1 : post.id;
                    this.pushSettings("data", data);
                    trackButton.html("Untrack");
                } else {
                    delete data[tags];
                    this.pushSettings("data", data);
                    trackButton.html("Track");
                }
            })
            .html(data[tags] == undefined ? "Track" : "Untrack")
            .appendTo(container);

        // Add a "new" attribute to unseen posts
        if (lastPost == undefined) return;

        BetterSearch.on("ready", () => {
            const post = Post.get("first");
            data[tags] = post == null ? -1 : post.id;
            this.pushSettings("data", data);

            if (lastPost == -1) return;
            Post.find(lastPost).each((post) => {
                post.$ref.attr({
                    "new": true,
                });
            });
        });

    }

}

interface TrackedData {
    [tags: string]: number;
}
