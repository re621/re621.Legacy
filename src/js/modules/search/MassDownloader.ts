import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { ThumbnailEnhancer } from "./ThumbnailsEnhancer";
import { Util } from "../../components/structure/Util";
import { Api } from "../../components/api/Api";
import { ApiPost } from "../../components/api/responses/ApiPost";
import { DownloadQueue } from "../../components/api/DownloadQueue";

declare const JSZip, saveAs;

export class MassDownloader extends RE6Module {

    private static chunkSize = 40;

    private showInterface = false;

    private section: JQuery<HTMLElement>;
    private selectButton: JQuery<HTMLElement>;
    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

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
        this.section = $("<section>")
            .attr("id", "downloader-box")
            .appendTo("aside#sidebar");
        $("<h1>").html("Mass Downloader").appendTo(this.section);

        this.selectButton = $("<a>")
            .html("Select")
            .attr("id", "download-select")
            .addClass("button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.toggleState();
            });

        this.actButton = $("<a>")
            .html("Download")
            .attr("id", "download-act")
            .addClass("button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.infoText.html(`<i class="fas fa-spinner fa-spin"></i> Processing . . .`);

                // Get the IDs of all the downloaded images
                const imageList: number[] = [];
                $("article.post-preview.download-item").each((index, element) => {
                    imageList.push(parseInt($(element).attr("data-id")));
                });

                if (imageList.length === 0) {
                    this.infoText
                        .attr("data-state", "error")
                        .html(`Error: No files selected!`);
                    return;
                }

                // Fetch the post data from the API
                const dataQueue = [];
                const requests = Util.chunkArray(imageList, MassDownloader.chunkSize);
                requests.forEach((value) => {
                    dataQueue.push(Api.getJson("/posts.json?tags=id:" + value.join(",")));
                });

                Promise.all(dataQueue).then((dataChunks) => {
                    // 1. Get post data from the API
                    this.infoText
                        .attr("data-state", "loading")
                        .html(`Downloading images . . .`);
                    const downloadQueue = new DownloadQueue();

                    //    Queue up the file downloads
                    dataChunks.forEach((chunk) => {
                        chunk.posts.forEach((post: ApiPost) => {
                            downloadQueue.add(
                                {
                                    name: this.parseTemplate(post),
                                    path: post.file.url,
                                    date: new Date(post.updated_at),
                                    tags: post.tags.general.join(" "),
                                },
                                (url: string) => {
                                    this.infoText.html(`Processing . . . `);
                                    this.infoFile.html(url.replace("https://static1.e621.net/data/", ""));
                                }
                            );
                        });
                    });

                    this.infoText.html(`Processing . . . `);

                    return downloadQueue.process((metadata) => {
                        this.infoText.html(`Compressing . . . ` + metadata.percent.toFixed(2) + `%`);
                        if (metadata.currentFile) { this.infoFile.html(metadata.currentFile); }
                        else { this.infoFile.html(""); }
                    });
                }).then((zipData) => {
                    this.infoText
                        .attr("data-state", "done")
                        .html(`Done! `);
                    this.infoFile.html("");

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
            .addClass("download-info")
            .html("")
            .appendTo(this.section);

        this.infoFile = $("<div>")
            .addClass("download-file")
            .html("")
            .appendTo(this.section);
    }

    private toggleState(): void {
        this.showInterface = !this.showInterface;
        ModuleController.getWithType<ThumbnailEnhancer>(ThumbnailEnhancer).hideHoverZoom(this.showInterface);
        this.listenForClicks(this.showInterface);

        if (this.showInterface) {
            this.selectButton.html("Cancel");
            this.section.attr("data-interface", "true");
        } else {
            this.selectButton.html("Select");
            this.section.attr("data-interface", "false");
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
