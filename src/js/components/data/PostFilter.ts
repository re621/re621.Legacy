import { Post } from "./Post";
import { Tag } from "./Tag";

export class PostFilter {

    private entries: SinglePostFilter[];
    private enabled;
    private matchesCount;
    private matchesIds: Set<number>;

    constructor(input: string, enabled = true) {
        this.entries = [];
        this.enabled = enabled;
        this.matchesCount = 0;
        this.matchesIds = new Set();
        this.createPostFilter(input);
    }

    private createPostFilter(input: string): void {
        const seperatedFilters = input.split(" ");
        for (let filter of seperatedFilters) {
            //Remove dash from filter, if it starts with one
            const inverse = filter.startsWith("-");
            filter = inverse ? filter.substring(1) : filter;

            //get filter type, like tags, id, score
            let filterType = PostFilterType.getFromString(filter);
            if (filterType === undefined) {
                filterType = PostFilterType.Tags;
            } else {
                filter = filter.substring(filterType.length);
            }

            //Get comapre methods, like equals or smaller then
            let comparable = Comparable.getFromString(filter);
            if (comparable === undefined) {
                comparable = Comparable.Equals;
            } else {
                filter = filter.substring(comparable.length);
            }

            this.entries.push({ type: filterType, content: filter, invert: inverse, comparable: comparable });
        }
    }

    /**
     * Adds a post to this filter.
     * Most of the things that work on the site should also work here
     * @todo Implement ~ modifier
     * @param post the post to check agains
     * @param shouldDecrement if the matched counter should decrement if the post doesn't match
     * should be false for newly added posts, and true otherwise
     * @returns wether or not the filter matches the post
     */
    public addPost(post: Post, shouldDecrement: boolean): boolean {
        let result = true;
        for (const filter of this.entries) {
            //If the result is already negative, bail. All filters must match
            if (result === false) {
                break;
            }
            const content = filter.content;
            switch (filter.type) {
                case PostFilterType.Flag:
                    const flags = content;
                    result = post.getFlags() === flags;
                    break;
                case PostFilterType.Id:
                    const id = parseInt(content);
                    result = this.compareNumbers(post.getId(), id, filter.comparable);
                    break;
                case PostFilterType.Rating:
                    const rating = content;
                    result = post.getRating() === rating;
                    break;
                case PostFilterType.Score:
                    const score = parseInt(content);
                    result = this.compareNumbers(post.getScoreCount(), score, filter.comparable);
                    break;
                case PostFilterType.Tags:
                    result = this.tagsMatchesFilter(post, content);
                    break;
                case PostFilterType.Uploader:
                    const uploader = content;
                    result = post.getUploaderID() === parseInt(uploader);
                    break;
            }
            //invert the result, depending on if the filter started with a -
            result = result !== filter.invert;
        }
        if (result === true) {
            this.matchesCount++;
            this.matchesIds.add(post.getId());
        } else if (result === false && shouldDecrement) {
            this.matchesCount--;
            this.matchesIds.delete(post.getId());
        }
        return result;
    }

    public matchesPost(post: Post): boolean {
        return this.enabled && this.matchesIds.has(post.getId());
    }

    public compareNumbers(a: number, b: number, mode: Comparable): boolean {
        switch (mode) {
            case Comparable.Equals:
                return a === b;
            case Comparable.Smaller:
                return a < b;
            case Comparable.EqualsSmaller:
                return a <= b;
            case Comparable.Larger:
                return a > b;
            case Comparable.EqualsLarger:
                return a >= b;
        }
    }

    public tagsMatchesFilter(post: Post, filter: string): boolean {
        if (filter.includes("*")) {
            const regex = Tag.escapeSearchToRegex(filter);
            return regex.test(post.getTags());
        } else {
            //if there is no wildcard, the filter and tag must be an equal match
            for (const tag of post.getTags().split(" ")) {
                if (tag === filter) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Returns how many posts are affected by this filter
     */
    public getMatches(): number {
        return this.matchesCount;
    }

    /**
     * Enables/Disables the filter
     */
    public toggleEnabled(): void {
        this.enabled = !this.enabled;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }
}

export interface SinglePostFilter {
    type: PostFilterType;
    content: string;
    invert: boolean;
    comparable: Comparable;
}

export enum PostFilterType {
    Tags = "tag:",
    Id = "id:",
    Score = "score:",
    Rating = "rating:",
    Uploader = "uplaoder:",
    Flag = "flag:"
}

export namespace PostFilterType {
    export function getFromString(value: string): PostFilterType {
        for (const key of Object.keys(PostFilterType)) {
            if (value.startsWith(PostFilterType[key])) {
                return PostFilterType[key];
            }
        }
        return undefined;
    }
}

//Its important that they are in this order
//should the one character ones be in front they will match
//before the other ones have a chance
export enum Comparable {
    EqualsSmaller = "<=",
    EqualsLarger = ">=",
    Equals = "=",
    Smaller = "<",
    Larger = ">"
}

export namespace Comparable {
    export function getFromString(value: string): Comparable {
        for (const key of Object.keys(Comparable)) {
            if (value.startsWith(Comparable[key])) {
                return Comparable[key];
            }
        }
        return undefined;
    }
}
