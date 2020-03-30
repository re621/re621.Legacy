import { Post, ViewingPost, PostRating } from "../../components/data/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
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
            { keys: "hotkeyUpvote", fnct: this.triggerUpvote },
            { keys: "hotkeyDownvote", fnct: this.triggerDownvote },
            { keys: "hotkeyFavorite", fnct: this.toggleFavorite }
        );
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance(): PostViewer {
        if (this.instance == undefined) this.instance = new PostViewer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyUpvote: "w",
            hotkeyDownvote: "s",
            hotkeyFavorite: "f",

            autoOpenParentChild: true,
            upvoteOnFavorite: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        if (!this.canInitialize()) return;
        super.create();

        this.post = Post.getViewingPost();
        this.createDOM();

        const upvoteButton = $("a.post-vote-up-link");
        $("button#add-fav-button").click(() => {
            if (this.fetchSettings("upvoteOnFavorite") && !upvoteButton.parent().hasClass("score-positive")) {
                upvoteButton.click();
            }
        });

        this.registerHotkeys();
    }

    /** Creates the document structure for the module */
    private createDOM(): void {
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
        const $ratingContainer = $("<div>").attr("id", "image-score-links").prependTo("section#image-extra-controls");
        const postID = this.post.getId();
        const original = $("#post-vote-up-" + postID).parent().parent();

        const $voteDownButton = $("#post-vote-down-" + postID).addClass("image-score-down").appendTo($ratingContainer);
        $("#post-score-" + postID).addClass("image-score-num").appendTo($ratingContainer);
        const $voteUpButton = $("#post-vote-up-" + postID).addClass("image-score-up").appendTo($ratingContainer);

        if ($voteDownButton.hasClass("score-negative")) $ratingContainer.addClass("score-down");
        if ($voteUpButton.hasClass("score-positive")) $ratingContainer.addClass("score-up");

        $voteDownButton.find("a").on("click", function () {
            if ($voteDownButton.hasClass("score-negative")) { $ratingContainer.removeClass("score-down"); }
            else { $ratingContainer.removeClass("score-up").addClass("score-down"); }
        });

        $voteUpButton.find("a").on("click", function () {
            if ($voteUpButton.hasClass("score-positive")) { $ratingContainer.removeClass("score-up"); }
            else { $ratingContainer.removeClass("score-down").addClass("score-up"); }
        });

        // Move the add to set / pool buttons
        const $addToContainer = $("<div>").attr("id", "image-add-links").insertAfter("#image-download-link");
        $("li#add-to-set-list > a").addClass("image-add-set").html("+ Set").appendTo($addToContainer);
        $("li#add-to-pool-list > a").addClass("image-add-pool").html("+ Pool").appendTo($addToContainer);

        original.remove();

        // Move bottom notice, like child/parent indicator
        const $bottomNotices = $(".bottom-notices");
        $bottomNotices.insertAfter($("#search-box"));
        //expand child/parent container
        const $parentRel = $("#has-parent-relationship-preview-link");
        const $childRel = $("#has-children-relationship-preview-link");

        const autoOpen = this.fetchSettings("autoOpenParentChild");
        //only click on one container, because both open with one click. Clicking both results in them open and the closing
        if ($parentRel.length !== 0 && !$parentRel.is(":visible") && autoOpen) {
            $parentRel.click();
        } else if ($childRel.length !== 0 && !$childRel.is(":visible") && autoOpen) {
            $childRel.click();
        }
        //remeber toggle state
        $parentRel.add($childRel).on("click", () => {
            this.pushSettings("autoOpenParentChild", !autoOpen);
        });
    }

    /** Emulates a click on the upvote button */
    private triggerUpvote(): void {
        $("a.post-vote-up-link")[0].click();
    }

    /** Emulates a click on the downvote button */
    private triggerDownvote(): void {
        $("a.post-vote-down-link")[0].click();
    }

    /** Toggles the favorite state */
    private toggleFavorite(): void {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) { $("button#add-fav-button")[0].click(); }
        else { $("button#remove-fav-button")[0].click(); }
    }
}
