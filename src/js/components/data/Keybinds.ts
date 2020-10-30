import { Debug } from "../utility/Debug";
import { Util } from "../utility/Util";

const validKeys = [
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
    "-", "=", ".", ",", "/", ";", "'", "[", "]",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "escape", "ctrl", "alt", "shift", "return",
    "up", "down", "left", "right",
];

const replacedKeys = {
    // event.key returns a different name to what jquery.hotkeys expects
    "enter": "return",
    "control": "ctrl",
    "arrow": "",

    // replacing shift-modified symbols with respective values
    // it makes no practical difference, but it looks neater
    "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
    "^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
    "_": "-", "+": "=", "<": ",", ">": ".", "?": "//",
    ":": ";", '"': "'", "{": "[", "}": "]",
};
const replacedRegExp = Util.getKeyRegex(replacedKeys);

export class KeybindManager {

    private static listeners: Map<string, ListenerFunction> = new Map();
    private static executors: Map<string, KeybindExecutor> = new Map();

    private static enabled = true;
    private static listening = false;

    public static enable(): void { KeybindManager.enabled = true; }
    public static disable(): void { KeybindManager.enabled = false; }

    public static register(keybind: Keybind): void;
    public static register(keybind: Keybind[]): void;
    public static register(keybind: Keybind | Keybind[]): void {

        if (Array.isArray(keybind)) {
            for (const entry of keybind) this.register(entry);
            return;
        }

        // Create a listener if one does not exist already
        this.refreshListener(keybind.keys, keybind.element, keybind.selector);

        // Register the keybind function in the executor
        for (const key of keybind.keys) {
            if (key.length == 0) continue;
            this.executors.get(key)[keybind.bindMeta] = keybind;
        }
    }

    public static unregister(bindMeta: string): void;
    public static unregister(bindMeta: string[]): void;
    public static unregister(bindMeta: string | string[]): void {

        if (!Array.isArray(bindMeta)) bindMeta = [bindMeta];

        for (const executor of this.executors.values())
            for (const key of Object.keys(executor))
                if (bindMeta.includes(key)) delete executor[key];
    }

    public static record(callback: (sequence: string[]) => void): void {
        KeybindManager.listening = true;
        let keys = [];

        $(document).on("keydown.re621.record", (event) => {
            const key = event.key
                .toLowerCase()
                .replace(replacedRegExp, (matched) => {
                    return replacedKeys[matched];
                });
            if (validKeys.indexOf(key) == -1) return;
            keys.push(key);
        });

        $(document).on("keyup.re621.record", () => {
            if (keys.length !== 0) {
                $(document).off(".re621.record");
                callback(keys);
                KeybindManager.listening = false;
                return;
            }
            keys = [];
        });
    }

    public static count(sequence: string): number {
        if (!this.executors.has(sequence)) return 0;
        return Object.keys(this.executors.get(sequence)).length;
    }

    private static refreshListener(keys: string[], element?: string, selector?: string): void {
        for (const key of keys) {

            if (key.length == 0) continue;

            // Establish the listener structure
            if (!this.listeners.has(key)) {
                this.listeners.set(key, (event: Event) => {
                    if (KeybindManager.listening) return;
                    const listenerExecutor = this.executors.get(key);
                    Debug.log("[" + key + "]: triggered " + Object.entries(listenerExecutor).length + " executors");
                    for (const [bindMeta, keyObj] of Object.entries(listenerExecutor)) {
                        if (!keyObj.enabled) continue;
                        keyObj.fnct(event, bindMeta);
                    }
                });

                // Create the listener itself
                const $element: any = element ? $(element) : $(document);
                if (!selector) selector = null;
                let keydown = false;

                $element.on("keydown.re621.hotkey-" + key, selector, key, (event: Event) => {
                    if (keydown) return;
                    keydown = true;
                    if (!KeybindManager.enabled || KeybindManager.listening) return false;
                    this.listeners.get(key)(event);
                });

                $element.on("keyup.re621.hotkey-" + key, selector, key, () => {
                    keydown = false;
                });
            }

            // Create the executor
            if (!this.executors.has(key)) this.executors.set(key, {});
        }
    }

}

export interface Keybind {
    keys: string[];             // Array of key combinations that would trigger the executor
    bindMeta: string;           // Meta-name of the keybinding, used to differentiate between executors
    fnct: ResponseFunction;     // Function that is triggered that the key is pressed
    enabled: boolean;           // If false, the key gets bound, but the function never gets executed

    element?: string;           // Element to which the listener gets bound. Defaults to `document`
    selector?: string;          // Selector within the element for deferred listeners. Defaults to `null`
}

type ListenerFunction = (event: Event) => void;
export type ResponseFunction = (event: Event, bindMeta: string) => void;

interface KeybindExecutor {
    [name: string]: Keybind;
}
