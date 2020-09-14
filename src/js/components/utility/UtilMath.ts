export class UtilMath {

    public static clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    public static between(value: number, min: number, max: number): boolean {
        return min <= value && max >= value;
    }

    public static isNumeric(value: string): boolean {
        return !isNaN(Number(value));
    }

}
