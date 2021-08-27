import { DownloadQueue } from "../../components/api/DownloadQueue";
import { E621 } from "../../components/api/E621";
import { APIPool } from "../../components/api/responses/APIPool";
import { APIPost } from "../../components/api/responses/APIPost";
import { APIPostGroup } from "../../components/api/responses/APIPostGroup";
import { Page, PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { MassDownloader } from "./MassDownloader";

export class PoolDownloader extends RE6Module {

    // Maximum Blob size. This value differs depending on the browser.
    // Different sources cite different numbers. For now, we'll go with 800MB.
    private static maxBlobSize = 1024 * 1024 * 800;

    private processing = false;

    private downloadOverSize = false;
    private batchOverSize = true;

    // Download queue instance
    private downloadQueue: DownloadQueue;

    // Value used to make downloaded file names unique
    private fileTimestamp: string = Util.Time.getDatetimeShort();

    // If there are several batches in the download, a number will be appended to the end
    private downloadIndex = 1;

    // Pool-specific variables used in the template system
    private poolName = "";
    private poolFiles: number[] = [];
    private poolDownloaded: number[] = [];

    // Interface elements
    private overview: JQuery<HTMLElement>;
    private section: JQuery<HTMLElement>;

    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefinition.pool, PageDefinition.set]);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "%pool%/%index%-%postid%-%artist%-%copyright%-%character%-%species%",
            archive: "%poolname%-%timestamp%",
            autoDownloadArchive: true,
        };
    }

    /** Creates the module's structure. */
    public create(): void {
        super.create();

        const base = Page.matches(PageDefinition.pool) ? "div#c-pools" : "div#c-sets";

        const container = $(base)
            .addClass("pool-container");
        this.overview = $("#a-show")
            .addClass("pool-overview");

        // Toggle Button
        this.actButton = $("<button>")
            .addClass("pool-download-button pool-download-act")
            .addClass("button btn-neutral")
            .html("Download")
            .prependTo(this.overview)
            .on("click", (event) => {
                event.preventDefault();
                container.attr("data-interface", "true");
                this.processFiles();
            });

        $("<button>")   // Cancel
            .addClass("pool-download-button pool-download-cancel")
            .addClass("button btn-neutral")
            .html("Abort")
            .prependTo(this.overview)
            .on("click", (event) => {
                event.preventDefault();
                if (this.downloadQueue)
                    this.downloadQueue.abort();
            });

        $("<button>")   // Cancel and Save
            .addClass("pool-download-button pool-download-cancel")
            .addClass("button btn-neutral")
            .html("Save & Cancel")
            .prependTo(this.overview)
            .on("click", (event) => {
                event.preventDefault();
                if (this.downloadQueue)
                    this.downloadQueue.abort(true);
            });

        // Sidebar
        const sidebar = $("<aside>")
            .addClass("pool-sidebar")
            .appendTo(container);

        this.section = $("<section>")
            .attr("id", "pool-downloader-box")
            .html("<h1>Download</h1>")
            .appendTo(sidebar);

        // Contains general info about the download
        this.infoText = $("<div>")
            .addClass("download-info")
            .appendTo(this.section);

        // Contains info about currently downloaded files
        this.infoFile = $("<div>")
            .addClass("download-file")
            .appendTo(this.section);
    }

    /** Processes and downloads the selected files. */
    private processFiles(): void {
        if (this.processing) return;
        this.processing = true;
        this.overview.attr("processing", "loading");

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing pool files . . .`);

        // Get the IDs of all selected images

        let source: Promise<APIPostGroup[]>;
        let poolName = "UnknownPostGroup";

        if (Page.matches(PageDefinition.pool)) source = E621.Pools.get<APIPool>({ "search[id]": Page.getPageID() });
        else source = E621.Sets.get<APIPool>({ "search[id]": Page.getPageID() });

        source.then((poolData) => {
            if (poolData.length < 1) { return Promise.reject("Pool not found"); };
            const pool = poolData[0],
                imageList = pool.post_ids.filter(n => !this.poolDownloaded.includes(n));
            this.poolFiles = pool.post_ids;
            poolName = pool.name;

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
                .html("Fetching API data . . .");

            const dataQueue: Promise<APIPost[]>[] = [];
            const resultPages = Math.ceil(imageList.length / 320);
            this.infoFile.html(" &nbsp; &nbsp;request 1 / " + resultPages);

            for (let i = 1; i <= resultPages; i++) {
                dataQueue.push(new Promise(async (resolve) => {
                    const result = await E621.Posts.get<APIPost>({ tags: (Page.matches(PageDefinition.pool) ? "pool:" : "set:") + pool.id, page: i, limit: 320 }, 500);
                    this.infoFile.html(" &nbsp; &nbsp;request " + (i + 1) + " / " + resultPages);
                    resolve(result);
                }));
            }

            return Promise.all(dataQueue);
        }).then((dataChunks) => {

            // Show cancel buttons
            this.overview.attr("processing", "true");

            // dataQueue needs to be reversed in order to start from top to bottom
            // downloadQueue will not use the exact order, but it's an improvement
            this.downloadQueue = new DownloadQueue();

            // Create an interface to output queue status
            const threadInfo: JQuery<HTMLElement>[] = [];
            this.infoFile.html("");
            for (let i = 0; i < this.downloadQueue.getThreadCount(); i++) {
                threadInfo.push($("<span>").appendTo(this.infoFile));
            }

            let totalFileSize = 0,
                queueSize = 0;
            this.batchOverSize = false;

            // Fetch DownloadCustomizer settings
            const downloadSamples = ModuleController.fetchSettings<boolean>(DownloadCustomizer, "downloadSamples");

            // Add post data from the chunks to the queue
            dataChunks.forEach((chunk) => {

                if (this.batchOverSize) return;

                chunk.forEach((queuedPost: APIPost) => {

                    const post = PostData.fromAPI(queuedPost);

                    // Skip deleted files
                    if (!post.has.file) return;

                    // Determine queue size
                    totalFileSize += post.file.size;
                    Debug.log(`adding #${post.id} (${Util.Size.format(post.file.size)}) to the queue: ${Util.Size.format(totalFileSize)} total`)
                    if (totalFileSize > PoolDownloader.maxBlobSize) {
                        this.batchOverSize = true;
                        this.downloadOverSize = true;
                        return;
                    }

                    $("article.post-preview#post_" + post.id).attr("data-state", "preparing");
                    this.downloadQueue.add(
                        {
                            name: this.createFilename(post, downloadSamples),
                            path: downloadSamples ? post.file.sample : post.file.original,
                            file: (downloadSamples ? post.file.sample : post.file.original).match(/.{32}\..*$/g)[0],
                            unid: post.id,
                            date: post.date.obj,
                            tags: post.tagString,
                        },
                        {
                            onStart: (item, thread, index) => {
                                if (this.infoText.attr("data-state") == "done") return;

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

                    this.poolDownloaded.push(post.id);
                });
            });

            queueSize = this.downloadQueue.getQueueLength();

            // Begin processing the queue
            this.infoText.html(`Processing . . . `);

            return this.downloadQueue.run((metadata) => {
                this.infoText.html(`Compressing . . . ` + metadata.percent.toFixed(2) + `%`);
                if (metadata.currentFile) { this.infoFile.html(metadata.currentFile); }
                else { this.infoFile.html(""); }
            });
        }).then((zipData) => {

            // Clear the queue instance
            delete this.downloadQueue;

            let filename = this.fetchSettings("archive")
                .replace("%poolname%", this.createPoolFilename(poolName))
                .replace("%timestamp%", this.fileTimestamp);
            filename += this.downloadOverSize ? "-part" + this.downloadIndex + ".zip" : ".zip";

            this.infoText
                .attr("data-state", "done")
                .html(zipData ? "Done! " : "Cancelled");
            this.infoFile.html("");

            // Download the resulting ZIP
            if (zipData) {
                const $downloadLink = $("<a>")
                    .attr({
                        "href": zipData ? URL.createObjectURL(zipData) : undefined,
                        "download": filename,
                    })
                    .html("Download Archive")
                    .appendTo(this.infoText);

                if (this.fetchSettings("autoDownloadArchive")) { $downloadLink.get(0).click(); }

                this.downloadIndex++;
            } else {
                this.downloadIndex = 1;
            }

            this.overview.removeAttr("processing");
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
                // Clear the downloads list, in case the module needs to run again
                this.poolDownloaded = [];
            }

        });
    }

    /**
     * Creates a filename from the post data based on the current template
     * @param data Post data
     */
    private createFilename(post: PostData, downloadSamples = false): string {
        return MassDownloader.createFilenameBase(this.fetchSettings<string>("template"), post)
            .replace(/%pool%/g, this.poolName)
            .replace(/%index%/g, this.padIndex(this.poolFiles.indexOf(post.id) + 1, this.poolFiles.length.toString().length))
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "."
            + ((downloadSamples && post.has.sample) ? "jpg" : post.file.ext);
    }

    /**
     * Pads the index to make the files sort better
     * @param index The index to be padded
     * @param length The padding amount, the amount of digits in pool length. Defaults to 2
     */
    private padIndex(index: number, length = 2): string {
        let str = index.toString();
        while (str.length < length) {
            str = "0" + str;
        }

        return str;
    }

    /**
     * Turns a pool name returned by the API into a proper filename
     * @param name Pool name
     */
    private createPoolFilename(name: string): string {
        return name
            .slice(0, 64)
            .replace(/\s/g, "_")
            .replace(/_{2,}/g, "_")
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "");
    }

}
