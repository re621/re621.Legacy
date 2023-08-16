import { XM } from "../models/api/XM";

export class Debug {

    private static enabled: boolean;
    private static connect: boolean;
    private static perform: boolean;
    private static vivaldi: boolean;

    /** Initialize the debug logger */
    public static async init(): Promise<boolean> {
        Debug.enabled = await XM.Storage.getValue("re621.debug.enabled", false);
        Debug.connect = await XM.Storage.getValue("re621.debug.connect", false);
        Debug.perform = await XM.Storage.getValue("re621.debug.perform", false);
        Debug.vivaldi = await XM.Storage.getValue("re621.debug.vivaldi", false);
        return Promise.resolve(true);
    }

    public static getState(type: DebugFlag): boolean {
        return Debug[type];
    }

    public static setState(type: DebugFlag, enabled: boolean): void {
        Debug[type] = enabled;
        if (enabled) XM.Storage.setValue("re621.debug." + type, enabled);
        else XM.Storage.deleteValue("re621.debug." + type);
    }

    /** Logs the provided data into the console log if debug is enabled */
    public static log(...data: any[]): void {
        if (Debug.enabled) console.log(...data);
    }

    /** Logs the provided data as a table */
    public static table(obj: any): void {
        if (!Debug.enabled) return;
        console.table(obj);
    }

    /** Logs the provided data into the console log if connections logging is enabled */
    public static connectLog(...data: any[]): void {
        if (Debug.connect) console.log("CONNECT", ...data);
    }

    /** Logs the provided data into the console log if performance logging is enabled */
    public static perfStart(input: string): void {
        if (Debug.perform) console.time(input);
    }

    /** Logs the provided data into the console log if performance logging is enabled */
    public static perfEnd(input: string): void {
        if (Debug.perform) console.timeEnd(input);
    }

}

type DebugFlag = "enabled" | "connect" | "perform" | "vivaldi";
