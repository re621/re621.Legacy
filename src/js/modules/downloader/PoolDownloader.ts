import { DownloadQueue } from "../../components/api/DownloadQueue";
import { E621 } from "../../components/api/E621";
import { APIPool } from "../../components/api/responses/APIPool";
import { APIPost } from "../../components/api/responses/APIPost";
import { APIPostGroup } from "../../components/api/responses/APIPostGroup";
import { Page, PageDefintion } from "../../components/data/Page";
import { PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { MassDownloader } from "./MassDownloader";

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
    private fileTimestamp: string = Util.Time.getDatetimeShort();

    // If there are several batches in the download, a number will be appended to the end
    private downloadIndex = 1;

    // Pool-specific variables used in the templating system
    private poolName = "";
    private poolFiles: number[] = [];
    private poolDownloaded: number[] = [];

    // Files skipped because of blacklist
    private blacklistSkipped = 0;

    // Interface elements
    private section: JQuery<HTMLElement>;

    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefintion.pool, PageDefintion.set]);
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
        super.create();

        const base = Page.matches(PageDefintion.pool) ? "div#c-pools" : "div#c-sets";

        const container = $(base)
            .addClass("pool-container");
        const overview = $("#a-show")
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
            .html("<h1>Download</h1>")
            .appendTo(sidebar);

        // Processes selected files

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
        this.actButton.attr("disabled", "disabled");

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing pool files . . .`);

        // Get the IDs of all selected images

        let source: Promise<APIPostGroup[]>;
        let poolName = "UnknownPostGroup";

        if (Page.matches(PageDefintion.pool)) source = E621.Pools.get<APIPool>({ "search[id]": Page.getPageID() });
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
                    const result = await E621.Posts.get<APIPost>({ tags: (Page.matches(PageDefintion.pool) ? "pool:" : "set:") + pool.id, page: i, limit: 320 }, 500);
                    this.infoFile.html(" &nbsp; &nbsp;request " + (i + 1) + " / " + resultPages);
                    resolve(result);
                }));
            }

            return Promise.all(dataQueue);
        }).then((dataChunks) => {
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
            this.blacklistSkipped = 0;

            // Add post data from the chunks to the queue
            dataChunks.forEach((chunk) => {

                if (this.batchOverSize) return;

                chunk.forEach((post: APIPost) => {
                    totalFileSize += post.file.size;
                    if (totalFileSize > PoolDownloader.maxBlobSize) {
                        this.batchOverSize = true;
                        this.downloadOverSize = true;
                        return;
                    }

                    if (post.file.url === null) {
                        this.blacklistSkipped++;
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
            let filename = this.createPoolFilename(poolName) + "-" + this.fileTimestamp;
            filename += this.downloadOverSize ? "-part" + this.downloadIndex + ".zip" : ".zip";

            this.infoText
                .attr("data-state", "done")
                .html(`Done! `);
            this.infoFile.html("");

            // Download the resulting ZIP
            const $downloadLink = $("<a>")
                .attr({
                    "href": URL.createObjectURL(zipData),
                    "download": filename,
                })
                .html("Download Archive")
                .appendTo(this.infoText);

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

            if (this.blacklistSkipped > 0) {
                $("<div>")
                    .addClass("download-notice")
                    .html(`Some files could not be downloaded due to the <a href="/help/global_blacklist">global blacklist</a>.`)
                    .appendTo(this.infoText);
            }
        });
    }

    /**
     * Creates a filename from the post data based on the current template
     * @param data Post data
     */
    private createFilename(data: APIPost): string {
        return MassDownloader.createFilenameBase(this.fetchSettings<string>("template"), PostData.fromAPI(data)) // TODO Fix this
            .replace(/%pool%/g, this.poolName)
            .replace(/%index%/g, "" + (this.poolFiles.indexOf(data.id) + 1))
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + data.file.ext;
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
