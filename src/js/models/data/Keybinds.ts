import { Debug } from "../../utility/Debug";
import { Util } from "../../utility/Util";

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

    private static enabled = true;      // if false, stops executor functions from running
    private static blocked = false;     // if true, stops listener functions from being created
    private static listening = false;   // same as enabled, but for internal use only

    public static enable(): void { KeybindManager.enabled = true; }
    public static disable(): void { KeybindManager.enabled = false; }
    public static block(): void { KeybindManager.blocked = true; }

    public static register(keybind: Keybind): void;
    public static register(keybind: Keybind[]): void;
    public static register(keybind: Keybind | Keybind[]): void {
        if (KeybindManager.blocked) return;

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
                let keydown = false;

                this.listeners.set(key, (event: Event) => {
                    if (KeybindManager.listening) return;
                    const listenerExecutor = this.executors.get(key);
                    Debug.log(`[${key}]: triggered ${Object.entries(listenerExecutor).length} executors`);
                    for (const [bindMeta, keyObj] of Object.entries(listenerExecutor)) {
                        if (!keyObj.enabled) continue;

                        // This is a dumb solution, but it'll work for the time being
                        // The issue is that any keybind can be made holdable by binding it
                        // to a the same key as an already holdable key. This may allow
                        // people to spam certain actions.
                        if (keyObj.holdable) keydown = false;

                        keyObj.fnct(event, bindMeta);
                    }
                });

                // Create the listener itself
                const $element: any = element ? $(element) : $(document);
                if (!selector) selector = null;

                let cooldown = null;
                $element.on("keydown.re621.hotkey-" + key, selector, key, (event: Event) => {
                    if (keydown) return;
                    if (cooldown) return;

                    keydown = true;
                    if (!KeybindManager.enabled || KeybindManager.listening) return false;
                    Debug.log(`[${key}]: caught`);
                    this.listeners.get(key)(event);

                    // Slightly throttles the keystroke input speed
                    // Should only be an issue with holdable keybinds
                    clearTimeout(cooldown);
                    cooldown = setTimeout(() => {
                        clearTimeout(cooldown);
                        cooldown = null;
                    }, 50);
                });

                $element.on("keyup.re621.hotkey-" + key, selector, key, () => {
                    keydown = false;
                });

                $(window).on("blur", () => {
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

    holdable?: boolean;         // if true, allows the response function to keep running as long as the key is pressed
}

type ListenerFunction = (event: Event) => void;
export type ResponseFunction = (event: Event, bindMeta: string) => void;

interface KeybindExecutor {
    [name: string]: Keybind;
}
