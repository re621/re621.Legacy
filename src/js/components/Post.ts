import { TagTypes } from "./Tag";

/**
 * Collects basic info for a post.
 * Constructable via getVisiblePosts or getViewingPost
 */
export class Post {

    private domElement: JQuery<HTMLElement>;
    private id: number;
    private tags: string;
    private rating: string;
    private favCount: number;
    private scoreCount: number


    constructor(id: number, tags: string, rating: string, favCount: number, scoreCount: number) {
        this.id = id;
        this.tags = tags;
        this.rating = rating;
        this.favCount = favCount;
        this.scoreCount = scoreCount;
    }

    /**
     * Fetches all posts if you are on https://e621.net/posts or similar
     */
    public static getVisiblePosts() {
        let result: Post[] = [];
        $("#posts-container").children(".post-preview").each(function () {
            const post = new Post(
                parseInt(this.getAttribute("data-id")),
                this.getAttribute("data-tags"),
                this.getAttribute("data-rating"),
                //substring to remove the prefix, like arrowdown, or heart
                parseInt(this.querySelector(".post-score-faves").innerHTML.substring(1)),
                parseInt(this.querySelector(".post-score-score").innerHTML.substring(1)));
            post.setDomElement($(this));
            result.push(post);
        });
        return result;
    }

    /**
     * Creates a ViewingPost if you are on a post page (https://e621.net/posts/:id)
     * @returns the current post if it exists, undefined otherwise
     */
    public static getViewingPost() {
        const $postElememt = $("#image-container");
        if ($postElememt.length === 0) {
            return undefined;
        }
        const post = new ViewingPost(
            parseInt($postElememt.attr("data-id")),
            $postElememt.attr("data-tags"),
            $postElememt.attr("data-rating"),
            parseInt($postElememt.find("img").attr("data-fav-count")),
            parseInt($postElememt.find("img").attr("data-score"))
        );
        post.setDomElement($postElememt);
        return post;
    }

    public setDomElement(element: JQuery<HTMLElement>) {
        this.domElement = element;
    }

    public getDomElement() {
        return this.domElement;
    }

    /**
     * Returns the posts id
     */
    public getId() {
        return this.id;
    }
    /**
     * Returns the posts tags space seperated
     */
    public getTags() {
        return this.tags;
    }

    /**
     * Returns the posts rating, as a char (e, q, s)
     */
    public getRating() {
        return this.rating;
    }

    /**
     * Returns the posts favorites
     */
    public getFavCount() {
        return this.favCount;
    }

    /**
     * Returns the posts score
     */
    public getScoreCount() {
        return this.scoreCount;
    }
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

    constructor(id: number, tags: string, rating: string, favCount: number, voteCount: number) {
        super(id, tags, rating, favCount, voteCount);
        this.isFaved = $("#add-to-favorites").css("display") === "none";
        this.isUpvoted = $("#post-vote-up-" + id).hasClass("score-positive");
        this.isDownvoted = $("#post-vote-down-" + id).hasClass("score-negative");

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
