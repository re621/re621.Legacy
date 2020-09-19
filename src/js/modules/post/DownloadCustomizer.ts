import { XM } from "../../components/api/XM";
import { PageDefinition } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { PostParts } from "../../components/post/PostParts";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Renames the files to a user-readable scheme for download
 */
export class DownloadCustomizer extends RE6Module {

    private post: Post;

    public constructor() {
        super(PageDefinition.post, true);
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

        const downloadContainer = $("<div>")
            .attr("id", "image-custom-download-links")
            .appendTo("#image-extra-controls")

        const link = $("<a>")
            .attr({
                id: "image-custom-download-file",
                href: this.post.file.original,
                download: this.parseTemplate(),
            })
            .html("Download")
            .addClass("button btn-neutral")
            .appendTo(downloadContainer)
            .on("click", (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                link.attr("loading", "true");
                XM.Connect.download({
                    url: link.attr("href"),
                    name: link.attr("download"),
                    onload: () => { link.removeAttr("loading"); }
                });
            });

        const tags = $("<a>")
            .attr({
                id: "image-custom-download-tags",
                href: this.getTagsBlock(),
                download: this.parseTemplate("txt"),
            })
            .html("Tags")
            .addClass("button btn-neutral")
            .appendTo(downloadContainer)
            .on("click", () => {
                tags.attr("loading", "true");

                tags.attr({
                    loading: "false",
                    href: this.getTagsBlock(),
                });
            });
    }

    /** Creates a download link with the saved template */
    public refreshDownloadLink(): void {
        $("#image-custom-download-file").attr("download", this.parseTemplate());
    }

    private getTagsBlock(): string {
        return URL.createObjectURL(new Blob(
            [PostParts.formatHoverText(this.post)],
            { type: 'text/plain' }
        ));
    }

    /**
     * Parses the download link template, replacing variables with their corresponding values
     * @returns string Download link
     */
    private parseTemplate(ext?: string): string {
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
            + "." + (ext ? ext : this.post.file.ext);

        function tagSetToString(tags: Set<string>): string {
            return [...tags].join("-");
        }
    }

}
