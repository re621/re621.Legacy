import { Post } from "../post/Post";
import { Util } from "./Util";

export enum UtilSize {
    Byte = 1,
    Kilobyte = 1024 * UtilSize.Byte,
    Megabyte = 1024 * UtilSize.Kilobyte,
    Gigabyte = 1024 * UtilSize.Megabyte,
    Terabyte = 1024 * UtilSize.Gigabyte,
    Petabyte = 1024 * UtilSize.Terabyte,
};

export namespace UtilSize {

    /**
     * Converts a byte number into a formatted string
     * @param bytes Number
     * @param decimals Decimal places
     */
    export function format(bytes: number | string, decimals = 2): string {
        if (typeof bytes == "string") bytes = parseInt(bytes);
        if (!bytes || bytes === 0) return "0 B";

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
    }

    /**
     * Takes in a formatted file size string (ex. 5MB) and converts it to bytes
     * @param input Formatted string
     */
    export function unformat(input: string): number {
        if (Util.Math.isNumeric(input)) return parseInt(input);

        input = input.toUpperCase();
        for (const [index, size] of [/\dB$/, /\dKB$/, /\dMB$/, /\dGB$/, /\dTB$/, /\dPB$/].entries()) {
            if (size.test(input)) {
                return parseInt(input) * Math.pow(1024, index);
            }
        }
        return 0;
    }
}

export class RISSizeLimit {

    static readonly Google = new RISSizeLimit(20 * UtilSize.Megabyte, 8000, 6000);
    static readonly SauceNAO = new RISSizeLimit(15 * UtilSize.Megabyte);
    static readonly Derpibooru = new RISSizeLimit(20 * UtilSize.Megabyte);
    static readonly Kheina = new RISSizeLimit(8 * UtilSize.Megabyte, 7500, 7500);

    public readonly size: number;
    public readonly width: number;
    public readonly height: number;

    private constructor(size: number, width = 0, height = 0) {
        this.size = size;
        this.width = width;
        this.height = height;
    }

    public test(post: Post): boolean {
        return post.file.size <= this.size
            && (this.width == 0 || post.img.width <= this.width)
            && (this.height == 0 || post.img.height <= this.height);
    }

    public toString(): string {
        return `${this.width}x${this.height} (${this.size})`;
    }
}
