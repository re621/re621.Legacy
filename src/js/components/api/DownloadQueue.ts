import { Util } from "../utility/Util";
import { XM } from "./XM";
import { GMxmlHttpRequestEvent, GMxmlHttpRequestProgressEvent, GMxmlHttpRequestResponse } from "./XMConnect";

declare const JSZip;

export class DownloadQueue {

    // Maximum concurrent HTTP connections, per domain. Most modern browsers have this limited to 6.
    // If the limit is exceeded, the connections will stall, and the overall throughput will suffer.
    private maxThreads = 4;

    // Unique downloader ID, used to cancel the download process
    private id: string;

    private queue: QueuedFile[];

    private zip: any;

    public constructor (maxThreads = 4) {
        this.id = Util.ID.make();
        this.maxThreads = Util.Math.clamp(maxThreads, 1, 6);

        this.queue = [];
        this.zip = new JSZip();
    }

    /** Returns the maximum concurrent connections count */
    public getThreadCount (): number {
        return this.maxThreads;
    }

    /** Returns the number of items in the queue */
    public getQueueLength (): number {
        return this.queue.length;
    }

    /**
     * Adds a file to the queue to be downloaded
     * @param file FileData name and path are required
     * @param listeners Event listeners that fire during queue execution
     */
    public add (file: FileData, listeners?: DownloadListeners): void {
        file.unid = file.unid === undefined ? 0 : file.unid;
        file.date = file.date === undefined ? new Date() : new Date(file.date);
        file.tags = file.tags === undefined ? "" : file.tags;

        listeners.onStart = listeners.onStart === undefined ? function (): void { return; } : listeners.onStart;
        listeners.onFinish = listeners.onFinish === undefined ? function (): void { return; } : listeners.onFinish;
        listeners.onLoadStart = listeners.onLoadStart === undefined ? function (): void { return; } : listeners.onLoadStart;
        listeners.onLoadFinish = listeners.onLoadFinish === undefined ? function (): void { return; } : listeners.onLoadFinish;
        listeners.onLoadProgress = listeners.onLoadProgress === undefined ? function (): void { return; } : listeners.onLoadProgress;
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
    public async run (onArchiveProgress?: (metadata: { percent: number; currentFile: string }) => void): Promise<Blob> {

        // Queue is processed in a reverse order via `.pop()`
        // If it is reversed here, the order becomes correct.
        this.queue = this.queue.reverse();

        let cancelled = false,
            saved = false;
        Util.Events.one(`re621.dl-${this.id}.cancel`, (event, data) => {
            if (data) saved = true;
            cancelled = true;
            this.queue = [];
        });

        const processes: Promise<any>[] = [];
        for (let i = 0; i < this.maxThreads; i++) {
            processes.push(this.createNewProcess(i));
        }
        return Promise.all(processes).then(() => {
            if (cancelled && !saved) return null;
            return this.zip.generateAsync({
                type: "blob",
                compression: "STORE",
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
    private async createNewProcess (thread: number): Promise<any> {
        return new Promise<void>(async (resolve) => {

            Util.Events.one(`re621.dl-${this.id}.cancel`, () => {
                resolve();
            });

            let index: number,
                item: QueuedFile;
            while (this.queue.length > 0) {
                index = this.queue.length;
                item = this.queue.pop();

                item.listeners.onStart(item.file, thread, index);
                try {
                    const dataBlob = await this.getDataBlob(item, thread);
                    await this.zip.file(
                        item.file.name,
                        dataBlob,
                        {
                            binary: true,
                            date: item.file.date,
                            comment: item.file.tags,
                        },
                    );
                } catch (e) { console.log(e); }
                item.listeners.onFinish(item.file, thread, index);
            }

            if (item !== undefined) item.listeners.onWorkerFinish(item.file, thread);

            resolve();
        });
    }

    /**
     * Fetches the file data from a remote location and returns it as a blob
     * @param item File descriptor
     * @param thread Process that requested the file
     */
    private async getDataBlob (item: QueuedFile, thread: number): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            let timer: number;
            XM.Connect.xmlHttpRequest({
                method: "GET",
                url: item.file.path,
                headers: {
                    "User-Agent": window["re621"]["useragent"],
                    "X-User-Agent": window["re621"]["useragent"],
                },
                responseType: "arraybuffer",
                onloadstart: (event) => {
                    item.listeners.onLoadStart(item.file, thread, event);
                },
                onerror: (event) => {
                    item.listeners.onError(item.file, thread, event);
                    reject(item.file);
                },
                ontimeout: (event) => {
                    item.listeners.onError(item.file, thread, event);
                    reject(item.file);
                },
                onprogress: (event) => {
                    if (timer) clearTimeout(timer);
                    timer = window.setTimeout(() => { item.listeners.onLoadProgress(item.file, thread, event); }, 500);
                },
                onload: (event) => {
                    item.listeners.onLoadFinish(item.file, thread, event);
                    resolve(event.response as ArrayBuffer);
                },
            });
        });
    }

    /**
     * Preemptively aborts the download process
     * @param save True to save already downloaded files
     */
    public abort (save = false): void {
        Util.Events.trigger(`re621.dl-${this.id}.cancel`, save);
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
    onStart?(file: FileData, thread: number, index: number): void;

    /**
     * Fires once all file processing finished.
     * Note that there is a significant delay after onLoadFinish() fires.
     */
    onFinish?(file: FileData, thread: number, index: number): void;


    /** Fires when the xmlHttpRequest begins loading the file */
    onLoadStart?(file: FileData, thread: number, event: GMxmlHttpRequestEvent): void;

    /** Fires when the xmlHttpRequest finishes loading the file */
    onLoadFinish?(file: FileData, thread: number, event: GMxmlHttpRequestResponse): void;

    /** Fires when the xmlHttpRequest receives a new data batch */
    onLoadProgress?(file: FileData, thread: number, event: GMxmlHttpRequestProgressEvent): void;


    /** Fires if the xmlHttpRequest encounters an error or times out. */
    onError?(file: FileData, thread: number, event: GMxmlHttpRequestEvent): void;

    /** Fires when the worker finishes processing the queue */
    onWorkerFinish?(file: FileData, thread: number): void;
}
