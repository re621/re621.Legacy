import { Post, ViewingPost, PostRating } from "../../components/data/Post";
import { RE6Module } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";


/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class PostViewer extends RE6Module {

    private static instance: PostViewer = new PostViewer();
    private post: ViewingPost;

    private constructor() {
        super(PageDefintion.post);
        if (!this.eval()) return;

        this.post = Post.getViewingPost();
        this.createDOM();
    }

    private createDOM() {
        if (this.fetchSettings("showUploader") === true) {
            this.showUploader();
        }
        if (this.fetchSettings("colorizeRating") === true) {
            this.colorizeRating();
        }

        this.moveScoringBlock();
    }

    private showUploader() {
        const uploaderName = this.post.getUploaderName();
        const uploaderId = this.post.getUploaderID();
        const $ul = $("#post-information ul");
        const $li = $("<li>").append("Uploader: ").append($("<a>").attr("href", "/users/" + uploaderId).text(uploaderName));
        $ul.append($li);
    }

    private colorizeRating() {
        const _self = this;
        $("#post-information ul li").each(function () {
            const $this = $(this);
            if (!$this.text().startsWith("Rating:")) {
                return;
            }
            const rating = _self.post.getRating();
            const $li = $("<li>").append("Rating: ").append($("<b>").text(PostRating.toString(rating)).addClass("colorize-rating-" + rating));
            $this.replaceWith($li);
        });
    }

    private moveScoringBlock() {
        let $ratingContainer = $("<div>").attr("id", "image-score-links").prependTo("section#image-extra-controls");
        let postID = this.post.getId();
        let original = $("#post-vote-up-" + postID).parent().parent();

        $("#post-vote-up-" + postID).addClass("image-score-up").appendTo($ratingContainer);
        $("#post-score-" + postID).addClass("image-score-num").appendTo($ratingContainer);
        $("#post-vote-down-" + postID).addClass("image-score-down").appendTo($ratingContainer);

        original.remove();
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            "showUploader": true,
            "colorizeRating": true
        };
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new PostViewer();
        return this.instance;
    }
}
