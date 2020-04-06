import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { ThumbnailEnhancer } from "./ThumbnailsEnhancer";
import { Util } from "../../components/structure/Util";
import { Api } from "../../components/api/Api";
import { ApiPost } from "../../components/api/responses/ApiPost";

declare const JSZip, saveAs;

export class MassDownloader extends RE6Module {

    private static chunkSize = 40;

    private showInterface = false;

    private selectButton: JQuery<HTMLElement>;
    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.search);
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "%artist%/%postid%-%copyright%-%character%-%species%",
            autoDownloadArchive: true,
        };
    }

    public create(): void {

        /* Create Button */
        const $section = $("<section>")
            .attr("id", "downloader-box")
            .appendTo("aside#sidebar");
        $("<h1>").html("Mass Downloader").appendTo($section);

        this.selectButton = $("<a>")
            .html("Select")
            .addClass("button btn-neutral")
            .appendTo($section)
            .on("click", (event) => {
                event.preventDefault();
                this.toggleState();
            });

        this.actButton = $("<a>")
            .html("Download")
            .addClass("button btn-neutral")
            .css("display", "none")
            .appendTo($section)
            .on("click", (event) => {
                event.preventDefault();
                this.infoText.html(`<i class="fas fa-spinner fa-spin"></i> Processing . . .`);

                // Get the IDs of all the downloaded images
                const imageList: number[] = [];
                $("article.post-preview.download-item").each((index, element) => {
                    imageList.push(parseInt($(element).attr("data-id")));
                });

                if (imageList.length === 0) {
                    this.infoText.html(`<i class="far fa-times-circle"></i> Error: No files selected!`);
                    return;
                }

                // Fetch the post data from the API
                const dataQueue = [];
                const requests = Util.chunkArray(imageList, MassDownloader.chunkSize);
                requests.forEach((value) => {
                    dataQueue.push(Api.getJson("/posts.json?tags=id:" + value.join(",")));
                });

                this.infoText.html(`<i class="fas fa-spinner fa-spin"></i> Requesting API data . . .`);

                Promise.all(dataQueue).then((dataChunks) => {
                    // 1. Get post data from the API
                    this.infoText.html(`<i class="fas fa-spinner fa-spin"></i> Downloading images . . .`);
                    const downloadQueue = [];

                    //    Queue up the file downloads
                    dataChunks.forEach((chunk) => {
                        chunk.posts.forEach((post: ApiPost) => {
                            downloadQueue.push(new Promise((resolve) => {
                                resolve({
                                    name: this.parseTemplate(post),
                                    data: Util.getImageBlob(post.file.url),
                                });
                            }));
                        });
                    });

                    return Promise.all(downloadQueue);
                }).then((downloadData) => {
                    // 2. Compress the downloaded files
                    this.infoText.html(`<i class="fas fa-spinner fa-spin"></i> Creating an archive . . . `);

                    const zip = new JSZip();
                    downloadData.forEach((value) => {
                        zip.file(value.name, value.data, { binary: true });
                    });

                    this.infoText.html(`<i class="fas fa-spinner fa-spin"></i> Compressing . . . `);
                    const progress = $("<span>").html("").appendTo(this.infoText);
                    const progressFile = $("<div>").addClass("progress-file").html("").appendTo(this.infoText);

                    return zip.generateAsync({
                        type: "blob",
                        compression: "DEFLATE",
                        compressionOptions: { level: 9 },
                        comment: "Downloaded from e621 on " + new Date().toUTCString(),
                    }, (metadata) => {
                        progress.html(metadata.percent.toFixed(2) + "%");
                        if (metadata.currentFile) { progressFile.html(metadata.currentFile); }
                        else { progressFile.html(""); }
                    });
                }).then((zipData) => {
                    this.infoText.html(`<i class="far fa-check-circle"></i> Done! `);
                    // 3. Download the resulting ZIP
                    const $downloadLink = $("<a>")
                        .html("Download Archive")
                        .appendTo(this.infoText)
                        .on("click", (event) => {
                            event.preventDefault();
                            saveAs(zipData, "re621-download-" + Util.getDatetimeShort() + ".zip");
                        });

                    if (this.fetchSettings("autoDownloadArchive")) { $downloadLink.get(0).click(); }
                });
            });

        this.infoText = $("<div>")
            .attr("id", "download-info")
            .html("")
            .css("display", "none")
            .appendTo($section);
    }

    private toggleState(): void {
        this.showInterface = !this.showInterface;
        ModuleController.getWithType<ThumbnailEnhancer>(ThumbnailEnhancer).hideHoverZoom(this.showInterface);
        this.listenForClicks(this.showInterface);

        if (this.showInterface) {
            this.selectButton.html("Cancel");
            this.actButton.css("display", "");
            this.infoText.css("display", "");
        } else {
            this.selectButton.html("Select");
            this.actButton.css("display", "none");
            this.infoText.css("display", "none");
        }
    }

    private listenForClicks(enabled = true): void {
        if (enabled) {
            $("div#posts-container")
                .attr("data-downloading", "true")
                .on("click.re621.mass-dowloader", "a.preview-box", (event) => {
                    event.preventDefault();
                    $(event.target).parents("article.post-preview").toggleClass("download-item");
                });
        } else {
            $("div#posts-container")
                .attr("data-downloading", "false")
                .off("click.re621.mass-dowloader");
        }
    }

    private parseTemplate(data: ApiPost): string {
        return this.fetchSettings("template")
            .replace(/%postid%/g, data.id)
            .replace(/%artist%/g, data.tags.artist.join("-"))
            .replace(/%copyright%/g, data.tags.copyright.join("-"))
            .replace(/%character%/g, data.tags.character.join("-"))
            .replace(/%species%/g, data.tags.species.join("-"))
            .replace(/%meta%/g, data.tags.meta.join("-"))
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + data.file.ext;
    }

}
