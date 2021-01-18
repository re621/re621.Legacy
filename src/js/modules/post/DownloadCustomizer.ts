import { XM } from "../../components/api/XM";
import { PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
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
        this.registerHotkeys(
            { keys: "hotkeyDownload", fnct: this.hotkeyDownload },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "%postid%-%artist%-%copyright%-%character%",
            hotkeyDownload: "",
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

    private hotkeyDownload(): void {
        $("#image-custom-download-file").click();
    }

    /**
     * Parses the download link template, replacing variables with their corresponding values
     * @returns string Download link
     */
    private parseTemplate(ext?: string): string {
        return DownloadCustomizer.getFileName(this.post, this.fetchSettings("template"), ext);
    }

    /**
     * Parses the download link template, replacing variables with their corresponding values
     * @returns string Download link
     */
    public static getFileName(post: Post, template?: string, ext?: string): string {
        if (!template) template = ModuleController.fetchSettings<string>(DownloadCustomizer, "template");
        return template
            .replace(/%postid%/g, post.id + "")
            .replace(/%artist%/g, tagSetToString(post.tags.real_artist))
            .replace(/%copyright%/g, tagSetToString(post.tags.copyright))
            .replace(/%species%/g, tagSetToString(post.tags.species))
            .replace(/%character%/g, tagSetToString(post.tags.character))
            .replace(/%meta%/g, tagSetToString(post.tags.meta))
            .replace(/%md5%/g, post.file.md5)
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + (ext ? ext : post.file.ext);

        function tagSetToString(tags: Set<string>): string {
            return [...tags].join("-");
        }
    }

}
