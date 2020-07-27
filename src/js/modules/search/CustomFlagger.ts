import { Page, PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";
import { PostFilter } from "../../components/data/PostFilter";
import { RE6Module, Settings } from "../../components/RE6Module";

export class CustomFlagger extends RE6Module {

    private static filters: Map<string, FilterPair>;

    public constructor() {
        super([PageDefintion.post, PageDefintion.search, PageDefintion.favorites, PageDefintion.popular], true);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            flags: [
                //    { name: "CHARS", color: "#800000", tags: "-solo -duo -group -zero_pictured" },
                //    { name: "TAGS", color: "#008000", tags: "tagcount:<5" },
                //    { name: "SEXES", color: "#000080", tags: "-zero_pictured -male -female -herm -maleherm -andromorph -gynomorph -intersex -ambiguous_gender" },
            ],
        };
    }

    public create(): void {

        const posts = Post.fetchPosts();
        CustomFlagger.filters = new Map();
        for (const flag of this.fetchSettings<FlagDefinition[]>("flags")) {
            if (CustomFlagger.filters.get(flag.tags)) continue;
            CustomFlagger.filters.set(
                flag.tags,
                { data: flag, filter: new PostFilter(flag.tags, true) }
            );
        }

        if (Page.matches(PageDefintion.post)) {
            this.createPostPage();
        } else {
            posts.forEach((post) => {
                CustomFlagger.modifyThumbnail(post);
            });
        }
    }

    /**
     * Special case for the individual post page.  
     * Flags are added to the editing form, under the list of tags
     */
    protected createPostPage(): void {
        const viewingPost = Post.getViewingPost();
        const flagContainer = $("<div>").insertAfter("div.input#tags-container");
        let activeFlags = 0;

        // Fill in the filters and add flags to matching ones
        CustomFlagger.filters.forEach((entry) => {
            entry.filter.addPost(viewingPost, false);
            if (!entry.filter.matchesPost(viewingPost)) return;
            $("<div>")
                .addClass("custom-flag")
                .html(`<span class="custom-flag-title" style="background-color: ${entry.data.color}">${entry.data.name}</span> ${entry.data.tags}`)
                .appendTo(flagContainer);
            activeFlags++;
        });

        // Add a header if any flags have been added
        if (activeFlags > 0)
            $("<b>")
                .html("Flags")
                .addClass("display-block")
                .prependTo(flagContainer);
    }

    /**
     * Check if the provided post matches any flags, and add appropriate badges if it does
     * @param post Post to check
     */
    public static async modifyThumbnail(post: Post): Promise<void> {
        // Sometimes, the image might not be wrapped in a picture tag properly
        // This is most common on comment pages and the like
        // If that bug gets fixed, this code can be removed
        let $picture = post.getDomElement().find("picture");
        if ($picture.length == 0) {
            const $img = post.getDomElement().find("img");
            $picture = $("<picture>").insertAfter($img).append($img);
        }

        // Create a flag container
        const flagContainer = $("<div>")
            .addClass("flag-container")
            .appendTo(post.getDomElement().find("picture"));

        // Determine active flags and append badges
        CustomFlagger.filters.forEach((entry) => {
            entry.filter.addPost(post, false);
            if (!entry.filter.matchesPost(post)) return;
            $("<span>")
                .addClass("custom-flag-thumb")
                .html(entry.data.name)
                .css("background-color", entry.data.color)
                .appendTo(flagContainer);
        });
    }

}

export interface FlagDefinition {
    name: string;
    color: string;
    tags: string;
}

interface FilterPair {
    data: FlagDefinition;
    filter: PostFilter;
}
