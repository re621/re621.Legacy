import { TagTypes } from "./Tag";
import { User } from "./User";

/**
 * Collects basic info for a post.
 * Use fetchPosts to construct
 */
export class Post {

    private static initalPosts: Post[];
    private static addedPosts: Post[] = [];
    private static postThumbnails: Post[] = [];

    protected element: JQuery<HTMLElement>;

    protected id: number;
    protected tags: string;
    protected rating: PostRating;
    protected favorites?: number;
    protected score?: number;

    protected fileURL?: string;
    protected sampleURL?: string;
    protected previewURL: string;
    protected fileExtension: string;

    protected uploaderID: number;
    protected uploaderName: string;

    protected sound: boolean;
    protected flags: string;

    public constructor($image: JQuery<HTMLElement>) {
        this.id = parseInt($image.attr("data-id"));
        this.tags = $image.attr("data-tags");
        this.rating = PostRating.fromValue($image.attr("data-rating"));

        if ($image.attr("data-fav-count")) {
            this.favorites = parseInt($image.attr("data-fav-count"));
        }
        else if ($image.find(".post-score-faves").length !== 0) {
            this.favorites = parseInt($image.find(".post-score-faves").first().html().substring(1));
        }

        if ($image.attr("data-score")) {
            this.score = parseInt($image.attr("data-score"));
        }
        else if ($image.find(".post-score-score").length !== 0) {
            this.score = parseInt($image.find(".post-score-score").first().html().substring(1));
        }

        this.fileURL = $image.attr("data-file-url");
        this.sampleURL = $image.attr("data-large-file-url");
        this.previewURL = $image.attr("data-preview-file-url") || $image.attr("data-preview-url");
        this.fileExtension = $image.attr("data-file-ext");

        this.uploaderID = parseInt($image.attr("data-uploader-id"));
        this.uploaderName = $image.attr("data-uploader");
        this.sound = $image.attr("data-has-sound") === "true";
        this.flags = $image.attr("data-flags");

        this.element = $image;

        for (const filter of User.getBlacklist().values()) {
            filter.addPost(this, false);
        }

        //Remove blacklist class, this gets custom handling from the script
        $image.removeClass("blacklisted-active");
    }

    /**
     * Fetches the posts from the current page.
     */
    public static fetchPosts(): Post[] {
        if (this.initalPosts === undefined) {
            const imageContainer = $("#image-container");
            this.initalPosts = [];
            if (imageContainer.length === 0) {
                $("#posts-container").children(".post-preview").each((index, element) => {
                    Post.initalPosts.push(new Post($(element)));
                });
            } else {
                this.initalPosts.push(new ViewingPost(imageContainer));
            }
            $(".post-thumbnail").each((index, element) => {
                this.postThumbnails.push(new Post($(element)));
            });
        }

        return this.initalPosts.concat(this.addedPosts).concat(this.postThumbnails);
    }

    /**
     * Adds a post which will now be returned with fetchPosts
     * @param post the post to appened
     */
    public static appendPost(post): void {
        this.addedPosts.push(post);
    }

    /**
     * Creates a ViewingPost if you are on a post page (https://e621.net/posts/:id)
     * @returns the current ViewingPost if it exists, undefined otherwise
     */
    public static getViewingPost(): ViewingPost {
        const posts = this.fetchPosts();
        if (posts[0] instanceof ViewingPost) {
            return posts[0] as ViewingPost;
        } else {
            return undefined;
        }
    }

    public static createPreviewUrlFromMd5(md5: string): string {
        return `https://static1.e621.net/data/preview/${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}.jpg`;
    }

    /**
     * Hides or shows the post, depending on the state
     * Show if blacklist is not active, hide if blacklist is active and post matches blacklist
     */
    public applyBlacklist(): void {
        this.matchesBlacklist() ? this.hide() : this.show();
    }

