import { Debug } from "../utility/Debug";

declare const Mousetrap: any;

export class KeybindManager {

    private static listeners: Map<string, ListenerFunction> = new Map();
    private static executors: Map<string, KeybindExecutor> = new Map();

    private static listening = false;

    public static register(keybind: Keybind): void;
    public static register(keybind: Keybind[]): void;
    public static register(keybind: Keybind | Keybind[]): void {

        if (Array.isArray(keybind)) {
            for (const entry of keybind) this.register(entry);
            return;
        }

        // Create a listener if one does not exist already
        this.refreshListener(keybind.keys);

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
        this.listening = true;
        Mousetrap.record((sequence: string[]) => {
            this.listening = false;
            callback(sequence);
        });
    }

    public static count(sequence: string): number {
        if (!this.executors.has(sequence)) return 0;
        return Object.keys(this.executors.get(sequence)).length;
    }

    private static refreshListener(keys: string[]): void {
        for (const key of keys) {

            // Establish the listener
            if (!this.listeners.has(key)) {
                this.listeners.set(key, () => {
                    if (KeybindManager.listening) return;
                    const listenerExecutor = this.executors.get(key);
                    Debug.log("[" + key + "]: triggered " + Object.entries(listenerExecutor).length + " executors");
                    for (const [bindMeta, keyObj] of Object.entries(listenerExecutor)) {
                        if (!keyObj.enabled) continue;
                        keyObj.fnct(bindMeta);
                    }
                });

                // Dumbest thing I've written today, but it works. Don't question it.
                Mousetrap.bind(key, () => { this.listeners.get(key)(); });
            }

            // Create the executor
            if (!this.executors.has(key)) this.executors.set(key, {});
        }
    }

    public static getData(): void {
        console.log(this.listeners);
        console.log(this.executors);
    }

}

export interface Keybind {

    keys: string[];

    bindMeta: string;

    bindName: string;

    fnct: (bindMeta: string) => void;

    enabled: boolean;
}

type ListenerFunction = () => void;

interface KeybindExecutor {
    [name: string]: Keybind;
}

export interface KeybindResponse {
    success: boolean;
    taken: boolean;
}
