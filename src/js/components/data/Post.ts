import { TagTypes } from "./Tag";
import { User } from "./User";
import { APIPost, PostRating } from "../api/responses/APIPost";
import { PostHtml } from "../api/PostHtml";
import { ModuleController } from "../ModuleController";
import { ThumbnailEnhancer, PerformanceMode } from "../../modules/search/ThumbnailsEnhancer";

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
            const upscaleMode = ModuleController.get(ThumbnailEnhancer).fetchSettings("upscale");
            this.htmlElement = PostHtml.create(element, upscaleMode === PerformanceMode.Always);
        }

        for (const filter of User.getBlacklist().values()) {
            filter.addPost(this, false);
        }
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
    public matchesBlacklist(): boolean {
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
    public getTags(): string { return APIPost.getTagString(this.apiElement) }
    public getRating(): PostRating { return this.apiElement.rating; }
    public getFavCount(): number { return this.apiElement.fav_count; }
    public getScoreCount(): number { return this.apiElement.score.total; }

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
