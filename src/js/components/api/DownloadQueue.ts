import { GM } from "./GM";

declare const JSZip;

export class DownloadQueue {

    private static concurrent = 3;

    private queue: DownloadFile[];
    private zip: any;

    public constructor() {
        this.queue = [];
        this.zip = new JSZip();
    }

    public getThreadCount(): number {
        return DownloadQueue.concurrent;
    }

    /**
     * Adds a file to the queue.  
     * The callback function is
     * @param file File information
     * @param progress Callback function
     */
    public add(file: FileData, listeners?: DownloadListeners): void {
        this.queue.push({
            file: this.verifyFileData(file),
            listeners: this.verifyDownloadListeners(listeners),
        });
    }

    private verifyFileData(file: FileData): FileData {
        file.unid = file.unid === undefined ? 0 : file.unid;
        file.date = file.date === undefined ? new Date() : new Date(file.date);
        file.tags = file.tags === undefined ? "" : file.tags;

        return file;
    }

    private verifyDownloadListeners(listeners: DownloadListeners): DownloadListeners {
        if (listeners === undefined) listeners = {};

        listeners.onStart = listeners.onStart === undefined ? function (): void { return; } : listeners.onStart;
        listeners.onFinish = listeners.onFinish === undefined ? function (): void { return; } : listeners.onFinish;
        listeners.onLoadStart = listeners.onLoadStart === undefined ? function (): void { return; } : listeners.onLoadStart;
        listeners.onLoadFinish = listeners.onLoadFinish === undefined ? function (): void { return; } : listeners.onLoadFinish;
        listeners.onError = listeners.onError === undefined ? function (): void { return; } : listeners.onError;

        return listeners;
    }

    public process(progress?: Function): Promise<any> {
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
            }, progress);
        });
    }

    private async createnewProcess(thread: number): Promise<any> {
        console.log("creating thread " + thread);
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
     * Returns the image at the specified location as a blob.  
     * The location's domain MUST be listed in a @connect field in the script header.
     * @param url Image URL
     * @returns blob Image data
     */
    private async getDataBlob(item: DownloadFile, thread: number): Promise<Blob> {
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

interface FileData {
    name: string;
    path: string;

    file?: string;

    unid?: number;
    date?: Date;
    tags?: string;
}

interface DownloadFile {
    file: FileData;
    listeners: DownloadListeners;
}

interface DownloadListeners {
    onStart?: Function;
    onFinish?: Function;

    onLoadStart?: Function;
    onLoadFinish?: Function;

    onError?: Function;
}
