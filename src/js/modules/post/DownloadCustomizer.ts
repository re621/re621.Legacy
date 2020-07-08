import { XM } from "../../components/api/XM";
import { PageDefintion } from "../../components/data/Page";
import { Post, ViewingPost } from "../../components/data/Post";
import { TagTypes } from "../../components/data/Tag";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Renames the files to a user-readable scheme for download
 */
export class DownloadCustomizer extends RE6Module {

    private post: ViewingPost;
    private link: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.post);
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

        this.link = $("div#image-download-link a");
        this.refreshDownloadLink();

        this.link.click(event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            XM.Connect.download(this.link.attr("href"), this.link.attr("download"));
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
            .replace(/%postid%/g, this.post.getId())
            .replace(/%artist%/g, this.post.getTagsFromType(TagTypes.Artist).join("-"))
            .replace(/%copyright%/g, this.post.getTagsFromType(TagTypes.Copyright).join("-"))
            .replace(/%character%/g, this.post.getTagsFromType(TagTypes.Character).join("-"))
            .replace(/%species%/g, this.post.getTagsFromType(TagTypes.Species).join("-"))
            .replace(/%meta%/g, this.post.getTagsFromType(TagTypes.Meta).join("-"))
            .replace(/%md5%/g, this.post.getMD5())
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + this.post.getFileExtension();
    }

}
