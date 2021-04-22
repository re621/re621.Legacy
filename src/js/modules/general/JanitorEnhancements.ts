import { Page, PageDefinition } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { RE6Module } from "../../components/RE6Module";

export class JanitorEnhancements extends RE6Module {

    private deletionReasons = [
        "Inferior version of post #%PARENT_ID%",
        "Inferior version/duplicate of post #%PARENT_ID%",
        "Previously deleted (post #%PARENT_ID%)",
        "Excessive same base image set",
        "Colored base",
        "",
        "Does not meet minimum quality standards (Artistic)",
        "Does not meet minimum quality standards (Resolution)",
        "Does not meet minimum quality standards (Compression)",
        "Does not meet minimum quality standards (Bad digitization of traditional media)",
        "Broken/corrupted file",
        "JPG resaved as PNG",
        "",
        "Irrelevant to site",
        "Irrelevant to site (Human only)",
        "",
        "Paysite/commercial content",
        "Takedown #",
        "Conditional DNP: Only the artist is allowed to post",
        "The artist of this post is on the [[avoid_posting|avoid posting list]]",
    ];

    public constructor() {
        super([], true);
    }

    public create(): void {

        if (Page.matches(PageDefinition.postConfirmDelete)) {
            this.appendDeletionReasons();
        }

        if (Page.matches(PageDefinition.post)) {
            this.cleanupRecords();
            this.decorateArtistName();
        }

    }

    private appendDeletionReasons(): void {
        const form = $("form.simple_form");
        const input = $("#reason");
        input.addClass("deletion-reason-input")

        const parentEl = $("form.simple_form article");
        const parentID = parentEl.length > 0 ? parentEl.attr("data-id") : "";

        const suggestionsWrapper = $("<div>")
            .addClass("deletion-reason-suggestions")
            .appendTo(form);

        $("<a>")
            .html("=== Clear All ===")
            .appendTo(suggestionsWrapper)
            .on("click", (event) => {
                event.preventDefault();
                input.val("");
            });
        $("<br />").appendTo(suggestionsWrapper);

        for (const reason of this.deletionReasons) {
            if (reason == "") $("<br />").appendTo(suggestionsWrapper);
            else $("<a>")
                .html(reason.replace(/%PARENT_ID%/g, parentID))
                .appendTo(suggestionsWrapper)
                .on("click", (event) => {
                    event.preventDefault();
                    input.val((index, current) => {
                        if (current.length > 0) current += " / ";
                        return current + reason.replace(/%PARENT_ID%/g, parentID);
                    });
                });
        }
    }

    private cleanupRecords(): void {
        for (const element of $("#post-information span.user-feedback-neutral, #post-information span.user-feedback-negative, #post-information span.user-feedback-positive").get()) {
            $(element).html((index, value) => value.replace(/ (Neutral|Neg|Pos)$/, ""));
        }
        $("#post-information a[href^='/user_feedbacks']").html((index, html) => html.replace(/^\( +/, "(").replace(/ +\)$/, ")"));
    }

    private decorateArtistName(): void {
        const post = Post.getViewingPost();
        // console.log(post.tags.artist, post.uploaderName.toLowerCase());
        if (post.tags.artist.has(post.uploaderName.toLowerCase()))
            $(`<span class="post-uploader-artist">(artist)</span>`).appendTo("#post-information li:contains('Uploader')");
    }

}
