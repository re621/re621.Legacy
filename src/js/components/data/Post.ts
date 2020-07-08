import { PostHtml } from "../api/PostHtml";
import { APIPost, PostRating } from "../api/responses/APIPost";
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

    protected htmlElement: JQuery<HTMLElement>;
    protected apiElement: APIPost;

    private tags: string[];

    /**
     * 
     * @param element The element to create the post from. Can either be dom element or api element
     *                Depending on what was passed the other one gets created from the other elemenet
     */
    public constructor(element: JQuery<HTMLElement> | APIPost) {
        if (element instanceof jQuery) {
            element = element as JQuery<HTMLElement>;
            element.removeClass("blacklisted-active");
            this.apiElement = APIPost.fromDomElement(element);
            this.htmlElement = element;
        } else {
            element = element as APIPost;
            this.apiElement = element;
            this.htmlElement = PostHtml.create(element);
        }

        for (const filter of User.getBlacklist().values()) {
            filter.addPost(this, false);
        }

        this.tags = APIPost.getTags(this.apiElement);
    }

    /**
     * Fetches the posts from the current page.
     */
    public static fetchPosts(): Post[] {
        if (this.initalPosts === undefined) {
            const imageContainer = $("section#image-container");
            this.initalPosts = [];
            if (imageContainer.length === 0) {
                const previews = $("div#posts-container").children(".post-preview").get();
                for (const preview of previews) this.initalPosts.push(new Post($(preview)));
            } else this.initalPosts.push(new ViewingPost(imageContainer));

            // What does this do? Nobody knows.
            for (const thumbnail of $(".post-thumbnail").get())
                this.postThumbnails.push(new Post($(thumbnail)));
        }

        return [...this.initalPosts, ...this.addedPosts, ...this.postThumbnails];
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
        //Assume that the post is flash when no md5 is passed
        if (md5 === "") {
            return "https://static1.e621.net/images/download-preview.png";
        }
        return `https://static1.e621.net/data/preview/${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}.jpg`;
    }

    public static createThumbnailURLFromMd5(md5: string): string {
        return `https://static1.e621.net/data/crop/${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}.jpg`;
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
    public matchesBlacklist(ignoreDisabled = false): boolean {
        for (const filter of User.getBlacklist().values()) {
            if (filter.matchesPost(this, ignoreDisabled)) {
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
        this.htmlElement.addClass("filtered");
    }

    /**
     * Shows the post and restores the src attribute, if the blacklist allows it
     */
    public show(): void {
        if (this.matchesBlacklist()) {
            return;
        }
        this.htmlElement.removeClass("filtered");
    }

    /**
     * Returns the JQuery Object for the post
     * @returns JQuery<HTMLElement> DOM Element
     */
    public getDomElement(): JQuery<HTMLElement> {
        return this.htmlElement;
    }

    public getId(): number { return this.apiElement.id; }
    public getMD5(): string { return this.apiElement.file.md5; }
    public getRating(): PostRating { return this.apiElement.rating; }
    public getFavCount(): number { return this.apiElement.fav_count; }
    public getScoreCount(): number { return this.apiElement.score.total; }

    public getAPIElement(): APIPost { return this.apiElement; }

    /**
     * Returns all post tags as one space-separated string
     * @deprecated Replaced by getTagString()
     */
    public getTags(): string { return this.getTagString(); }

    /**
     * Returns all post tags as one space-separated string
     */
    public getTagString(): string {
        return APIPost.getTagString(this.apiElement);
    }

    /**
     * Returns post tags of the specified type as an array.  
     * If no type is provided, returns all post tags.  
     * @param tagType Tag type, i.e. artist, character, lore, etc.
     */
    public getTagArray(tagType?: string): string[] {
        if (tagType === undefined) return this.tags;
        else return this.apiElement.tags[tagType];
    }

    /**
     * Checks the post contains the specified tags.  
     * Also works with post-based metatags, as defined here: https://e621.net/help/cheatsheet#post-based_metatags
     * @param tag Tag to look for
     */
    public hasTag(tag: string): boolean {
        const tagPieces = tag.split(":");
        if (tagPieces.length == 1) return this.tags.includes(tag);

        const value = tagPieces[1];
        switch (tagPieces[0]) {
            case "id": { return matchRange(this.getId(), value); }
            case "score": { return matchRange(this.getScoreCount(), value); }
            case "favcount": { return matchRange(this.getFavCount(), value); }
            case "comments": { return false; }  // N/A
            case "tagcount": { return matchRange(this.getTagArray().length, value); }
            case "gentags": { return matchRange(this.getTagArray("general").length, value); }
            case "arttags": { return matchRange(this.getTagArray("artist").length, value); }
            case "chartags": { return matchRange(this.getTagArray("character").length, value); }
            case "copytags": { return matchRange(this.getTagArray("copyright").length, value); }
            case "speciestags": { return matchRange(this.getTagArray("species").length, value); }
            case "loretags": { return matchRange(this.getTagArray("lore").length, value); }
            case "metatags": { return matchRange(this.getTagArray("meta").length, value); }
        }

        return false;

        function matchRange(target, value): boolean {
            if (value.substr(0, 1) === "<") {
                if (value.substr(1, 1) === "=") return target <= parseInt(value.substr(2));
                else return target < parseInt(value.substr(1));
            } else if (value.substr(0, 1) === ">") {
                if (value.substr(1, 1) === "=") return target >= parseInt(value.substr(2));
                else return target > parseInt(value.substr(1));
            } else return target == parseInt(value);
        }
    }

    public getImageURL(): string { return this.apiElement.file.url; }
    public getSampleURL(): string { return this.apiElement.sample.url; }
    public getPreviewURL(): string { return this.apiElement.preview.url; }

    public getFileExtension(): string { return this.apiElement.file.ext; }

    public getUploaderID(): number { return this.apiElement.uploader_id; }

    public hasSound(): boolean { return this.getTags().indexOf("sound") !== -1 }
    public getFlags(): string { return APIPost.getFlagString(this.apiElement); }
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
        this.isUpvoted = $(".post-vote-up-" + this.apiElement.id).first().hasClass("score-positive");
        this.isDownvoted = $(".post-vote-down-" + this.apiElement.id).first().hasClass("score-negative");

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
