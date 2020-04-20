import { XM } from "../api/XM";

/**
 * Common utilities used in other modules
 */
export class Util {

    /**
     * Converts time from absolute format to relative (i.e. "5 minutes ago")
     * @param time Time to process
     * @returns Relative time string
     */
    public static timeAgo(time: number | string | Date): string {
        switch (typeof time) {
            case 'string':
                time = +new Date(time);
                break;
            case 'object':
                time = time.getTime();
                break;
        }

        const timeFormats = [
            [60, 'seconds', 1], // 60
            [120, '1 minute ago', '1 minute from now'], // 60*2
            [3600, 'minutes', 60], // 60*60, 60
            [7200, '1 hour ago', '1 hour from now'], // 60*60*2
            [86400, 'hours', 3600], // 60*60*24, 60*60
            [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
            [604800, 'days', 86400], // 60*60*24*7, 60*60*24
            [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
            [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
            [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
            [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
            [58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        let seconds = (+new Date() - time) / 1000,
            token = 'ago',
            listChoice = 1;

        if (seconds >= 0 && seconds < 2) { return 'Just now'; }
        if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = 'from now';
            listChoice = 2;
        }
        let i = 0,
            format;
        while (format = timeFormats[i++])
            if (seconds < format[0]) {
                if (typeof format[2] == 'string')
                    return format[listChoice];
                else
                    return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
            }
        return time + "";
    }

    /**
     * Downloads the provided object as a JSON file
     * @param exportObj Object to download
     * @param exportName File name
     */
    public static downloadJSON(exportObj, exportName): void {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 4));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    /**
     * Returns the data at the specified location as a string.  
     * The location's domain MUST be listed in a @connect field in the script header.
     * @param url Page URL
     * @returns string Page data
     */
    public static async userscriptRequest(url: string): Promise<string> {
        return new Promise(resolve => {
            XM.xmlHttpRequest({
                method: "GET",
                url: url,
                headers: { "User-Agent": window["re621"]["useragent"] },
                onload: res => { resolve(res.responseText); }
            });
        });
    }

    /**
     * Returns the image at the specified location as a blob.  
     * The location's domain MUST be listed in a @connect field in the script header.
     * @param url Image URL
     * @returns blob Image data
     */
    public static async getImageBlob(url: string): Promise<Blob> {
        return new Promise((resolve) => {
            XM.xmlHttpRequest({
                method: "GET",
                url: url,
                headers: { "User-Agent": window["re621"]["useragent"] },
                responseType: "blob",
                onload: (result) => { resolve(result.response as Blob); }
            });
        });
    }

    /**
     * Returns the image at the specified location as a data-url.  
     * This is used to bypass e621's restrictions on external files.
     * The location's domain MUST be listed in a @connect field in the script header.
     * @param url Image URL
     * @returns string Data-URL
     */
    public static async getImageAsDataURL(url: string): Promise<string> {
        return new Promise((resolve) => {
            XM.xmlHttpRequest({
                method: "GET",
                url: url,
                headers: { "User-Agent": window["re621"]["useragent"] },
                responseType: "blob",
                onload: (result) => {
                    const reader = new FileReader();
                    reader.onloadend = function (): void {
                        resolve(reader.result.toString());
                    };
                    reader.readAsDataURL(result.response as Blob);
                }
            });
        });
    }

    /**
     * Returns the current date and time in a compressed format.  
     * Used to make downloaded file names unique, i.e. download-200405-0350.zip instead of download.zip
     * @returns String with a date and time in YYMMDD-HHMM format.
     */
    public static getDatetimeShort(): string {
        function twoDigit(n): string { return (n < 10 ? '0' : '') + n; }

        const date = new Date();
        return (date.getFullYear() + "").substring(2) + twoDigit(date.getMonth() + 1) + twoDigit(date.getDate()) + "-" + twoDigit(date.getHours()) + twoDigit(date.getMinutes());
    }

    /**
     * Split the array into chunks of specified size.
     * @param input Original array
     * @param size Size of the resulting chunks
     * @returns Array of smaller arrays of specified size
     */
    public static chunkArray(input: any[], size: number): any[] {
        const result = [];
        for (let i = 0; i < input.length; i += size) {
            result.push(input.slice(i, i + size));
        }
        return result;
    }

    /**
     * Limited markdown parser. Don't rely on this thing to be any good, replace with an actual library if really necessary.
     * @param input Markdown input
     * @returns HTML output
     */
    public static quickParseMarkdown(input: string): string {
        return input
            .replace(/\*\*(.*?)\*\*/gm, "<strong>$1</strong>")
            .replace(/^[-]+(.*)?/gmi, "<ul><li>$1</li></ul>")
            .replace(/\<\/ul\>\r\n\<ul\>/gm, "")
            .replace(/\n(?!<)/gm, "<br />");
    }

    /**
     * Creates a random string of letters, to be used as an ID.  
     * Don't rely on this for anything important.
     * @param length String length
     */
    public static makeID(length = 8): string {
        let result = '';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', charLength = chars.length;
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * charLength));
        }
        return result;
    }

}
