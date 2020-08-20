import { XM } from "../../components/api/XM";
import { PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Renames the files to a user-readable scheme for download
 */
export class DownloadCustomizer extends RE6Module {

    private post: Post;
    private link: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.post, true);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "%postid%-%artist%-%copyright%-%character%",
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        this.post = Post.getViewingPost();

        this.link = $("#image-download-link a").first();
        this.refreshDownloadLink();

        this.link.click(event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.link.attr("loading", "true");
            XM.Connect.download({
                url: this.link.attr("href"),
                name: this.link.attr("download"),
                onload: () => { this.link.removeAttr("loading"); }
            });
        });
    }

    /**
     * Creates a download link with the saved template
     */
    public refreshDownloadLink(): void {
        this.link.attr("download", this.parseTemplate());
    }

    /**
     * Parses the download link template, replacing variables with their corresponding values
     * @returns string Download link
     */
    private parseTemplate(): string {
        return this.fetchSettings("template")
            .replace(/%postid%/g, this.post.id)
            .replace(/%artist%/g, tagSetToString(this.post.tags.real_artist))
            .replace(/%copyright%/g, tagSetToString(this.post.tags.copyright))
            .replace(/%species%/g, tagSetToString(this.post.tags.species))
            .replace(/%character%/g, tagSetToString(this.post.tags.character))
            .replace(/%meta%/g, tagSetToString(this.post.tags.meta))
            .replace(/%md5%/g, this.post.file.md5)
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + this.post.file.ext;

        function tagSetToString(tags: Set<string>): string {
            return [...tags].join("-");
        }
    }

}
