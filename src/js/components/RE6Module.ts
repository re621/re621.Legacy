import { Page } from "./data/Page";
import { HotkeyCustomizer } from "../modules/general/HotkeyCustomizer";

declare var Cookies;

/**
 * Abstract class that other modules extend.  
 * Provides methods to save and load settings from cookies.
 */
export class RE6Module {

    private settings: any;
    private readonly prefix: string = this.constructor.name;

    private constraint: RegExp[] = [];
    private hotkeys: Hotkey[] = [];

    protected constructor(constraint?: RegExp | RegExp[]) {
        if (constraint === undefined) this.constraint = [];
        else if (constraint instanceof RegExp) this.constraint.push(constraint);
        else this.constraint = constraint;

        this.loadCookies();
    }

    /**
     * Evaluates whether the module should be executed.
     * @returns true if the page matches the constraint, false otherwise.
     */
    public eval() {
        return this.constraint.length == 0 || Page.matches(this.constraint);
    }

    /**
     * Fetches the specified settings property
     * @param property Property name
     * @param fresh Fetches some freshly baked cookies
     * @returns Property value
     */
    public fetchSettings(property?: string, fresh?: boolean) {
        if (fresh) this.loadCookies();
        if (property === undefined) return this.settings;
        return this.settings[property];
    }

    /**
     * Saves the specified settings property-value pair
     * @param property Property name
     * @param value Property value
     * @param preserve Ensures that all other values are preserved
     */
    public pushSettings(property: string, value: any, preserve?: boolean) {
        if (preserve) { this.loadCookies() }
        this.settings[property] = value;
        this.saveCookies();
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {};
    }

    /**
     * Loads settings values from cookies if they exist.  
     * Otherwise, loads the default values
     */
    private loadCookies() {
        let cookies = Cookies.get("re621." + this.prefix);
        const defaultValues = this.getDefaultSettings();
        if (cookies === undefined) {
            this.settings = defaultValues;
        }
        else {
            this.settings = JSON.parse(cookies);
            //If defaultValues has a entry the defaultSettings do not have, add it
            //this might happen if the user saved and a defaultSetting gets added afterwards
            for (const key of Object.keys(defaultValues)) {
                if (this.settings[key] === undefined) {
                    this.settings[key] = defaultValues[key];
                }
            }
        }
    }

    /**
     * Saves the settings to cookies
     */
    private saveCookies() {
        Cookies.set("re621." + this.prefix, JSON.stringify(this.settings));
    }

    /**
     * @returns the class name of the module
     */
    public getPrefix() {
        return this.prefix;
    }

    /** Establish the module's hotkeys */
    public resetHotkeys() {
        let enabled = this.eval();
        this.hotkeys.forEach((value) => {

            value.keys.forEach((key) => {
                if (enabled) HotkeyCustomizer.register(this.fetchSettings(key, true), value.fnct);
                else HotkeyCustomizer.register(key, function () { });
            });
        });
    }

    /**
     * Registers the provided hotkeys with the module
     * @param hotkeys Hotkey to register
     */
    protected registerHotkeys(...hotkeys: Hotkey[]) {
        this.hotkeys = this.hotkeys.concat(hotkeys);
        this.resetHotkeys();
    }

}

interface Hotkey {
    keys: string[],
    fnct: Function,
}
