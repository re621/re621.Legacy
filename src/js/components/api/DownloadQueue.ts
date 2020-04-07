import { GM } from "./GM";

declare const JSZip;

export class DownloadQueue {

    /**
     * Maximum concurrent HTTP connections, per domain. Most modern browsers have this limited to 6.  
     * If the limit is exceeded, the connections will stall, and the overall throughput will suffer.
     */
    private static concurrent = 3;

    private queue: QueuedFile[];
    private zip: any;

    public constructor() {
        this.queue = [];
        this.zip = new JSZip();
    }

    /** Returns the maximum concurrent connections count */
    public getThreadCount(): number {
        return DownloadQueue.concurrent;
    }

    /**
     * Adds a file to the queue to be downloaded
     * @param file FileData name and path are required
     * @param listeners Event listeners that fire during queue execution
     */
    public add(file: FileData, listeners?: DownloadListeners): void {
        file.unid = file.unid === undefined ? 0 : file.unid;
        file.date = file.date === undefined ? new Date() : new Date(file.date);
        file.tags = file.tags === undefined ? "" : file.tags;

        listeners.onStart = listeners.onStart === undefined ? function (): void { return; } : listeners.onStart;
        listeners.onFinish = listeners.onFinish === undefined ? function (): void { return; } : listeners.onFinish;
        listeners.onLoadStart = listeners.onLoadStart === undefined ? function (): void { return; } : listeners.onLoadStart;
        listeners.onLoadFinish = listeners.onLoadFinish === undefined ? function (): void { return; } : listeners.onLoadFinish;
        listeners.onError = listeners.onError === undefined ? function (): void { return; } : listeners.onError;

        this.queue.push({
            file: file,
            listeners: listeners,
        });
    }

    /**
     * Begins queue execution, which fetches and compresses image data until empty.  
     * Note that the queue is processed in reverse order, for the sake of performance.  
     * After all images are downloaded, creates a ZIP archive with the data.
     * @param onArchiveProgress Callback function that fires every time progress is made on the compression.
     * @returns Promise with a ZIP archive as a blob
     */
    public run(onArchiveProgress?: Function): Promise<Blob> {
        const processes: Promise<any>[] = [];
        for (let i = 0; i < DownloadQueue.concurrent; i++) {
            processes.push(this.createnewProcess(i));
        }
        return Promise.all(processes).then(() => {
            return this.zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 9 },
                comment: "Downloaded from e621 on " + new Date().toUTCString(),
            }, onArchiveProgress);
        });
    }

    /**
     * Creates a new download process.  
     * The process pops an item from the queue, downloads it, and adds to the archive.  
     * If no items remain in the queue, it quietly shuts down.
     * @param thread Thread number that this process belongs to
     */
    private async createnewProcess(thread: number): Promise<any> {
        return new Promise(async (resolve) => {

            while (this.queue.length > 0) {
                const item = this.queue.pop();

                item.listeners.onStart(item.file, thread);
                await this.zip.file(
                    item.file.name,
                    await this.getDataBlob(item, thread),
                    {
                        binary: true,
                        date: item.file.date,
                        comment: item.file.tags,
                    }
                );
                item.listeners.onFinish(item.file, thread);
            }

            resolve();
        });
    }

    /**
     * Fetches the file data from a remote location and returns it as a blob
     * @param item File descriptor
     * @param thread Process that requested the file
     */
    private async getDataBlob(item: QueuedFile, thread: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
            GM.xmlhttpRequest({
                method: "GET",
                url: item.file.path,
                headers: { "User-Agent": window["re621"]["useragent"] },
                responseType: "blob",
                onloadstart: () => { item.listeners.onLoadStart(item.file, thread); },
                onerror: () => {
                    item.listeners.onError(item.file, thread);
                    reject(item.file);
                },
                ontimeout: () => {
                    item.listeners.onError(item.file, thread);
                    reject(item.file);
                },
                onload: (result) => {
                    item.listeners.onLoadFinish(item.file, thread);
                    resolve(result.response as Blob);
                }
            });
        });
    }

}

interface QueuedFile {
    file: FileData;
    listeners: DownloadListeners;
}

interface FileData {
    /**
     * **name** New name for the file, with extension.  
     * ex. 2200256-red-izak-arcturus-smonia.jpg
     */
    name: string;

    /**
     * **path** Absolute path where the file can be found.  
     * Note that the domain has to be listed in the @connect tag in the header.  
     * ex. https://static1.e621.net/data/c5/23/c5237c0c40c22af4c4871c38954cc6ac.jpg
     */
    path: string;

    /**
     * **file** Shortened file name, used in logs and human-readable output.  
     * ex. c5237c0c40c22af4c4871c38954cc6ac.jpg
     */
    file?: string;

    /**
     * **unid** Unique ID of the file. Used to set the styles of processed files in callbacks.  
     * ex. 2200256
     */
    unid?: number;

    /**
     * **date** Date and time of the file's last modification. If absent, current time is used.  
     * ex. new Date("2020-04-02T10:28:23-0400")
     */
    date?: Date;

    /**
     * **tags** List of tags, as well as other information, that is added to the file's notes.  
     * ex. "2020 ambiguous_gender biped black_bars book boots bottomwear claws ..."
     */
    tags?: string;
}

interface DownloadListeners {
    /**
     * Fires right before file processing begins.  
     * Note that there is a slight delay before onLoadStart() fires.
     */
    onStart?: Function;

    /**
     * Fires once all file processing finished.  
     * Note that there is a significant delay after onLoadFinish() fires.  
     */
    onFinish?: Function;


    /** Fires when the xmlHttpRequest begins loading the file */
    onLoadStart?: Function;

    /** Fires when the xmlHttpRequest finishes loading the file */
    onLoadFinish?: Function;


    /** Fires if the xmlHttpRequest encounters an error or times out. */
    onError?: Function;
}
