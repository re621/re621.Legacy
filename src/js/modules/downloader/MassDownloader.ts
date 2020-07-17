import { DownloadQueue } from "../../components/api/DownloadQueue";
import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { InfiniteScroll } from "../search/InfiniteScroll";
import { ThumbnailEnhancer } from "../search/ThumbnailsEnhancer";

declare const saveAs;

export class MassDownloader extends RE6Module {

    // Requesting multiple post ID from the API is limited to a specific number.
    // What that number is... nobody knows. It is currently presumed to be ~100.
    private static chunkSize = 100;

    // Maximum Blob size. This value differs depending on the browser.
    // Different sources cite different numbers. For now, we'll go with 800MB.
    private static maxBlobSize = 1024 * 1024 * 800;

    private showInterface = false;
    private processing = false;

    private downloadOverSize = false;
    private batchOverSize = true;

    // Value used to make downloaded file names unique
    private fileTimestamp: string = Util.getDatetimeShort();
    private downloadIndex = 1;

    // Interface elements
    private container: JQuery<HTMLElement>;

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
            fixedSection: true,
        };
    }

    /** Creates the module's structure. */
    public create(): void {
        super.create();

        this.section = $("<section>")
            .attr("id", "downloader-box")
            .attr("data-fixed", this.fetchSettings("fixedSection") + "")
            .appendTo("aside#sidebar");
        $("<h1>").html("Download").appendTo(this.section);

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


        this.container = $("div#posts-container")
            .selectable({
                autoRefresh: false,
                filter: "article.post-preview",
                selected: function (event, ui) {
                    $(ui.selected)
                        .toggleClass("download-item")
                        .attr("data-state", "ready");
                }
            });

        InfiniteScroll.on("pageLoad.MassDownloader", () => {
            this.container.selectable("refresh");
        });
    }

    public destroy(): void {
        super.destroy();
        InfiniteScroll.off("pageLoad.MassDownloader");
    }

    /**
     * Toggles the downloader interface.  
     * Enabling the interface should also disable thumbnail enhancements,
     * as well as anything else that might interfere with the file selection.
     */
    private toggleInterface(): void {
        this.showInterface = !this.showInterface;
        ThumbnailEnhancer.trigger("pauseHoverActions", this.showInterface);

        if (this.showInterface) {
            this.selectButton.html("Cancel");
            this.section.attr("data-interface", "true");

            this.infoText.html(`Click on thumbnails to select them, then press "Download"`);

            this.container
                .attr("data-downloading", "true")
                .selectable("refresh")
                .selectable("enable");
        } else {
            this.selectButton.html("Select");
            this.section.attr("data-interface", "false");

            this.container
                .attr("data-downloading", "false")
                .selectable("disable");
        }
    }

    /**
     * Toggles the fixed state of the interface section
     */
    public toggleFixedSection(): void {
        if (this.section.attr("data-fixed") === "true") this.section.attr("data-fixed", "false");
        else this.section.attr("data-fixed", "true")
    }

    /** Processes and downloads the selected files. */
    private processFiles(): void {
        if (this.processing) return;
        this.processing = true;
        this.actButton.attr("disabled", "disabled");

        InfiniteScroll.trigger("pauseScroll", true);

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing selected files . . .`);

        // Get the IDs of all selected images
        const imageList: number[] = [];
        $("article.post-preview.download-item[data-state=ready]").each((index, element) => {
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
            .html("Fetching API data . . .");

        const dataQueue: Promise<APIPost[]>[] = [];
        const resultPages = Util.chunkArray(imageList, MassDownloader.chunkSize);
        this.infoFile.html(" &nbsp; &nbsp;request 1 / " + resultPages.length);

        resultPages.forEach((value, index) => {
            dataQueue.push(new Promise(async (resolve) => {
                const result = await E621.Posts.get<APIPost>({ tags: "id:" + value.join(",") });
                this.infoFile.html(" &nbsp; &nbsp;request " + (index + 1) + " / " + resultPages.length);
                resolve(result);
            }));
        });

        // Fetch the post data from the API
        Promise.all(dataQueue.reverse()).then((dataChunks) => {
            // dataQueue needs to be reversed in order to start from top to bottom
            // downloadQueue will not use the exact order, but it's an improvement
            const downloadQueue = new DownloadQueue();

            // Create an interface to output queue status
            const threadInfo: JQuery<HTMLElement>[] = [];
            this.infoFile.html("");
            for (let i = 0; i < downloadQueue.getThreadCount(); i++) {
                threadInfo.push($("<span>").appendTo(this.infoFile));
            }

            let totalFileSize = 0,
                queueSize = 0;
            this.batchOverSize = false;

            // Add post data from the chunks to the queue
            dataChunks.forEach((chunk) => {

                if (this.batchOverSize) return;

                chunk.forEach((post: APIPost) => {
                    totalFileSize += post.file.size;
                    if (totalFileSize > MassDownloader.maxBlobSize) {
                        this.batchOverSize = true;
                        this.downloadOverSize = true;
                        return;
                    }

                    $("article.post-preview#post_" + post.id).attr("data-state", "preparing");
                    downloadQueue.add(
                        {
                            name: this.createFilename(post),
                            path: post.file.url,

                            file: post.file.url.replace(/^https:\/\/static1\.e621\.net\/data\/..\/..\//g, ""),

                            unid: post.id,

                            // Yes, updated_at can be null sometimes. No, I don't know why or how.
                            date: post.updated_at === null ? new Date(post.created_at) : new Date(post.updated_at),
                            tags: post.tags.general.join(" "),
                        },
                        {
                            onStart: (item, thread, index) => {
                                this.infoText.html(`Downloading ... <span class="float-right">` + (queueSize - index) + ` / ` + queueSize + `</span>`);
                                threadInfo[thread]
                                    .html(item.file)
                                    .css("--progress", "0%");
                                $("article.post-preview#post_" + post.id).attr("data-state", "loading");
                            },
                            onFinish: () => {
                                $("article.post-preview#post_" + post.id).attr("data-state", "done");
                            },
                            onError: () => {
                                $("article.post-preview#post_" + post.id).attr("data-state", "error");
                            },
                            onLoadProgress: (item, thread, event) => {
                                if (event.lengthComputable) {
                                    threadInfo[thread].css("--progress", Math.round(event.loaded / event.total * 100) + "%");
                                }
                            },
                            onWorkerFinish: (item, thread) => {
                                threadInfo[thread].remove();
                            },
                        }
                    );
                });
            });

            queueSize = downloadQueue.getQueueLength();

            // Begin processing the queue
            this.infoText.html(`Processing . . . `);

            return downloadQueue.run((metadata) => {
                this.infoText.html(`Compressing . . . ` + metadata.percent.toFixed(2) + `%`);
                if (metadata.currentFile) { this.infoFile.html(metadata.currentFile); }
                else { this.infoFile.html(""); }
            });
        }).then((zipData) => {
            let filename = "e621-" + this.fileTimestamp;
            filename += this.downloadOverSize ? "-part" + this.downloadIndex + ".zip" : ".zip";

            this.infoText
                .attr("data-state", "done")
                .html(`Done! `);
            this.infoFile.html("");

            // Download the resulting ZIP
            const $downloadLink = $("<a>")
                .attr("href", filename)
                .html("Download Archive")
                .appendTo(this.infoText)
                .on("click", (event) => {
                    event.preventDefault();
                    saveAs(zipData, filename);
                });

            if (this.fetchSettings("autoDownloadArchive")) { $downloadLink.get(0).click(); }

            this.downloadIndex++;

            this.actButton.removeAttr("disabled");
            this.processing = false;

            if (this.batchOverSize) {
                // Start the next download immediately
                if (this.fetchSettings("autoDownloadArchive")) { this.actButton.get(0).click(); }
                else {
                    $("<div>")
                        .addClass("download-notice")
                        .html(`Download has exceeded the maximum file size.<br /><br />Click the download button again for the next part.`)
                        .appendTo(this.infoText);
                }
            } else {
                InfiniteScroll.trigger("pauseScroll", false);
            }
        });
    }

    /**
     * Creates a filename from the post data based on the current template
     * @param data Post data
     */
    private createFilename(data: APIPost): string {
        return MassDownloader.createFilenameBase(this.fetchSettings<string>("template"), data)
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + data.file.ext;
    }

    public static createFilenameBase(template: string, data: APIPost): string {
        return template
            .replace(/%postid%/g, data.id + "")
            .replace(/%artist%/g, data.tags.artist.join("-"))
            .replace(/%copyright%/g, data.tags.copyright.join("-"))
            .replace(/%character%/g, data.tags.character.join("-"))
            .replace(/%species%/g, data.tags.species.join("-"))
            .replace(/%meta%/g, data.tags.meta.join("-"))
            .replace(/%md5%/g, data.file.md5);
    }

}
