import { Post, ViewingPost } from "../../components/data/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";

declare const Danbooru;

/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class PostViewer extends RE6Module {

    private post: ViewingPost;

    public constructor() {
        super(PageDefintion.post);
        this.registerHotkeys(
            { keys: "hotkeyUpvote", fnct: this.triggerUpvote },
            { keys: "hotkeyDownvote", fnct: this.triggerDownvote },
            { keys: "hotkeyFavorite", fnct: this.toggleFavorite }
        );
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

        this.registerHotkeys();
    }

    /** Creates the document structure for the module */
    private createDOM(): void {
        // Add the uploader name
        $("<li>")
            .append("Uploader: ")
            .append($("<a>").attr("href", "/users/" + this.post.getUploaderID()).text(this.post.getUploaderName()))
            .appendTo("#post-information ul");

        // Make the rating bold
        const rating = $("#post-rating-text").html();
        $("#post-rating-text").html("<b>" + rating + "</br>");

        // Move the add to set / pool buttons
        const $addToContainer = $("<div>").attr("id", "image-add-links").insertAfter("#image-download-link");
        $("li#add-to-set-list > a").addClass("image-add-set").html("+ Set").appendTo($addToContainer);
        $("li#add-to-pool-list > a").addClass("image-add-pool").html("+ Pool").appendTo($addToContainer);

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
        Danbooru.Post.vote(this.post.getId(), 1);
    }

    /** Emulates a click on the downvote button */
    private triggerDownvote(): void {
        Danbooru.Post.vote(this.post.getId(), -1);
    }

    /** Toggles the favorite state */
    private toggleFavorite(): void {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) { $("button#add-fav-button")[0].click(); }
        else { $("button#remove-fav-button")[0].click(); }
    }
}
