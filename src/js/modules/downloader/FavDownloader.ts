import { DownloadQueue } from "../../components/api/DownloadQueue";
import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { Page, PageDefintion } from "../../components/data/Page";
import { PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";
import { BetterSearch } from "../search/BetterSearch";
import { MassDownloader } from "./MassDownloader";

export class FavDownloader extends RE6Module {

    // Maximum Blob size. This value differs depending on the browser.
    // Different sources cite different numbers. For now, we'll go with 800MB.
    private static maxBlobSize = 1024 * 1024 * 800;

    private processing = false;

    private downloadOverSize = false;
    private batchOverSize = true;

    // Keeping track of downloaded images
    private posts: APIPost[] = [];
    private userID: number;

    // Value used to make downloaded file names unique
    private fileTimestamp: string = Util.Time.getDatetimeShort();
    private downloadIndex = 1;

    // Interface elements
    private section: JQuery<HTMLElement>;
    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.favorites);
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
        super.create();

        this.userID = parseInt(Page.getQueryParameter("user_id") || $("meta[name=current-user-id]").attr("content"));
        if (this.userID == NaN) return;

        this.section = $("<section>")
            .attr({
                "id": "fav-downloader-box",
                "data-fixed": this.fetchSettings("fixedSection") + "",
            })
            .html(`<h1>Download</h1>`)
            .appendTo("aside#sidebar");

        $("#sidebar").on("re621:reflow", () => {
            this.section.css("top", $("#re621-search").outerHeight() + "px");
        });
        $("#sidebar").trigger("re621:reflow");

        // Download all files
        this.actButton = $("<a>")
            .html("Download All")
            .addClass("pool-download-button button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.processFiles();
            });

        // Contains general info about the download
        this.infoText = $("<div>")
            .addClass("download-info")
            .appendTo(this.section);

        // Contains info about currently downloaded files
        this.infoFile = $("<div>")
            .addClass("download-file")
            .appendTo(this.section);
    }

    public destroy(): void {
        super.destroy();
    }

    /**
     * Toggles the fixed state of the interface section
     */
    public toggleFixedSection(): void {
        if (this.section.attr("data-fixed") === "true") this.section.attr("data-fixed", "false");
        else this.section.attr("data-fixed", "true")
    }

    /** Processes and downloads the selected files. */
    private async processFiles(): Promise<void> {
        if (this.processing) return;
        this.processing = true;
        this.actButton.attr("disabled", "disabled");
        $("search-content").attr("data-downloading", "true");

        BetterSearch.setPaused(true);

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing favorites . . .`);

        // Look up the favorites in the API
        if (this.posts.length == 0) {
            this.infoText
                .attr("data-state", "loading")
                .html("Fetching API data . . .");
            this.posts = (await recursiveLookup([], this.infoFile, this.userID)).reverse();
        }

        async function recursiveLookup(output: APIPost[], info: JQuery<HTMLElement>, userID: number, index = 1): Promise<APIPost[]> {
            info.html(" &nbsp; &nbsp;request " + index + " [" + output.length + "]");
            return E621.Favorites.get<APIPost>({ user_id: userID, page: index, limit: 320 })
                .then((data) => {
                    output.push(...data);
                    if (data.length == 320) return recursiveLookup(output, info, userID, ++index);
                    else return Promise.resolve(output);
                });
        }

        // Iterate over the post data to make sure we don't hit the data cap
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

        // Add post data to the queue
        let queuedPost: APIPost;
        while (queuedPost = this.posts.pop()) {

            const post = PostData.fromAPI(queuedPost);

            // Skip deleted files
            if (!post.has.file) continue;

            // Determine queue size
            totalFileSize += post.file.size;
            Debug.log(`adding #${post.id} (${Util.formatBytes(post.file.size)}) to the queue: ${Util.formatBytes(totalFileSize)} total`)
            if (totalFileSize > FavDownloader.maxBlobSize) {
                this.batchOverSize = true;
                this.downloadOverSize = true;
                break;
            }

            $("#entry_" + post.id)
                .addClass("download-item")
                .attr("data-state", "preparing");
            downloadQueue.add(
                {
                    name: this.createFilename(post),
                    path: post.file.original,
                    file: post.file.original.match(/.{32}\..*$/g)[0],
                    unid: post.id,
                    date: new Date(post.date.raw),
                    tags: post.tagString,
                },
                {
                    onStart: (item, thread, index) => {
                        this.infoText.html(`Downloading ... <span class="float-right">` + (queueSize - index) + ` / ` + queueSize + `</span>`);
                        threadInfo[thread]
                            .html(item.file)
                            .css("--progress", "0%");
                        $("#entry_" + post.id).attr("data-state", "loading");
                    },
                    onFinish: () => {
                        $("#entry_" + post.id).attr("data-state", "done");
                    },
                    onError: () => {
                        $("#entry_" + post.id).attr("data-state", "error");
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
        }

        queueSize = downloadQueue.getQueueLength();

        // Begin processing the queue
        this.infoText.html(`Processing . . . `);

        const zipData = await downloadQueue.run((metadata) => {
            this.infoText.html(`Compressing . . . ` + metadata.percent.toFixed(2) + `%`);
            if (metadata.currentFile) { this.infoFile.html(metadata.currentFile); }
            else { this.infoFile.html(""); }
        });

        let filename = this.userID + "-fav-" + this.fileTimestamp;
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
        } else {
            BetterSearch.setPaused(false);
        }
    }

    /**
     * Creates a filename from the post data based on the current template
     * @param data Post data
     */
    private createFilename(post: PostData): string {
        return MassDownloader.createFilenameBase(this.fetchSettings<string>("template"), post)
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + post.file.ext;
    }

}
