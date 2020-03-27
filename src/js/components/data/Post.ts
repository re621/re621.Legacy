import { TagTypes } from "./Tag";
import { BlacklistEnhancer } from "../../modules/search/BlacklistEnhancer";

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

    protected isBlacklisted: boolean;

    protected static blacklistMatches = new Map<string, number>();

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

        //Remove blacklist class, this gets custom handling from the script
        $image.removeClass("blacklisted-active");

        //Check if a post will be hidden if the blacklist is active
        //Cache this result, to prevent having to recalculate it everytime the blacklist toggles
        this.isBlacklisted = this.matchesSiteBlacklist();
    }

    /**
     * Fetches the posts from the current page.
     */
    public static fetchPosts() {
        if (this.initalPosts === undefined) {
            let imageContainer = $("#image-container");
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
    public static appendPost(post) {
        this.addedPosts.push(post);
    }

    /**
     * Creates a ViewingPost if you are on a post page (https://e621.net/posts/:id)
     * @returns the current ViewingPost if it exists, undefined otherwise
     */
    public static getViewingPost() {
        const posts = this.fetchPosts();
        if (posts[0] instanceof ViewingPost) {
            return <ViewingPost>posts[0];
        } else {
            return undefined;
        }
    }

    /**
     * Checks if posts should be hidden, because the blacklist is active
     */
    public static blacklistIsActive() {
        return $("#disable-all-blacklists").is(":visible");
    }

    /**
     * Hides or shows the post, depending on the state
     * Show if blacklist is not active, hide if blacklist is active and post matches blacklist
     * @param blacklistIsActive true if blacklist is active, false otherwise
     */
    public applyBlacklist(blacklistIsActive: boolean) {
        if (this.getIsBlacklisted()) {
            blacklistIsActive ? this.hide() : this.show();
        } else {    //It's not blacklisted, show it instead
            this.show();
        }
    }

    /**
     * Hides the post and removes its src attribute, to prevent
     * loading of the image, if it's not already appended
     */
    public hide() {
        const $img = this.element.find("img");
        $img.attr("src", "/images/blacklisted-preview.png");
        this.element.addClass("filtered");
    }

    /**
     * Shows the post and restores the src attribute, if the blacklist allows it
     */
    public show(blacklistIsActive = false) {
        if (blacklistIsActive === true && this.isBlacklisted) {
            return;
        }
        const $img = this.element.find("img");
        $img.attr("src", this.previewURL);
        this.element.removeClass("filtered");
    }

    /**
     * Checks if a post should be hidden by the users blacklist
     * Also takes care to update blacklist match counter
     * https://github.com/zwagoth/e621ng/blob/master/app/javascript/src/javascripts/blacklists.js
     */
    private matchesSiteBlacklist() {
        let hits = 0;
        for (const filter of BlacklistEnhancer.getInstance().getFilters()) {
            if (filter.matchesPost(this)) {
                const currentMatches = Post.blacklistMatches.get(filter.getStringRepresentation());
                Post.blacklistMatches.set(filter.getStringRepresentation(), currentMatches === undefined ? 1 : currentMatches + 1);
                hits++;
            }
        }
        return hits !== 0;
    }

    /**
     * Reparsed the the blacklist status of all posts, in case the blacklist got modified
     */
    public static refreshBlacklistStatus() {
        //empty current status and itterate over every post and check again
        this.blacklistMatches = new Map<string, number>();
        for (const post of this.fetchPosts()) {
            post.isBlacklisted = post.matchesSiteBlacklist();
        }
    }

    /**
     * Returns the JQuery Object for the post
     * @returns JQuery<HTMLElement> DOM Element
     */
    public getDomElement() {
        return this.element;
    }

    /**
     * Returns true if post can be hidden by blacklist
     * @returns true if the post can be hidden by the blacklist, false otherwise
     */
    public getIsBlacklisted() {
        return this.isBlacklisted;
    }

    public static getBlacklistMatches() {
        return this.blacklistMatches;
    }

    public getId() { return this.id; }
    public getTags() { return this.tags; }
    public getRating() { return this.rating; }
    public getFavCount() { return this.favorites; }
    public getScoreCount() { return this.score; }

    public getImageURL() { return this.fileURL; }
    public getSampleURL() { return this.sampleURL; }
    public getPreviewURL() { return this.previewURL; }

    public getFileExtension() { return this.fileExtension; }

    public getUploaderID() { return this.uploaderID; }
    public getUploaderName() { return this.uploaderName; }

    public hasSound() { return this.sound; }
    public getFlags() { return this.flags; }
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

    private getAllFromTaggroup(taggroup: string) {
        const result = [];
        for (const element of $(`#tag-list .${taggroup}-tag-list`).children()) {
            result.push($(element).find(".search-tag").text().replace(/ /g, "_"));
        }
        return result;
    }
    /**
     * Returns true if the post is favorited
     */
    public getIsFaved() {
        return this.isFaved;
    }

    /**
     * Returns true if the post is upvoted
     */
    public getIsUpvoted() {
        return this.isUpvoted;
    }

    /**
     * Returns true if the post is downvoted
     */
    public getIsDownvoted() {
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
    export function fromValue(value: string) {
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
