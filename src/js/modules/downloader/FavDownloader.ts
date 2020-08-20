import { DownloadQueue } from "../../components/api/DownloadQueue";
import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { PageDefintion } from "../../components/data/Page";
import { PostData } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
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
    private username: string;

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
            fixedSection: true,
        };
    }

    /** Creates the module's structure. */
    public create(): void {
        super.create();

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

        const usernameMatch = /^(?:.*\s)?fav:([^\s]+)\s.*$/g.exec($("input#tags").val() + "");
        if (usernameMatch == null || usernameMatch[1] == undefined) return;
        else this.username = usernameMatch[1];

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

        BetterSearch.setPaused(true);

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing favorites . . .`);

        // Look up the favorites in the API
        let lookup: Promise<APIPost[]>;
        if (this.posts.length == 0) {
            this.infoText
                .attr("data-state", "loading")
                .html("Fetching API data . . .");
            lookup = recursiveLookup([], this.infoFile, this.username, 1);
        } else lookup = Promise.resolve(this.posts);

        async function recursiveLookup(output: APIPost[], info: JQuery<HTMLElement>, username: string, index: number): Promise<APIPost[]> {
            info.html(" &nbsp; &nbsp;request " + index + " [" + output.length + "]");
            return E621.Posts.get<APIPost>({ tags: "fav:" + username, page: index, limit: 320 })
                .then((data) => {
                    output.push(...data);
                    if (data.length == 320) return recursiveLookup(output, info, username, ++index);
                    else return Promise.resolve(output);
                });
        }

        // Iterate over the post data to make sure we don't hit the data cap
        lookup.then((output) => {
            this.posts = output;
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
            let processingPost: APIPost;
            while (processingPost = this.posts.pop()) {
                const post = processingPost;
                totalFileSize += post.file.size;
                if (totalFileSize > FavDownloader.maxBlobSize) {
                    this.batchOverSize = true;
                    this.downloadOverSize = true;
                    break;
                }

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
            }

            queueSize = downloadQueue.getQueueLength();

            // Begin processing the queue
            this.infoText.html(`Processing . . . `);

            return downloadQueue.run((metadata) => {
                this.infoText.html(`Compressing . . . ` + metadata.percent.toFixed(2) + `%`);
                if (metadata.currentFile) { this.infoFile.html(metadata.currentFile); }
                else { this.infoFile.html(""); }
            });
        }).then((zipData) => {
            let filename = this.username + "-fav-" + this.fileTimestamp;
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
        });
    }

    /**
     * Creates a filename from the post data based on the current template
     * @param data Post data
     */
    private createFilename(data: APIPost): string {
        return MassDownloader.createFilenameBase(this.fetchSettings<string>("template"), PostData.fromAPI(data)) // TODO Fic this
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "." + data.file.ext;
    }

}
