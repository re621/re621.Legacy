import { RE6Module } from "../../components/RE6Module";

declare var Danbooru;

const validKeys = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "escape", "ctrl", "alt", "shift", "enter",
];

/**
 * Manages the keyboard shortcuts for the entire project.  
 * Any module that uses hotkeys needs to call this instead.
 */
export class HotkeyCustomizer extends RE6Module {

    private static instance: HotkeyCustomizer;
    private listeners: string[] = [];

    private constructor() {
        super();
        Danbooru.Utility.disableShortcuts = true;
    }

    public static getInstance() {
        if (this.instance === undefined) this.instance = new HotkeyCustomizer();
        return this.instance;
    }

    protected getDefaultSettings() {
        return {

        };
    }

    public static recordSingleKeypress(callback: Function) {
        $("body").attr("data-recording-hotkey", "true");
        let keys = [];

        $(document).on("keydown.re621.record", function (event) {
            let key = event.key.toLowerCase();
            if (validKeys.indexOf(key) == -1) return;
            keys.push(key)
        });

        $(document).on("keyup.re621.record", function (event) {
            if (keys.length !== 0) {
                $(document).off(".re621.record");
                callback(keys.join("+"));
                $("body").attr("data-recording-hotkey", "false");
                return;
            }
            keys = [];
        });
    }

    private static getListeners() {
        return this.getInstance().listeners;
    }

    public static isRegistered(key: string) {
        return this.getInstance().listeners.indexOf(key) != -1;
    }

    public static register(key: string, fn: Function) {
        this.unregister(key);
        $(document).on("keypress.re621.hotkey-" + key, null, key, function (event) {
            if ($("body").attr("data-recording-hotkey") === "true") return;
            fn(event);
        });
        this.getListeners().push(key);
        return true;
    }

    public static unregister(key: string) {
        if (!this.isRegistered(key)) { return false; }
        $(document).unbind("keypress.re621.hotkey-" + key);
        this.getInstance().listeners = this.getListeners().filter(e => e !== key);
    }
}
