import { Post } from "./Post";
import { Tag } from "./Tag";

export class PostFilter {

    private entries: SinglePostFilter[];

    constructor(input: string) {
        this.entries = [];
        this.createPostFilter(input);
    }

    private createPostFilter(input: string) {
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
    * Checks if the post would be returned if you searched on the site with filterString
    * Most of the things that work on the site should also work here
    * @todo Implement ~ modifier
    */
    public matchesPost(post: Post) {
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
                    const uploader = content
                    result = post.getUploaderID() === parseInt(uploader) || post.getUploaderName() === uploader;
                    break;
            }
            //invert the result, depending on if the filter started with a -
            result = result !== filter.invert;
        }
        return result;
    }

    public compareNumbers(a: number, b: number, mode: Comparable) {
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

    public tagsMatchesFilter(post: Post, filter: string) {
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
}

export interface SinglePostFilter {
    type: PostFilterType
    content: string,
    invert: boolean,
    comparable: Comparable
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
