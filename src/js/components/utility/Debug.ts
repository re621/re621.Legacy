import { XM } from "../api/XM";

export class Debug {

    private static enabled: boolean;
    private static connect: boolean;

    /** Initialize the debug logger */
    public static async init(): Promise<boolean> {
        Debug.enabled = await XM.Storage.getValue("re621.debug.enabled", false);
        Debug.connect = await XM.Storage.getValue("re621.debug.connect", false);
        return Promise.resolve(true);
    }

    /** Returns true if the debug messages are enabled, false otherwise */
    public static isEnabled(): boolean {
        return Debug.enabled;
    }

    /** Enables or disables the debug message output */
    public static setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        XM.Storage.setValue("re621.debug.enabled", enabled);
    }

    /** Logs the provided data into the console log if debug is enabled */
    public static log(...data: any[]): void {
        if (Debug.enabled) console.log(...data);
    }

    /** Returns true if connections log is enabled, false otherwise */
    public static isConnectLogEnabled(): boolean {
        return Debug.connect;
    }

    /** Enables or disables the connect log output */
    public static setConnectLogEnabled(enabled: boolean): void {
        this.connect = enabled;
        XM.Storage.setValue("re621.debug.connect", enabled);
    }

    /** Logs the provided data into the console log if connections logging is enabled */
    public static connectLog(...data: any[]): void {
        if (Debug.connect) console.log("CONNECT", ...data);
    }

}
