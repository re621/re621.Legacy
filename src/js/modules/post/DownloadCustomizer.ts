import { XM } from "../../components/api/XM";
import { PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post, PostData } from "../../components/post/Post";
import { PostParts } from "../../components/post/PostParts";
import { RE6Module, Settings } from "../../components/RE6Module";
import { MassDownloader } from "../downloader/MassDownloader";

/**
 * Renames the files to a user-readable scheme for download
 */
export class DownloadCustomizer extends RE6Module {

  private post: Post;

  public constructor () {
    super(PageDefinition.post, true);
    this.registerHotkeys(
      { keys: "hotkeyDownload", fnct: this.hotkeyDownload },
    );
  }

  /**
   * Returns a set of default settings values
   * @returns Default settings
   */
  protected getDefaultSettings (): Settings {
    return {
      enabled: true,
      template: "%postid%-%artist%-%copyright%-%character%-%species%",
      confirmDownload: false,
      downloadSamples: false,
      hotkeyDownload: "",
    };
  }

  /**
   * Creates the module's structure.
   * Should be run immediately after the constructor finishes.
   */
  public create (): void {
    super.create();

    this.post = Post.getViewingPost();

    const downloadContainer = $(".ptbr-etc-menu");

    downloadContainer.find(".ptbr-etc-download").hide();

    const link = $("<a>")
      .attr({
        id: "image-custom-download-file",
        href: this.fetchSettings<boolean>("downloadSamples") ? this.post.file.sample : this.post.file.original,
        download: this.parseTemplate(),
      })
      .html("Download")
      .addClass("st-button kinetic")
      .appendTo(downloadContainer)
      .on("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        link.attr("loading", "true");
        XM.Connect.browserDownload({
          url: this.fetchSettings<boolean>("downloadSamples") ? this.post.file.sample : this.post.file.original,
          name: link.attr("download"),
          saveAs: this.fetchSettings<boolean>("confirmDownload"),
          onload: () => { link.removeAttr("loading"); },
        });
      });

    const tags = $("<a>")
      .attr({
        id: "image-custom-download-tags",
        href: this.getTagsBlock(),
        download: this.parseTemplate("txt"),
      })
      .html("Tags")
      .addClass("st-button kinetic")
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
  public refreshDownloadLink (): void {
    $("#image-custom-download-file").attr({
      href: this.fetchSettings<boolean>("downloadSamples") ? this.post.file.sample : this.post.file.original,
      download: this.parseTemplate(),
    });
  }

  private getTagsBlock (): string {
    return URL.createObjectURL(new Blob(
      [PostParts.formatHoverText(this.post)],
      { type: "text/plain" },
    ));
  }

  private hotkeyDownload (): void {
    $("#image-custom-download-file")[0].click();
  }

  /**
   * Parses the download link template, replacing variables with their corresponding values
   * @returns string Download link
   */
  private parseTemplate (ext?: string): string {
    return DownloadCustomizer.getFileName(this.post, this.fetchSettings("template"), ext);
  }

  /**
   * Parses the download link template, replacing variables with their corresponding values
   * @returns string Download link
   */
  public static getFileName (post: PostData, template?: string, ext?: string): string {
    if (!template) template = ModuleController.fetchSettings<string>(DownloadCustomizer, "template");

    // No, I don't know why some modules use this method instead of going straight to MassDownloader

    return MassDownloader.createFilenameBase(template, post)
      .slice(0, 128)
      .replace(/-{2,}/g, "-")
      .replace(/-*$/g, "")
            + "." + (ext ? ext : post.file.ext);
  }

}
