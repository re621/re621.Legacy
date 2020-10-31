import { UtilEvents } from "./UtilEvents";
import { UtilID } from "./UtilID";
import { UtilMath } from "./UtilMath";
import { UtilTime } from "./UtilTime";

/**
 * Common utilities used in other modules
 */
export class Util {

    public static Time = UtilTime;
    public static Events = UtilEvents;
    public static ID = UtilID;
    public static Math = UtilMath;
    public static LS = window.localStorage;
    public static SS = window.sessionStorage;

    /**
     * Downloads the provided object as a JSON file
     * @param data Object to download
     * @param file File name
     */
    public static downloadAsJSON(data: any, file: string): void {
        const tempLink = $("<a>")
            .attr({
                "download": file + ".json",
                "href": "data:application/json," + encodeURIComponent(JSON.stringify(data, null, 4)),
            })
            .appendTo("body")
            .on("click", () => { tempLink.remove(); });
        tempLink[0].click();
    }

    /**
     * Returns a promise that is fulfilled after the specified time period elapses
     * @param time Time period, in milliseconds
     */
    public static async sleep(time: number): Promise<void> {
        return new Promise((resolve) => { setTimeout(() => { resolve(); }, time) });
    }

    /**
     * Split the array into chunks of specified size.  
     * If `altMode` is set to true, splits array into two parts.  
     * - [0] is the size specified by the `size` argument  
     * - [1] is the remainder.  
     * Otherwise, splits the array normally.
     * @param input Original array
     * @param size Size of the resulting chunks
     * @param altMode Alternative mode
     * @returns Array of smaller arrays of specified size
     */
    public static chunkArray<T>(input: T[] | Set<T>, size: number, altMode = false): T[][] {
        if (!Array.isArray(input)) input = Array.from(input);
        const result = [];
        if (altMode) {
            result[0] = input.slice(0, size);
            result[1] = input.slice(size);
        } else {
            for (let i = 0; i < input.length; i += size)
                result.push(input.slice(i, i + size));
        }
        return result;
    }

    /**
     * Returns the indexes of all instances of the specified value in an array
     * @param input Array to search
     * @param value Value to look for
     * @returns Array of number indexes
     */
    public static getArrayIndexes<T>(input: T[], value: T): number[] {
        const indexes: number[] = [];
        let i = 0;
        for (; i < input.length; i++) {
            if (input[i] === value) indexes.push(i);
        }
        return indexes;
    }

    /**
     * Convert markdown input into html.  
     * Very limited in scope, don't rely on this for anything important.
     * @param input Markdown input
     * @returns HTML output
     */
    public static quickParseMarkdown(input: string): string {
        if (input === undefined) return "";
        return input
            .replace(/\*\*(.*?)\*\*/gm, "<strong>$1</strong>")
            .replace(/\_(.*?\S)\_/gm, "<em>$1</em>")
            .replace(/\[(.+)\]\((.*)\)/gm, `<a href="$2">$1</a>`)
            .replace(/^[-]+(.*)?/gmi, "<ul><li>$1</li></ul>")
            .replace(/\<\/ul\>\r\n\<ul\>/gm, "")
            .replace(/\n(?!<)/gm, "<br />");
    }

