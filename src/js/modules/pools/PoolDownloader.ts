import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion, Page } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { ApiPool } from "../../components/api/responses/ApiPool";
import { Util } from "../../components/structure/Util";
import { DownloadQueue } from "../../components/api/DownloadQueue";
import { ApiPost } from "../../components/api/responses/ApiPost";

declare const saveAs;

export class PoolDownloader extends RE6Module {

    // Requesting multiple post ID from the API is limited to a specific number.
    // What that number is... nobody knows. It is currently presumed to be ~100.
    private static chunkSize = 100;

    // Maximum Blob size. This value differs depending on the browser.
    // Different sources cite different numbers. For now, we'll go with 800MB.
    private static maxBlobSize = 1024 * 1024 * 800;

    private processing = false;

    private downloadOverSize = false;
    private batchOverSize = true;

    // Value used to make downloaded file names unique
    private fileTimestamp: string = Util.getDatetimeShort();

    // If there are several batches in the download, a number will be appended to the end
    private downloadIndex = 1;

    // Pool-specific variables used in the templating system
    private poolName = "";
    private poolFiles: number[] = [];
    private poolDownloaded: number[] = [];

    // Interface elements
    private section: JQuery<HTMLElement>;

    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.pool);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "%pool%/%index%-%postid%-%artist%-%copyright%-%character%-%species%",
            autoDownloadArchive: true,
        };
    }

    /** Creates the module's structure. */
    public create(): void {
        if (!this.canInitialize()) return;
        super.create();

        const container = $("div#c-pools")
            .addClass("pool-container");
        const overview = $("div#a-show")
            .addClass("pool-overview");

        // Toggle Button
        this.actButton = $("<button>")
            .addClass("pool-download-button")
            .addClass("button btn-neutral")
            .html("Download")
            .prependTo(overview)
            .on("click", (event) => {
                event.preventDefault();
                container.attr("data-interface", "true");
                this.processFiles();
            });

        // Sidebar
        const sidebar = $("<aside>")
            .addClass("pool-sidebar")
            .appendTo(container);

        this.section = $("<section>")
            .attr("id", "pool-downloader-box")
            .appendTo(sidebar);
        $("<h1>").html("Pool Downloader").appendTo(this.section);

        // Processes selected files

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

    /** Processes and downloads the selected files. */
    private processFiles(): void {
        if (this.processing) return;
        this.processing = true;
        this.actButton.attr("disabled", "disabled");

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing pool files . . .`);

        // Get the IDs of all selected images

        Api.getJson("/pools.json?search[id]=" + Page.getPageID()).then((poolData: ApiPool[]) => {
            if (poolData.length < 1) { return Promise.reject("Pool not found"); };
            const pool = poolData[0],
                imageList = pool.post_ids.filter(n => !this.poolDownloaded.includes(n));
            this.poolFiles = pool.post_ids;

            // Get the IDs of all pool images
            if (imageList.length === 0) {
                this.infoText
                    .attr("data-state", "error")
                    .html(`Error: Pool is empty!`);
                return Promise.reject("Pool is empty");
            }

            this.poolName = pool.name;

            // Create API requests, separated into chunks
            this.infoText
                .attr("data-state", "loading")
                .html(`Fetching API data . . .`);

            const dataQueue = [];
            Util.chunkArray(imageList, PoolDownloader.chunkSize).forEach((value) => {
                dataQueue.push(Api.getJson("/posts.json?tags=id:" + value.join(",")));
            });

            return Promise.all(dataQueue);
        }).then((dataChunks) => {
            // dataQueue needs to be reversed in order to start from top to bottom
            // downloadQueue will not use the exact order, but it's an improvement
            const downloadQueue = new DownloadQueue();

            // Create an interface to output queue status
            const threadInfo: JQuery<HTMLElement>[] = [];
            for (let i = 0; i < downloadQueue.getThreadCount(); i++) {
                threadInfo.push($("<span>").appendTo(this.infoFile));
            }

            let totalFileSize = 0,
                queueSize = 0;
            this.batchOverSize = false;

            // Add post data from the chunks to the queue
            dataChunks.forEach((chunk) => {

                if (this.batchOverSize) return;

                chunk.posts.forEach((post: ApiPost) => {
                    totalFileSize += post.file.size;
                    if (totalFileSize > PoolDownloader.maxBlobSize) {
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
                            date: new Date(post.updated_at),
                            tags: post.tags.general.join(" "),
                        },
                        {
                            onStart: (item, thread, index) => {
                                this.infoText.html(`Downloading . . . ` + (queueSize - index) + " / " + queueSize);
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
                            }
                        }
                    );

                    this.poolDownloaded.push(post.id);
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
            let filename = "re621-download-" + this.fileTimestamp;
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
            }
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
            .replace(/%pool%/g, this.poolName)
            .replace(/%index%/g, "" + (this.poolFiles.indexOf(data.id) + 1))
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + data.file.ext;
    }

}
