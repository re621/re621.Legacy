import { RE6Module } from "../../components/RE6Module";
import { Post, ViewingPost } from "../../components/data/Post";
import { TagTypes } from "../../components/data/Tag";
import { PageDefintion } from "../../components/data/Page";

declare var GM_download;

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

    public init() {
        if (!this.shouldCallInitFunction()) {
            return;
        }
        super.init();

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
     * Returns a singleton instance of the class
     * @returns DownloadCustomizer instance
     */
    public static getInstance() {
        if (this.instance === undefined) {
            this.instance = new DownloadCustomizer();
            this.instance.init();
        }
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        let def_settings = {
            template: "%postid%-%artist%-%copyright%-%character%",
        };
        return def_settings;
    }

    /**
     * Creates a download link with the saved template
     */
    public refreshDownloadLink() {
        this.link.attr("download", this.parseTemplate());
    }

    /**
     * Parses the download link template, replacing variables with their corresponding values
     * @returns string Download link
     */
    private parseTemplate() {
        return this.fetchSettings("template")
            .replace(/%postid%/g, this.post.getId())
            .replace(/%artist%/g, this.post.getTagsFromType(TagTypes.Artist).join("-"))
            .replace(/%copyright%/g, this.post.getTagsFromType(TagTypes.Copyright).join("-"))
            .replace(/%character%/g, this.post.getTagsFromType(TagTypes.Character).join("-"))
            .replace(/-{2,}|-$/g, "")
            + "." + this.post.getFileExtension();
    }

}
