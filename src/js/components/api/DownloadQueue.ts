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

    public add(file: FileData, progress?: Function): void {
        if (file.date === undefined) file.date = new Date();
        else file.date = new Date(file.date);
        if (file.tags === undefined) file.tags = "";

        if (progress === undefined) progress = function (): void { return; };

        this.queue.push({
            file: file,
            data: this.getDataBlob(file.path, progress)
        });
    }

    public process(progress?: Function): Promise<any> {
        const processes: Promise<any>[] = [];
        for (let i = 0; i < DownloadQueue.concurrent; i++) {
            processes.push(this.createnewProcess());
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

    private async createnewProcess(): Promise<any> {
        return new Promise(async (resolve) => {

            while (this.queue.length > 0) {
                const item = this.queue.pop();

                this.zip.file(
                    item.file.name,
                    item.data,
                    {
                        binary: true,
                        date: item.file.date,
                        comment: item.file.tags,
                    }
                );
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
    private async getDataBlob(url: string, progress: Function): Promise<Blob> {
        return new Promise((resolve) => {
            GM.xmlhttpRequest({
                method: "GET",
                url: url,
                headers: { "User-Agent": window["re621"]["useragent"] },
                responseType: "blob",
                onload: (result) => {
                    progress(url);
                    resolve(result.response as Blob);
                }
            });
        });
    }

}

interface FileData {
    name: string;
    path: string;
    date?: Date;
    tags?: string;
}

interface DownloadFile {
    file: FileData;
    data: Promise<Blob>;
}