    /**
     * Checks if the post is found in an activated blacklist filter
     */
    private matchesBlacklist(): boolean {
        for (const filter of User.getBlacklist().values()) {
            if (filter.matchesPost(this)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Hides the post and removes its src attribute, to prevent
     * loading of the image, if it's not already appended
     */
    public hide(): void {
        const $img = this.element.find("img");
        $img.attr("src", "/images/blacklisted-preview.png");
        this.element.addClass("filtered");
    }

    /**
     * Shows the post and restores the src attribute, if the blacklist allows it
     */
    public show(): void {
        if (this.matchesBlacklist()) {
            return;
        }
        const $img = this.element.find("img");
        $img.attr("src", this.previewURL);
        this.element.removeClass("filtered");
    }

    /**
     * Returns the JQuery Object for the post
     * @returns JQuery<HTMLElement> DOM Element
     */
    public getDomElement(): JQuery<HTMLElement> {
        return this.element;
    }

    public getId(): number { return this.id; }
    public getTags(): string { return this.tags; }
    public getRating(): PostRating { return this.rating; }
    public getFavCount(): number { return this.favorites; }
    public getScoreCount(): number { return this.score; }

    public getImageURL(): string { return this.fileURL; }
    public getSampleURL(): string { return this.sampleURL; }
    public getPreviewURL(): string { return this.previewURL; }

    public getFileExtension(): string { return this.fileExtension; }

    public getUploaderID(): number { return this.uploaderID; }
    public getUploaderName(): string { return this.uploaderName; }

    public hasSound(): boolean { return this.sound; }
    public getFlags(): string { return this.flags; }
}


/**
 * If you are viewing a post this element can be constructed
 */
export class ViewingPost extends Post {
    private isFaved: boolean;
    private isUpvoted: boolean;
    private isDownvoted: boolean;

    private artistTags: string[];
    private characterTags: string[];
    private copyrightTags: string[];
    private speciesTags: string[];
    private generalTags: string[];
    private metaTags: string[];
    private loreTags: string[];

    constructor($image: JQuery<HTMLElement>) {
        super($image);

        this.isFaved = $("#add-to-favorites").css("display") === "none";
        this.isUpvoted = $("#post-vote-up-" + this.id).hasClass("score-positive");
        this.isDownvoted = $("#post-vote-down-" + this.id).hasClass("score-negative");

        this.artistTags = this.getAllFromTaggroup("artist");
        this.characterTags = this.getAllFromTaggroup("character");
        this.copyrightTags = this.getAllFromTaggroup("copyright");
        this.speciesTags = this.getAllFromTaggroup("species");
        this.generalTags = this.getAllFromTaggroup("general");
        this.metaTags = this.getAllFromTaggroup("meta");
        this.loreTags = this.getAllFromTaggroup("lore");
    }

    private getAllFromTaggroup(taggroup: string): string[] {
        const result = [];
        for (const element of $(`#tag-list .${taggroup}-tag-list`).children()) {
            result.push($(element).find(".search-tag").text().replace(/ /g, "_"));
        }
        return result;
    }
    /**
     * Returns true if the post is favorited
     */
    public getIsFaved(): boolean {
        return this.isFaved;
    }

    /**
     * Returns true if the post is upvoted
     */
    public getIsUpvoted(): boolean {
        return this.isUpvoted;
    }

    /**
     * Returns true if the post is downvoted
     */
    public getIsDownvoted(): boolean {
        return this.isDownvoted;
    }

    /**
     * Returns an array of all the tags of the specified type, or an empty array if there are none
     */
    public getTagsFromType(tagType: TagTypes): string[] {
        return this[tagType + "Tags"];
    }
}

export enum PostRating {
    Safe = "s",
    Questionable = "q",
    Explicit = "e"
}

export namespace PostRating {
    export function fromValue(value: string): PostRating {
        for (const key of Object.keys(PostRating)) {
            if (PostRating[key] === value) {
                return PostRating[key];
            }
        }
        return undefined;
    }

    export function toString(postRating: PostRating): string {
        for (const key of Object.keys(PostRating)) {
            if (PostRating[key] === postRating) {
                return key;
            }
        }
        return undefined;
    }
}
