import { Page, PageDefinition } from "../../components/data/Page";
import { Post, PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

export class JanitorEnhancements extends RE6Module {

    public constructor() {
        super([], true);
        this.registerHotkeys(
            { keys: "hotkeyApprovePost", fnct: this.approvePost },
            { keys: "hotkeyApprovePostPrev", fnct: this.approvePostPrev },
            { keys: "hotkeyApprovePostNext", fnct: this.approvePostNext },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyApprovePost: "",
            hotkeyApprovePostPrev: "",
            hotkeyApprovePostNext: "",
        }
    }

    public create(): void {

        if (Page.matches(PageDefinition.post)) {
            this.cleanupRecords();
            this.decorateArtistName();
        }

        if (Page.matches(PageDefinition.postConfirmDelete)) {
            this.enhanceDeletionpage();
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

    private approvePost(): void {
        if (!Page.matches(PageDefinition.post)) return;
        $("a#approve-post").first()[0].click()
    }

    private approvePostPrev(): void {
        if (!Page.matches(PageDefinition.post)) return;
        $("a#approve-post-prev").first()[0].click()
    }

    private approvePostNext(): void {
        if (!Page.matches(PageDefinition.post)) return;
        $("a#approve-post-next").first()[0].click()
    }

    private enhanceDeletionpage(): void {
        const postElements = $("#c-confirm-delete article");
        if (postElements.length != 2) return;

        const deleted = PostData.fromThumbnail(postElements.first()),
            inheritor = PostData.fromThumbnail(postElements.last());

        const portedTags = new Set(Array.from(deleted.tags.all).filter(item => !inheritor.tags.all.has(item)));

        const container = $("<div>")
            .addClass("deletion-diff")
            .css("display", "none")
            .appendTo(".post_delete_options .input");
        if (portedTags.size == 0)
            $("<span><i>none</i></span>").appendTo(container);
        else
            for (const tag of portedTags)
                $("<span>").html(`<a href="/show_or_new?title=${tag}">${tag}</a> `).appendTo(container);

        const toggle = $("#copy_tags");
        if (toggle.is(":checked")) container.css("display", "");
        toggle.on("click", () => {
            if (toggle.is(":checked")) container.css("display", "");
            else container.css("display", "none");
        });
    }

}