    /**
     * Parses the provided DText string, returning it as plain text
     * @param input Input to process
     * @param removeSections If true, removes `quote`, `code`, and `sections` blocks altogether
     */
    public static parseDText(input: string, removeSections = true): string {
        if (removeSections) {
            input = input.replace(/\[quote\][\s\S]*\[\/quote\]/g, "")
                .replace(/\[code\][\s\S]*\[\/code\]/g, "")
                .replace(/\\[section[\s\S]*\[\/section\]/g, "");
        }

        input = input
            .replace(/\[b\]([\s\S]*)\[\/b\]/g, "<b>$1</b>")                     // bold
            .replace(/\[i\]([\s\S]*)\[\/i\]/g, "<i>$1</i>")                     // italics
            .replace(/\[u\]([\s\S]*)\[\/u\]/g, "<u>$1</u>")                     // Underline
            .replace(/\[o\]([\s\S]*)\[\/o\]/g, "<o>$1</o>")                     // Overline
            .replace(/\[s\]([\s\S]*)\[\/s\]/g, "<s>$1</s>")                     // Strikeout
            .replace(/\[sup\]([\s\S]*)\[\/sup\]/g, "<sup>$1</sup>")             // Superscript
            .replace(/\[sub\]([\s\S]*)\[\/sub\]/g, "<sub>$1</sub>")             // Subscript
            .replace(/\[spoiler\]([\s\S]*)\[\/spoiler\]/g, "<span>$1</span>")   // Spoiler
            .replace(/\[color\]([\s\S]*)\[\/color\]/g, "<span>$1</span>")       // Color

        return input;
    }

    /**
     * Converts a byte number into a formatted string
     * @param bytes Number
     * @param decimals Decimal places
     */
    public static formatBytes(bytes: number, decimals = 2): string {
        if (bytes === 0) return "0 B";

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
    }

    public static unformatBytes(input: string): number {
        if (Util.Math.isNumeric(input)) return parseInt(input);

        input = input.toUpperCase();
        for (const [index, size] of [/\dB$/, /\dKB$/, /\dMB$/, /\dGB$/, /\dTB$/, /\dPB$/].entries()) {
            if (size.test(input)) {
                return parseInt(input) * Math.pow(1024, index);
            }
        }
        return 0;
    }

    /**
     * Trims the thousands off a number and replaced them with a K.  
     * ex. 54321 -> 54.3k
     * @param num Number to trim
     */
    public static formatK(num: number): string {
        return Math.abs(num) > 999 ? (Math.sign(num) * (Math.abs(num) / 1000)).toFixed(1) + "k" : Math.sign(num) * Math.abs(num) + "";
    }


    /* returns an array with the ratio */
    public static formatRatio(width: number, height: number): [number, number] {
        const d = gcd(width, height);
        return [width / d, height / d];

        function gcd(u: number, v: number): number {
            if (u === v) return u;
            if (u === 0) return v;
            if (v === 0) return u;

            if (~u & 1)
                if (v & 1)
                    return gcd(u >> 1, v);
                else
                    return gcd(u >> 1, v >> 1) << 1;

            if (~v & 1) return gcd(u, v >> 1);

            if (u > v) return gcd((u - v) >> 1, v);

            return gcd((v - u) >> 1, u);
        }
    }

    /**
     * Parses the textarea input specified in the parameter and returns a list of space-separated tags
     * @param input Textarea to parse
     */
    public static getTagString(input: JQuery<HTMLElement>): string {
        return input.val().toString().trim()
            .toLowerCase()
            .replace(/\r?\n|\r/g, " ")      // strip newlines
            .replace(/(?:\s){2,}/g, " ");   // strip multiple spaces
    }

    public static getTags(input: string): string[];
    public static getTags(input: JQuery<HTMLElement>): string[];
    public static getTags(input: string | JQuery<HTMLElement>): string[] {
        return (typeof input === "string" ? input : Util.getTagString(input))
            .split(" ")
            .filter((el) => { return el != null && el != ""; });
    }

    /** Takes in an object, and returns a regular expression with its keys */
    public static getKeyRegex(object: any): RegExp {
        const result: string[] = [];
        for (const key of Object.keys(object))
            result.push(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return new RegExp(result.join("|"), "gi");
    }

    /**
     * Compares two software version numbers (e.g. "1.7.1" or "1.2b").
     *
     * This function was born in http://stackoverflow.com/a/6832721.
     *
     * @param v1 The first version to be compared.
     * @param v2 The second version to be compared.
     * @param [options] Optional flags that affect comparison behavior:
     *      `lexicographical` _boolean_ compares each part of the version strings lexicographically instead of
     *      naturally; this allows suffixes such as "b" or "dev" but will cause "1.10" to be considered smaller than "1.2".  
     *      `zeroExtend` _boolean_ changes the result if one version string has less parts than the other. In
     *         this case the shorter string will be padded with "zero" parts instead of being considered smaller.  
     * @returns {number|NaN}
     *      - 0 if the versions are equal  
     *      - a negative integer iff v1 < v2  
     *      - a positive integer iff v1 > v2  
     *      - NaN if either version string is in the wrong format  
     * @copyright by Jon Papaioannou (`john.papaioannou@gmail.com`)
     * @license This function is in the public domain. Do what you want with it, no strings attached.
     */
    public static versionCompare(v1: string, v2: string, options?: { lexicographical?: boolean; zeroExtend?: boolean }): number {
        const lexicographical = options && options.lexicographical,
            zeroExtend = options && options.zeroExtend;
        let v1parts: string[] | number[] = v1.split('.'),
            v2parts: string[] | number[] = v2.split('.');

        function isValidPart(x: string): boolean {
            return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
        }

        if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) return NaN;

        if (zeroExtend) {
            while (v1parts.length < v2parts.length) v1parts.push("0");
            while (v2parts.length < v1parts.length) v2parts.push("0");
        }

        if (!lexicographical) {
            v1parts = v1parts.map(Number);
            v2parts = v2parts.map(Number);
        }

        for (let i = 0; i < v1parts.length; ++i) {
            if (v2parts.length == i) return 1;

            if (v1parts[i] == v2parts[i]) continue;
            else if (v1parts[i] > v2parts[i]) return 1;
            else return -1;
        }

        if (v1parts.length != v2parts.length) return -1;

        return 0;
    }

}
