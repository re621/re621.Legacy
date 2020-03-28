import { Post, ViewingPost, PostRating } from "../../components/data/Post";
import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";


/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class PostViewer extends RE6Module {

    private static instance: PostViewer;
    private post: ViewingPost;

    private constructor() {
        super(PageDefintion.post);
        this.registerHotkeys(
            { keys: "hotkey_upvote", fnct: this.triggerUpvote },
            { keys: "hotkey_downvote", fnct: this.triggerDownvote },
            { keys: "hotkey_favorite", fnct: this.toggleFavorite }
        );
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new PostViewer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            enabled: true,
            hotkey_upvote: "a",
            hotkey_downvote: "z",
            hotkey_favorite: "f",

            auto_open_parent_child: true,
            upvote_on_favorite: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();

        this.post = Post.getViewingPost();
        this.createDOM();

        let upvoteButton = $("a.post-vote-up-link");
        $("button#add-fav-button").click(() => {
            if (this.fetchSettings("upvote_on_favorite") && !upvoteButton.parent().hasClass("score-positive")) {
                upvoteButton.click();
            }
        });

        this.registerHotkeys();
    }

    /** Creates the document structure for the module */
    private createDOM() {
        // Add the uploader name
        $("<li>")
            .append("Uploader: ")
            .append($("<a>").attr("href", "/users/" + this.post.getUploaderID()).text(this.post.getUploaderName()))
            .appendTo("#post-information ul");

        // Colorize the rating
        $("#post-information ul li:contains('Rating: ')")
            .html("Rating: ")
            .append($("<b>").text(PostRating.toString(this.post.getRating())).addClass("colorize-rating-" + this.post.getRating()));

        // Move the scoring block
        let $ratingContainer = $("<div>").attr("id", "image-score-links").prependTo("section#image-extra-controls");
        let postID = this.post.getId();
        let original = $("#post-vote-up-" + postID).parent().parent();

        $("#post-vote-down-" + postID).addClass("image-score-down").appendTo($ratingContainer);
        $("#post-score-" + postID).addClass("image-score-num").appendTo($ratingContainer);
        $("#post-vote-up-" + postID).addClass("image-score-up").appendTo($ratingContainer);

        original.remove();

        // Move bottom notice, like child/parent indicator
        let $bottomNotices = $(".bottom-notices");
        $bottomNotices.insertAfter($("#search-box"));
        //expand child/parent container
        let $parentRel = $("#has-parent-relationship-preview-link");
        let $childRel = $("#has-children-relationship-preview-link");

        let autoOpen = this.fetchSettings("auto_open_parent_child")
        //only click on one container, because both open with one click. Clicking both results in them open and the closing
        if ($parentRel.length !== 0 && !$parentRel.is(":visible") && autoOpen) {
            $parentRel.click();
        } else if ($childRel.length !== 0 && !$childRel.is(":visible") && autoOpen) {
            $childRel.click();
        }
        //remeber toggle state
        $parentRel.add($childRel).on("click", () => {
            this.pushSettings("auto_open_parent_child", !autoOpen);
        });
    }

    /** Emulates a click on the upvote button */
    private triggerUpvote() {
        $("a.post-vote-up-link")[0].click();
    }

    /** Emulates a click on the downvote button */
    private triggerDownvote() {
        $("a.post-vote-down-link")[0].click();
    }

    /** Toggles the favorite state */
    private toggleFavorite() {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) { $("button#add-fav-button")[0].click(); }
        else { $("button#remove-fav-button")[0].click(); }
    }
}
