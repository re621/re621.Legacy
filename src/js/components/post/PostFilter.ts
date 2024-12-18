import { PostFlag, PostRating } from "../api/responses/APIPost";
import { Tag } from "../data/Tag";
import { User } from "../data/User";
import { Util } from "../utility/Util";
import { Post, PostData } from "./Post";

export class PostFilter {

    private input: string;

    private entries: Filter[];          // individual filters
    private enabled: boolean;           // if false, the filters are ignored
    private matchIDs: Set<number>;      // post IDs matched by the filter
    private optionals: number;          // number of optional filters

    constructor(input: string, enabled = true, options?: FilterOptions) {
        this.input = input.toLowerCase().trim();
        this.entries = [];
        this.enabled = enabled;
        this.matchIDs = new Set();
        this.optionals = 0;

        if (options) {
            if (options.favorites) this.entries.push({ type: FilterType.Fav, value: User.username, inverted: true, optional: false, comparison: ComparisonType.Equals });
            if (options.uploads) this.entries.push({ type: FilterType.UserID, value: User.userID + "", inverted: true, optional: false, comparison: ComparisonType.Equals });
            if (options.whitelist)
                for (const tag of options.whitelist.split(" "))
                    this.entries.push({ type: FilterType.Tag, value: tag, inverted: true, optional: false, comparison: ComparisonType.Equals });
        }

        for (let filter of new Set(this.input.split(" ").filter(e => e != ""))) {

            // Filter is optional
            const optional = filter.startsWith("~");
            if (optional) {
                filter = filter.substring(1);
                this.optionals++;
            }

            // Filter is inverted
            const inverse = filter.startsWith("-");
            if (inverse) filter = filter.substring(1);

            // Get filter type: tag, id, score, rating, etc.
            const filterType = FilterType.test(filter);
            if (filterType !== FilterType.Tag)
                filter = filter.substring(filterType.length + 1);

            // Get comparison methods: equals, smaller then, etc
            const comparison = ComparisonType.test(filter);
            if (comparison !== ComparisonType.Equals && comparison !== ComparisonType.Range)
                filter = filter.substring(comparison.length);

            // Convert some values immediately
            switch (filterType) {
                case FilterType.Size:
                    filter = Util.Size.unformat(filter) + "";
                    break;
                case FilterType.IsParent:
                case FilterType.IsChild:
                    if(!["true", "false", "yes", "no"].includes(filter))
                        continue;

                    if(filter == "yes") filter = "true";
                    else if(filter == "no") filter = "false";

                    break;
            }
            filter = filter.toLowerCase();

            this.entries.push({ type: filterType, value: filter, inverted: inverse, optional: optional, comparison: comparison });
        }
    }

    /** Returns the original string from which this filter was created */
    public getName(): string {
        return this.input;
    }

