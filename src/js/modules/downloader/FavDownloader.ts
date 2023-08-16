import { DownloadQueue } from "../../components/api/DownloadQueue";
import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { Page, PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post, PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
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
    private posts: PostData[] = [];
    private userID: number;

    // Value used to make downloaded file names unique
    private fileTimestamp: string = Util.Time.getDatetimeShort();
    private downloadIndex = 1;

    // Interface elements
    private section: JQuery<HTMLElement>;
    private actButton: JQuery<HTMLElement>;
    private visButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefinition.favorites);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            template: "%artist%/%postid%-%copyright%-%character%-%species%",
            archive: "%userid%-favorites-%timestamp%",
            autoDownloadArchive: true,
        };
    }

    /** Creates the module's structure. */
    public create(): void {
        super.create();

        this.userID = parseInt(Page.getQueryParameter("user_id") || $("meta[name=current-user-id]").attr("content"));
        if (Number.isNaN(this.userID)) return;

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
            .html("All")
            .addClass("pool-download-button button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.processFiles();
            });

        this.visButton = $("<a>")
            .html("Page")
            .addClass("pool-download-button button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.processFiles(true);
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
    private async processFiles(visible = false): Promise<void> {
        if (this.processing) return;
        this.processing = true;
        this.actButton.attr("disabled", "disabled");
        this.visButton.attr("disabled", "disabled");
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
            if (visible) this.posts = Post.find("existant").reverse().entries();
            else this.posts = (await recursiveLookup([], this.infoFile, this.userID)).reverse();
        }

        async function recursiveLookup(output: PostData[], info: JQuery<HTMLElement>, userID: number, index = 1): Promise<PostData[]> {
            info.html(" &nbsp; &nbsp;request " + index + " [" + output.length + "]");
            return E621.Favorites.get<APIPost>({ user_id: userID, page: index, limit: 320 })
                .then((data) => {
                    for (const post of data) {
                        const $post = PostData.fromAPI(post);
                        if (!$post.has.file) continue;
                        output.push(PostData.fromAPI(post));
                    }
                    console.log("counting", data.length);
                    if (data.length == 0) return Promise.resolve(output);
                    else return recursiveLookup(output, info, userID, ++index);
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

        // Fetch DownloadCustomizer settings
        const downloadSamples = ModuleController.fetchSettings<boolean>(DownloadCustomizer, "downloadSamples");

        // Add post data to the queue
        let queuedPost: PostData;
        while (queuedPost = this.posts.pop()) {

            // Dumb workaround for a bug that I'm too lazy to fix
            const post = queuedPost;

            // Determine queue size
            totalFileSize += post.file.size;
            Debug.log(`adding #${post.id} (${Util.Size.format(post.file.size)}) to the queue: ${Util.Size.format(totalFileSize)} total`)
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
                    name: this.createFilename(post, downloadSamples),
                    path: downloadSamples ? post.file.sample : post.file.original,
                    file: (downloadSamples ? post.file.sample : post.file.original).match(/.{32}\..*$/g)[0],
                    unid: post.id,
                    date: post.date.obj,
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

        let filename = this.fetchSettings("archive")
            .replace("%userid%", this.userID)
            .replace("%timestamp%", this.fileTimestamp);
        filename += this.downloadOverSize ? "-part" + this.downloadIndex + ".zip" : ".zip";

        this.infoText
            .attr("data-state", "done")
            .html(`Done! `);
        this.infoFile.html("");

        // Download the resulting ZIP
        if (zipData) {
            const $downloadLink = $("<a>")
                .attr({
                    "href": URL.createObjectURL(zipData),
                    "download": filename,
                })
                .html("Download Archive")
                .appendTo(this.infoText);

            if (this.fetchSettings("autoDownloadArchive")) { $downloadLink.get(0).click(); }
        } else {
            // Fallback, in case the download process failed
            $("<span>")
                .html("Error: malformed archive")
                .appendTo(this.infoText);
        }

        this.downloadIndex++;

        this.actButton.removeAttr("disabled");
        this.visButton.removeAttr("disabled");
        this.processing = false;

        if (this.batchOverSize) {
            // Start the next download immediately
            if (this.fetchSettings("autoDownloadArchive")) {
                if (visible) this.visButton.get(0).click();
                else this.actButton.get(0).click();
            } else {
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
    private createFilename(post: PostData, downloadSamples = false): string {
        return MassDownloader.createFilenameBase(this.fetchSettings<string>("template"), post)
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "."
            + ((downloadSamples && post.has.sample) ? "jpg" : post.file.ext);
    }

}
