import { Page, PageDefintion } from "../../components/data/Page";
import { PostFilter } from "../../components/data/PostFilter";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Post } from "../../components/structure/PostUtilities";

export class CustomFlagger extends RE6Module {

    private static filters: Map<string, FilterPair>;

    public constructor() {
        super([PageDefintion.post, PageDefintion.search, PageDefintion.favorites, PageDefintion.popular], true);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: false,
            flags: [
                //    { name: "CHARS", color: "#800000", tags: "-solo -duo -group -zero_pictured" },
                //    { name: "TAGS", color: "#008000", tags: "tagcount:<5" },
                //    { name: "SEXES", color: "#000080", tags: "-zero_pictured -male -female -herm -maleherm -andromorph -gynomorph -intersex -ambiguous_gender" },
            ],
        };
    }

    public create(): void {
        if (Page.matches(PageDefintion.post))
            this.createPostPage();
    }

    private static get(): Map<string, FilterPair> {
        if (CustomFlagger.filters == undefined) {
            CustomFlagger.filters = new Map();
            for (const flag of ModuleController.get(CustomFlagger).fetchSettings<FlagDefinition[]>("flags")) {
                if (CustomFlagger.filters.get(flag.tags)) continue;
                CustomFlagger.filters.set(
                    flag.tags,
                    { data: flag, filter: new PostFilter(flag.tags, true) }
                );
            }
        }
        return CustomFlagger.filters;
    }

    /**
     * Adds the post to the flag cache
     * @param posts Post(s) to add to the cache
     * @returns Number of filters that match the post
     */
    public static addPost(...posts: Post[]): number {
        let count = 0;
        for (const filterPair of CustomFlagger.get().values()) {
            if (filterPair.filter.update(posts)) count++;
        }
        return count;
    }

    /**
     * Alias of `addPost`, to avoid ambiguity
     * @param posts Post(s) to update
     * @returns Number of filters that match the post
     */
    public static updatePost(...posts: Post[]): number {
        return CustomFlagger.addPost(...posts);
    }

    /** Returns true if the post is in the blacklist cache */
    public static getFlags(post: Post | number): FlagDefinition[] {
        if (typeof post !== "number") post = post.id;
        const output: FlagDefinition[] = [];
        for (const filterPair of CustomFlagger.get().values()) {
            if (filterPair.filter.matchesID(post))
                output.push(filterPair.data);
        }
        return output;
    }

    /**
     * Special case for the individual post page.  
     * Flags are added to the editing form, under the list of tags
     */
    private createPostPage(): void {
        // TODO Fix this
        return;
        /*
        const viewingPost = Post.getViewingPost();
        const flagContainer = $("<div>").insertAfter("div.input#tags-container");
        let activeFlags = 0;

        // Fill in the filters and add flags to matching ones
        CustomFlagger.filters.forEach((entry) => {
            entry.filter.addPost(viewingPost, false);
            if (!entry.filter.matchesPost(viewingPost)) return;
            $("<div>")
                .addClass("custom-flag")
                .html(`<span class="custom-flag-title" style="--flag-color: ${entry.data.color}">${entry.data.name}</span> ${entry.data.tags}`)
                .appendTo(flagContainer);
            activeFlags++;
        });

        // Add a header if any flags have been added
        if (activeFlags > 0)
            $("<b>")
                .html("Flags")
                .addClass("display-block")
                .prependTo(flagContainer);
                */
    }

}

export interface FlagDefinition {
    name: string;
    color: string;
    tags: string;
}

export interface FilterPair {
    data: FlagDefinition;
    filter: PostFilter;
}