    /**
     * Tests the provided post against the filter, and adds it to the cache if it passes.  
     * Should be triggered every time a post is added or updated.
     * @param post Post to test against
     * @param shouldDecrement If false, does not remove the post from the filter if the tests fail
     * @returns Whether or not the filter matches the post. 
     * If multiple posts are provided, returns true if all of them match.
     */
    public update(post: PostData | PostData[], shouldDecrement = true): boolean {

        // Take care of the multiple posts separately
        if (Array.isArray(post)) {
            let result = true;
            for (const entry of post)
                result = this.update(entry) ? result : false;
            return result;
        }

        // Check if the post matches the filter
        let result = false;
        let optionalHits = 0;
        for (const filter of this.entries) {

            const value = filter.value;
            switch (filter.type) {
                case FilterType.Tag:
                    result = PostFilterUtils.tagsMatchesFilter(post, value);
                    break;
                case FilterType.Id:
                    result = PostFilterUtils.compareNumbers(post.id, value, filter.comparison);
                    break;
                case FilterType.Score:
                    result = PostFilterUtils.compareNumbers(post.score.total, value, filter.comparison);
                    break;
                case FilterType.Fav:
                    result = post.is_favorited;
                    break;
                case FilterType.FavCount:
                    result = PostFilterUtils.compareNumbers(post.favorites, value, filter.comparison);
                    break;
                case FilterType.Rating:
                    result = post.rating === PostRating.fromValue(value);
                    break;
                case FilterType.Flag:
                    result = post.flags.has(PostFlag.fromSingle(value));
                    break;

                case FilterType.Uploader:
                case FilterType.User:
                case FilterType.UserID:
                    result = post.uploader === parseInt(value);
                    break;
                case FilterType.Approver:
                    result = post.approver === parseInt(value);
                    break;

                case FilterType.Height:
                    result = PostFilterUtils.compareNumbers(post.img.height, value, filter.comparison);
                    break;
                case FilterType.Width:
                    result = PostFilterUtils.compareNumbers(post.img.width, value, filter.comparison);
                    break;
                case FilterType.Size:
                    result = PostFilterUtils.compareNumbers(post.file.size, value, filter.comparison);
                    break;
                case FilterType.Type:
                    result = post.file.ext === value;
                    break;
                case FilterType.Duration:
                    result = post.meta.duration == null || PostFilterUtils.compareNumbers(post.meta.duration, value, filter.comparison);
                    break;
                case FilterType.Ratio:
                    result = PostFilterUtils.compareNumbers(post.img.ratio, value, filter.comparison);
                    break;

                case FilterType.TagCount:
                    result = PostFilterUtils.compareNumbers(post.tags.all.size, value, filter.comparison)
                    break;
                case FilterType.GenTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.general.size, value, filter.comparison)
                    break;
                case FilterType.ArtTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.artist.size, value, filter.comparison)
                    break;
                case FilterType.ContTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.contributor.size, value, filter.comparison)
                    break;
                case FilterType.CharTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.character.size, value, filter.comparison)
                    break;
                case FilterType.CopyTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.copyright.size, value, filter.comparison)
                    break;
                case FilterType.SpecTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.species.size, value, filter.comparison)
                    break;
                case FilterType.InvTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.invalid.size, value, filter.comparison)
                    break;
                case FilterType.MetaTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.meta.size, value, filter.comparison)
                    break;
                case FilterType.LoreTags:
                    result = post.tagCategoriesKnown && PostFilterUtils.compareNumbers(post.tags.lore.size, value, filter.comparison)
                    break;

                case FilterType.IsParent:
                    result = post.has.children;
                    if(value == "false") result = !result;
                    break;
                case FilterType.IsChild:
                    result = post.has.parent;
                    if(value == "false") result = !result;
                    break;

                
                default:
                    result = false;
            }

            // Invert the result if necessary
            if (filter.inverted) result = !result;

            if (filter.optional) optionalHits += result ? 1 : 0;
            else if (!result) break;
        }

        // The post must match all normal filters, and at least one optional one
        if(this.optionals > 0)
            result = ((this.entries.length - this.optionals > 0) || result) && optionalHits > 0;

        if (result === true) this.matchIDs.add(post.id);
        else if (result === false && shouldDecrement) this.matchIDs.delete(post.id);
        return result;
    }

    /**
     * Returns true if the provided post matches the filter
     * @param post Post to test against the filter
     * @param ignoreDisabled Return the result regardless of the filter's state
     */
    public matches(post: Post, ignoreDisabled = false): boolean {
        return this.matchesID(post.id, ignoreDisabled);
    }

    /**
     * Returns true if the provided post matches the filter
     * @param id ID of the post to test against the filter
     * @param ignoreDisabled Return the result regardless of the filter's state
     */
    public matchesID(id: number, ignoreDisabled = false): boolean {
        return (this.enabled || ignoreDisabled) && this.matchIDs.has(id);
    }

    /**
     * Alternative approach to `matchesID` method.  
     * Returns:
     * - 0 if the filter does not match
     * - 1 if the filter matches, and is enabled
     * - 2 if the filter matches, but is disabled
     * @param id ID of the post to test against the filter
     */
    public matchesIDAlt(id: number): number {
        if (this.matchIDs.has(id)) return this.enabled ? 1 : 2;
        return 0;
    }

    public getMatches(): Set<number> { return this.matchIDs; }
    public getMatchesCount(): number { return this.matchIDs.size; }

    public toggleEnabled(): void { this.enabled = !this.enabled; }
    public setEnabled(enabled: boolean): void { this.enabled = enabled; }
    public isEnabled(): boolean { return this.enabled; }

}

