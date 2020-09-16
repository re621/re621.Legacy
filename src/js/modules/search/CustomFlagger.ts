import { Page, PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post, PostData } from "../../components/post/Post";
import { PostFilter } from "../../components/post/PostFilter";
import { RE6Module, Settings } from "../../components/RE6Module";
import { BetterSearch } from "./BetterSearch";

export class CustomFlagger extends RE6Module {

    private static filters: Map<string, FilterPair>;

    public constructor() {
        super([PageDefinition.post, PageDefinition.search, PageDefinition.favorites, PageDefinition.popular], true, false, [BetterSearch]);
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
        if (Page.matches(PageDefinition.post))
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
    public static addPost(...posts: PostData[]): number {
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
    public static updatePost(...posts: PostData[]): number {
        return CustomFlagger.addPost(...posts);
    }

    /** Returns true if the post is in the blacklist cache */
    public static getFlags(post: PostData | number): FlagDefinition[] {
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

        const post = Post.getViewingPost();
        CustomFlagger.addPost(post);

        const flagContainer = $("<div>").insertBefore("div.input#tags-container");
        let activeFlags = 0;

        // Fill in the filters and add flags to matching ones
        for (const flag of CustomFlagger.getFlags(post)) {
            $("<div>")
                .addClass("custom-flag")
                .html(`<span class="custom-flag-title" style="--flag-color: ${flag.color}">${flag.name}</span> ${flag.tags}`)
                .appendTo(flagContainer);
            activeFlags++;
        }

        // Add a header if any flags have been added
        if (activeFlags > 0)
            $("<b>")
                .html("Flags")
                .addClass("display-block")
                .prependTo(flagContainer);
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
