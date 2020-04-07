import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { ThumbnailEnhancer } from "./ThumbnailsEnhancer";
import { Util } from "../../components/structure/Util";
import { Api } from "../../components/api/Api";
import { ApiPost } from "../../components/api/responses/ApiPost";
import { DownloadQueue } from "../../components/api/DownloadQueue";

declare const saveAs;

export class MassDownloader extends RE6Module {

    // Requesting multiple post ID from the API is limited to a specific number.
    // What that number is... nobody knows. It is currently presumed to be ~100.
    private static chunkSize = 100;

    private showInterface = false;
    private processing = false;

    private section: JQuery<HTMLElement>;
    private selectButton: JQuery<HTMLElement>;
    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.search);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "%artist%/%postid%-%copyright%-%character%-%species%",
            autoDownloadArchive: true,
        };
    }

    /** Creates the module's structure. */
    public create(): void {

        this.section = $("<section>")
            .attr("id", "downloader-box")
            .appendTo("aside#sidebar");
        $("<h1>").html("Mass Downloader").appendTo(this.section);

        // Toggles the downloader UI
        this.selectButton = $("<a>")
            .html("Select")
            .attr("id", "download-select")
            .addClass("button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.toggleInterface();
            });

        // Processes selected files
        this.actButton = $("<a>")
            .html("Download")
            .attr("id", "download-act")
            .addClass("button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.processFiles();
            });

        // Contains general info about the download
        this.infoText = $("<div>")
            .addClass("download-info")
            .html("")
            .appendTo(this.section);

        // Contains info about currently downloaded files
        this.infoFile = $("<div>")
            .addClass("download-file")
            .html("")
            .appendTo(this.section);
    }

    /**
     * Toggles the downloader interface.  
     * Enabling the interface should also disable thumbnail enhancements,
     * as well as anything else that might interfere with the file selection.
     */
    private toggleInterface(): void {
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

    /**
     * Toggles the listeners attached to the thumbnails to begin selecting files.
     * @param enabled If true, creates listeners, otherwise removes them.
     */
    private listenForClicks(enabled = true): void {
        if (enabled) {
            $("div#posts-container")
                .attr("data-downloading", "true")
                .on("click.re621.mass-dowloader", "a.preview-box", (event) => {
                    event.preventDefault();
                    $(event.target).parents("article.post-preview")
                        .toggleClass("download-item")
                        .removeAttr("data-state");
                });
        } else {
            $("div#posts-container")
                .attr("data-downloading", "false")
                .off("click.re621.mass-dowloader");
        }
    }

    /** Processes and downloads the selected files. */
    private processFiles(): void {
        if (this.processing) return;
        this.processing = true;
        this.actButton.attr("disabled", "disabled");

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing selected files . . .`);

        // Get the IDs of all selected images
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

        // Create API requests, separated into chunks
        this.infoText
            .attr("data-state", "loading")
            .html(`Fetching API data . . .`);

        const dataQueue = [];
        Util.chunkArray(imageList, MassDownloader.chunkSize).forEach((value) => {
            dataQueue.push(Api.getJson("/posts.json?tags=id:" + value.join(",")));
        });

        // Fetch the post data from the API
        Promise.all(dataQueue.reverse()).then((dataChunks) => {
            // dataQueue needs to be reversed in order to start from top to bottom
            // downloadQueue will not use the exact order, but it's an improvement
            const downloadQueue = new DownloadQueue();

            // Create an interface to output queue status
            const threadInfo: JQuery<HTMLElement>[] = [];
            for (let i = 0; i < downloadQueue.getThreadCount(); i++) {
                threadInfo.push($("<span>").appendTo(this.infoFile));
            }

            // Add post data from the chunks to the queue
            dataChunks.forEach((chunk) => {
                chunk.posts.forEach((post: ApiPost) => {
                    $("article.post-preview#post_" + post.id).attr("data-state", "preparing");
                    downloadQueue.add(
                        {
                            name: this.createFilename(post),
                            path: post.file.url,

                            file: post.file.url.replace(/^https:\/\/static1\.e621\.net\/data\/..\/..\//g, ""),

                            unid: post.id,
                            date: new Date(post.updated_at),
                            tags: post.tags.general.join(" "),
                        },
                        {
                            onStart: (item, thread) => {
                                this.infoText.html(`Processing . . . `);
                                threadInfo[thread].html(item.file);
                                $("article.post-preview#post_" + post.id).attr("data-state", "loading");
                            },
                            onFinish: () => {
                                $("article.post-preview#post_" + post.id).attr("data-state", "done");
                            },
                            onError: () => {
                                $("article.post-preview#post_" + post.id).attr("data-state", "error");
                            }
                        }
                    );
                });
            });

            // Begin processing the queue
            this.infoText.html(`Processing . . . `);

            return downloadQueue.run((metadata) => {
                this.infoText.html(`Compressing . . . ` + metadata.percent.toFixed(2) + `%`);
                if (metadata.currentFile) { this.infoFile.html(metadata.currentFile); }
                else { this.infoFile.html(""); }
            });
        }).then((zipData) => {
            this.infoText
                .attr("data-state", "done")
                .html(`Done! `);
            this.infoFile.html("");

            // Download the resulting ZIP
            const $downloadLink = $("<a>")
                .attr("href", "#re621-download.zip")
                .html("Download Archive")
                .appendTo(this.infoText)
                .on("click", (event) => {
                    event.preventDefault();
                    saveAs(zipData, "re621-download-" + Util.getDatetimeShort() + ".zip");
                });

            if (this.fetchSettings("autoDownloadArchive")) { $downloadLink.get(0).click(); }

            this.actButton.removeAttr("disabled");
            this.processing = false;
        });
    }

    /**
     * Creates a filename from the post data based on the current template
     * @param data Post data
     */
    private createFilename(data: ApiPost): string {
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
