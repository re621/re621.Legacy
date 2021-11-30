import { Page, PageDefinition } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

export class JanitorEnhancements extends RE6Module {

    public constructor() {
        super([], true);
        this.registerHotkeys(
            { keys: "hotkeyApprovePost", fnct: this.approvePost },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyApprovePost: "",
        }
    }

    public create(): void {

        if (Page.matches(PageDefinition.post)) {
            this.cleanupRecords();
            this.decorateArtistName();
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
        $("a.approve-post-link").first()[0].click()
    }

}
