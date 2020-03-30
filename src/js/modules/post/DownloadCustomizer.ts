import { RE6Module, Settings } from "../../components/RE6Module";
import { Post, ViewingPost } from "../../components/data/Post";
import { TagTypes } from "../../components/data/Tag";
import { PageDefintion } from "../../components/data/Page";

// eslint-disable-next-line @typescript-eslint/camelcase
declare const GM_download;

/**
 * Renames the files to a user-readable scheme for download
 */
export class DownloadCustomizer extends RE6Module {

    private static instance: DownloadCustomizer;

    private post: ViewingPost;
    private link: JQuery<HTMLElement>;

    private constructor() {
        super(PageDefintion.post);
    }

    /**
     * Returns a singleton instance of the class
     * @returns DownloadCustomizer instance
     */
    public static getInstance(): DownloadCustomizer {
        if (this.instance == undefined) this.instance = new DownloadCustomizer();
        return this.instance;
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
        if (!this.canInitialize()) return;
        super.create();

        this.post = Post.getViewingPost();

        this.link = $("div#image-download-link a");
        this.refreshDownloadLink();

        this.link.click(event => {
            event.preventDefault();
            GM_download({
                url: this.link.attr("href"),
                name: this.link.attr("download"),
                saveAs: true,
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
            .replace(/%postid%/g, this.post.getId())
            .replace(/%artist%/g, this.post.getTagsFromType(TagTypes.Artist).join("-"))
            .replace(/%copyright%/g, this.post.getTagsFromType(TagTypes.Copyright).join("-"))
            .replace(/%character%/g, this.post.getTagsFromType(TagTypes.Character).join("-"))
            .replace(/-{2,}|-$/g, "")
            + "." + this.post.getFileExtension();
    }

}
