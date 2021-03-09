import { DownloadQueue } from "../../components/api/DownloadQueue";
import { PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post, PostData } from "../../components/post/Post";
import { PostSet, PostSortType } from "../../components/post/PostSet";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { BetterSearch } from "../search/BetterSearch";

export class MassDownloader extends RE6Module {

    // Maximum Blob size. This value differs depending on the browser.
    // Different sources cite different numbers. For now, we'll go with 800MB.
    private static maxBlobSize = 1024 * 1024 * 800;

    private showInterface = false;
    private processing = false;

    private downloadOverSize = false;

    private downloadQueue: DownloadQueue;

    // Value used to make downloaded file names unique
    private fileTimestamp: string = Util.Time.getDatetimeShort();
    private downloadIndex = 0;

    // Interface elements
    private container: JQuery<HTMLElement>;

    private section: JQuery<HTMLElement>;
    private selectButton: JQuery<HTMLElement>;
    private actButton: JQuery<HTMLElement>;
    private infoText: JQuery<HTMLElement>;
    private infoFile: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefinition.search, true, false, [BetterSearch]);
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

        this.section = $("<section>")
            .attr({
                "id": "downloader-box",
                "data-fixed": this.fetchSettings("fixedSection") + ""
            })
            .html("<h1>Download</h1>")
            .appendTo("aside#sidebar");

        $("#sidebar").on("re621:reflow", () => {
            this.section.css("top", $("#re621-search").outerHeight() + "px");
        });
        $("#sidebar").trigger("re621:reflow");

        // Toggles the downloader UI
        this.selectButton = $("<a>")
            .html("Select")
            .attr("id", "download-select")
            .addClass("button btn-neutral")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                this.toggleInterface();
                if (this.downloadQueue) {
                    this.downloadQueue.abort();
                    $("post.download-item").attr("data-state", "ready");
                }
                this.processing = false;
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

        $("<a>")
            .html("Select All Visible")
            .attr("id", "download-select-all")
            .appendTo(this.section)
            .on("click", (event) => {
                event.preventDefault();
                Post.find("all").each((post) => {
                    post.$ref
                        .addClass("download-item")
                        .attr("data-state", "ready");
                });
            });

        // Contains general info about the download
        this.infoText = $("<div>")
            .addClass("download-info")
            .appendTo(this.section);

        // Contains info about currently downloaded files
        this.infoFile = $("<div>")
            .addClass("download-file")
            .appendTo(this.section);


        this.container = $("search-content");
    }

    public destroy(): void {
        super.destroy();
        BetterSearch.off("pageload.MassDownloader");
    }

    /**
     * Toggles the downloader interface.  
     * Enabling the interface should also disable thumbnail enhancements,
     * as well as anything else that might interfere with the file selection.
     */
    private toggleInterface(): void {
        this.showInterface = !this.showInterface;
        BetterSearch.setPaused(this.showInterface);

        if (this.showInterface) {
            this.selectButton.html("Cancel");
            this.section.attr("data-interface", "true");

            this.infoText.html(`Click on thumbnails to select them, then press "Download"`);

            this.container
                .attr("data-downloading", "true")
                .selectable({
                    autoRefresh: false,
                    filter: "post",
                    selected: function (event, ui) {
                        $(ui.selected)
                            .toggleClass("download-item")
                            .attr("data-state", "ready");
                    }
                });

            BetterSearch.on("pageload.MassDownloader", () => {
                this.container.selectable("refresh");
            });

        } else {
            this.selectButton.html("Select");
            this.section.attr("data-interface", "false");

            this.container
                .attr("data-downloading", "false")
                .selectable("destroy");

            BetterSearch.off("pageload.MassDownloader");
        }
    }

    /**
     * Toggles the fixed state of the interface section
     */
    public toggleFixedSection(): void {
        if (this.section.attr("data-fixed") === "true") this.section.attr("data-fixed", "false");
        else this.section.attr("data-fixed", "true")
    }

    private setProcessing(state: boolean): void {
        this.processing = state;
        BetterSearch.setPaused(state);
        if (state) this.actButton.attr("disabled", "disabled");
        else this.actButton.removeAttr("disabled");
    }

    /** Processes and downloads the selected files. */
    private async processFiles(): Promise<void> {
        if (this.processing) return;
        this.setProcessing(true);

        this.infoText
            .attr("data-state", "loading")
            .html(`Indexing selected files . . .`);

        // Get the IDs of all selected images
        const postList: PostSet = new PostSet();
        $("post.download-item[data-state=ready]").each((index, element) => {
            postList.push(Post.get($(element)));
        });

        if (postList.size() === 0) {
            this.infoText
                .attr("data-state", "error")
                .html(`Error: No files selected!`);
            this.setProcessing(false);
            return;
        }

        Debug.log(`downloading ${postList.size()} files`);
        Debug.log(postList);

        this.downloadQueue = new DownloadQueue();

        // Create an interface to output queue status
        const threadInfo: JQuery<HTMLElement>[] = [];
        this.infoFile.html("");
        for (let i = 0; i < this.downloadQueue.getThreadCount(); i++) {
            threadInfo.push($("<span>").appendTo(this.infoFile));
        }

        let totalFileSize = 0,
            queueSize = 0;
        this.downloadOverSize = false;

        // Fetch DownloadCustomizer settings
        const downloadSamples = ModuleController.fetchSettings<boolean>(DownloadCustomizer, "downloadSamples");

        // Iterate over selected images and add them to the queue
        for (const post of postList.sort(PostSortType.SizeAsc).values()) {

            // Skip deleted files
            if (!post.has.file) continue;

            // Determine queue size
            totalFileSize += post.file.size;
            Debug.log(`adding #${post.id} (${Util.Size.format(post.file.size)}) to the queue: ${Util.Size.format(totalFileSize)} total`)
            if (totalFileSize > MassDownloader.maxBlobSize) {
                this.downloadOverSize = true;
                Debug.log(`over filesize limit, aborting`);
                break;
            }

            post.$ref.attr("data-state", "preparing");
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
                        this.infoText.html(`Downloading ... <span class="float-right">` + (queueSize - index) + ` / ` + queueSize + `</span>`);
                        threadInfo[thread]
                            .html(item.file)
                            .css("--progress", "0%");
                        $("#entry_" + item.unid).attr("data-state", "loading");
                    },
                    onFinish: (item) => {
                        $("#entry_" + item.unid).attr("data-state", "done");
                    },
                    onError: (item) => {
                        $("#entry_" + item.unid).attr("data-state", "error");
                    },
                    onLoadProgress: (item, thread, event) => {
                        if (event.lengthComputable)
                            threadInfo[thread].css("--progress", Math.round(event.loaded / event.total * 100) + "%");
                    },
                    onWorkerFinish: (item, thread) => {
                        threadInfo[thread].remove();
                    },
                }
            );
        }

        queueSize = this.downloadQueue.getQueueLength();

        // Begin processing the queue
        this.infoText.html(`Processing . . . `);

        const zipData = await this.downloadQueue.run((metadata) => {
            this.infoText.html(`Compressing . . . ${metadata.percent.toFixed(2)}%`);
            if (metadata.currentFile) { this.infoFile.html(metadata.currentFile); }
            else { this.infoFile.html(""); }
        });

        this.infoText
            .attr("data-state", "done")
            .html(`Done! `);
        this.infoFile.html("");

        // Download the resulting ZIP
        this.downloadIndex++;
        const filename = `e621-${this.fileTimestamp}-${this.downloadIndex}.zip`;
        const $downloadLink = $("<a>")
            .attr({
                "href": URL.createObjectURL(zipData),
                "download": filename,
            })
            .html("Download Archive")
            .appendTo(this.infoText);

        if (this.fetchSettings("autoDownloadArchive")) {
            $downloadLink.get(0).click();
            if (this.downloadOverSize) {
                this.setProcessing(false);
                this.actButton.get(0).click();
                return;
            }
        } else if (this.downloadOverSize) {
            $("<div>")
                .addClass("download-notice")
                .html(`Download has exceeded the maximum file size.<br /><br />Click the download button again for the next part.`)
                .appendTo(this.infoText);
        }

        this.setProcessing(false);
    }

    /**
     * Creates a filename from the post data based on the current template
     * @param data Post data
     */
    private createFilename(post: Post, downloadSamples = false): string {
        return MassDownloader.createFilenameBase(this.fetchSettings<string>("template"), post)
            .slice(0, 128)
            .replace(/-{2,}/g, "-")
            .replace(/-*$/g, "")
            + "."
            + ((downloadSamples && post.has.sample) ? "jpg" : post.file.ext);
    }

    public static createFilenameBase(template: string, post: PostData): string {
        return template
            .replace(/%postid%/g, post.id + "")
            .replace(/%artist%/g, [...post.tags.artist].join("-"))
            .replace(/%copyright%/g, [...post.tags.copyright].join("-"))
            .replace(/%character%/g, [...post.tags.character].join("-"))
            .replace(/%species%/g, [...post.tags.species].join("-"))
            .replace(/%meta%/g, [...post.tags.meta].join("-"))
            .replace(/%md5%/g, post.file.md5);
    }

}