class PostFilterUtils {

    /** Returns true if the two provided numbers pass the specified comparison type */
    public static compareNumbers(a: number, b: string, mode: ComparisonType): boolean {
        switch (mode) {
            case ComparisonType.Equals: return a === parseFloat(b);
            case ComparisonType.Smaller: return a < parseFloat(b);
            case ComparisonType.EqualsSmaller: return a <= parseFloat(b);
            case ComparisonType.Larger: return a > parseFloat(b);
            case ComparisonType.EqualsLarger: return a >= parseFloat(b);
            case ComparisonType.Range: {
                const parts = b.split("...");
                if (parts.length !== 2) return false;
                console.log(parts);

                const parsedParts = [];
                for (const el of parts) parsedParts.push(parseFloat(el));

                console.log(parsedParts, Math.min(...parsedParts), Math.max(...parsedParts), a >= Math.min(...parsedParts), a <= Math.max(...parsedParts));

                return a >= Math.min(...parsedParts) && a <= Math.max(...parsedParts);
            }
        }
        return false;
    }

    /** Returns true if the specified post has the provided tag */
    public static tagsMatchesFilter(post: PostData, filter: string): boolean {
        if (filter.includes("*")) {
            const regex = Tag.escapeSearchToRegex(filter);
            return regex.test(post.tagString);
        }
        return post.tags.all.has(filter);
    }

}

interface Filter {
    type: FilterType;
    value: string;
    inverted: boolean;
    optional: boolean;
    comparison: ComparisonType;
}

enum FilterType {
    Tag = "tag",
    Id = "id",
    Score = "score",
    Fav = "fav",
    FavCount = "favcount",
    Rating = "rating",
    Flag = "status",

    Uploader = "uploader",
    User = "user",
    UserID = "userid",
    Approver = "approvedby",

    Height = "height",
    Width = "width",
    Size = "filesize",
    Type = "type",
    Duration = "duration",
    Ratio = "ratio",

    // TODO Date ???

    TagCount = "tagcount",
    GenTags = "gentags",
    ArtTags = "arttags",
    ContTags = "conttags",
    CharTags = "chartags",
    CopyTags = "copytags",
    SpecTags = "spectags",
    InvTags = "invtags",
    MetaTags = "metatags",
    LoreTags = "lortags",

    IsParent = "isparent",
    IsChild = "ischild",
}

namespace FilterType {
    export function test(input: string): FilterType {
        input = input.toLowerCase();
        for (const key of Object.keys(FilterType))
            if (input.startsWith(FilterType[key] + ":")) return FilterType[key];
        return FilterType.Tag;
    }
}

// Its important that they are in this order
// should the one character ones be in front they will match
// before the other ones have a chance
enum ComparisonType {
    EqualsSmaller = "<=",
    EqualsLarger = ">=",
    Equals = "=",
    Smaller = "<",
    Larger = ">",
    Range = "...",
}

const ComparisonTypeAliases = {
    "<=": ComparisonType.EqualsSmaller,
    "=<": ComparisonType.EqualsSmaller,
    ">=": ComparisonType.EqualsLarger,
    "=>": ComparisonType.EqualsLarger,
    "=": ComparisonType.Equals,
    "==": ComparisonType.Equals,
    "<": ComparisonType.Smaller,
    ">": ComparisonType.Larger,
}

namespace ComparisonType {
    export function test(input: string): ComparisonType {
        input = input.toLowerCase();
        if (/.+\.\.\..+/.test(input)) return ComparisonType.Range;
        for (const [key, comparison] of Object.entries(ComparisonTypeAliases))
            if (input.startsWith(key)) return comparison;
        return ComparisonType.Equals;
    }
}

export interface FilterOptions {
    favorites: boolean;
    uploads: boolean;
    whitelist: string;
}
