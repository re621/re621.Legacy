import { XM } from "./api/XM";
import { Hotkeys } from "./data/Hotkeys";
import { Page } from "./data/Page";

/**
 * Class that other modules extend.  
 * Provides methods to save and load settings from cookies.
 */
export class RE6Module {

    private static instance: RE6Module;

    private settings: Settings;

    private enabled: boolean;
    private initialized = false;

    private constraint: RegExp[] = [];
    private hotkeys: Hotkey[] = [];

    public constructor(constraint?: RegExp | RegExp[]) {
        if (constraint === undefined) this.constraint = [];
        else if (constraint instanceof RegExp) this.constraint.push(constraint);
        else this.constraint = constraint;
    }

    public async prepare(): Promise<void> {
        await this.loadSettingsCache();
        this.enabled = this.fetchSettings("enabled");
    }

    /** Returns true if the module has already been initialized */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /** Checks if the module should call the init function */
    public canInitialize(): boolean {
        return !this.initialized && this.pageMatchesFilter() && this.enabled;
    }

    /**
     * Evaluates whether the module should be executed.
     * @returns true if the page matches the constraint, false otherwise.
     */
    private pageMatchesFilter(): boolean {
        return this.constraint.length == 0 || Page.matches(this.constraint);
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        this.initialized = true;
    }

    /**
     * Removes the module's structure.  
     * Must clean up everything that create() has added.
     */
    public destroy(): void {
        this.initialized = false;
    }

    /**
     * Returns the module's current state
     * @returns True if the module is enabled, false otherwise
     */
    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Sets the module's enabled / disabled state
     * @param enabled True to enable, False to disable
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Returns the specified settings property.  
     *   
     * This is a hybrid method. If the `fresh` argument is set to true, the method will return a promise
     * that will be fulfilled when new settings are fetched from storage. Otherwise, the settings will
     * be fetched from the local cache. Note that the second method may result in existant settings to 
     * either be undefined, or to have wrong values.  
     *   
     * If the `property` argument is a string, the method will return the value of the specified property
     * as-is. If the argument is an array of strings, an object will be returned instead, with properties
     * matching the ones specified in the argument, their values - the corresponding settings.
     * @param property Property name / names
     * @param fresh If true, refreshes the settings cache before returning the value
     * @returns Property value / values
     */
    public fetchSettings(property: string): any;
    public fetchSettings<T>(property: string): T;
    public fetchSettings(property: string[]): SettingsProperty;
    public fetchSettings(property: string | string[]): any;
    public async fetchSettings(property: string, fresh: boolean): Promise<any>;
    public async fetchSettings<T>(property: string, fresh: boolean): Promise<T>;
    public async fetchSettings(property: string[], fresh: boolean): Promise<SettingsProperty>;
    public fetchSettings<T>(property: string | string[], fresh?: boolean): any {
        if (fresh) {
            return new Promise(async (resolve) => {
                await this.loadSettingsCache();
                resolve(this.fetchSettings(property));
            })
        }

        if (Array.isArray(property)) {
            const result = {};
            property.forEach(entry => { result[entry] = this.settings[entry] as T; });
            return result;
        } else return this.settings[property] as T;
    }

    /**
     * Saves the provided settings.  
     *   
     * This method returns a Promise that is fulfilled when the operation completes, one way or another.
     * If the action was succesful, the Promise will resolve to true, otherwise, it will return false.
     *   
     * If the `property` argument is a string, the method will set the value of the specified property
     * to the one provided by the second argument. If the `property` is an object containing multiple
     * pairs of key-value pairs, each of them will be added to the settings instead.
     * @param property Property name
     * @param value Property value
     * @param preserve Ensures that all other values are preserved
     * @returns True if the settings were saved successfully, false otherwise
     */
    public async pushSettings(property: SettingsProperty): Promise<boolean>;
    public async pushSettings(property: string, value: any): Promise<boolean>;
    public async pushSettings(property: any, value?: any): Promise<boolean> {
        return this.loadSettingsCache().then(() => {
            if (typeof property === "string") this.settings[property] = value;
            else Object.keys(property).forEach((key) => {
                this.settings[key] = property[key];
            });
            return this.saveSettingsCache();
        });
    }

    /**
     * Clears stored settings and resets the configuration to default values.
     * @returns True if the settings were cleared successfully, false otherwise
     */
    public async clearSettings(): Promise<boolean> {
        return XM.Storage.deleteValue("re621." + this.constructor.name).then(() => {
            return this.loadSettingsCache();
        });
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return { enabled: true };
    }

    /**
     * Loads the settings data from Tampermonkey storage.  
     * If no settings exist, uses default values instead.
     * @returns True if the settings were loaded successfully, false otherwise
     */
    private async loadSettingsCache(): Promise<boolean> {
        const defaultValues = this.getDefaultSettings();
        this.settings = await XM.Storage.getValue("re621." + this.constructor.name, defaultValues);

        // If defaultValues has a entry the defaultSettings do not have, add it
        // this might happen if the user saved and a defaultSetting gets added afterwards
        for (const key of Object.keys(defaultValues)) {
            if (this.settings[key] === undefined) {
                this.settings[key] = defaultValues[key];
            }
        }

        return Promise.resolve(true);
    }

    /**
     * Save the settings to local storage.  
     * @returns True if the settings were saved successfully, false otherwise
     */
    private async saveSettingsCache(): Promise<boolean> {
        return XM.Storage.setValue("re621." + this.constructor.name, this.settings);
    }

    /**
     * Returns a promise that gets fulfilled when the saved settings get loaded.  
     * If no settings are saved, returns the default values.  
     * @returns True if the settings were refreshed successfully, false otherwise
     */
    public async refreshSettings(): Promise<boolean> {
        return this.loadSettingsCache();
    }

    /**
     * Retrieves the data that has actually been saved into the settings.  
     * Used while exporting settings to file, and pretty much nowhere else.
     */
    public async getSavedSettings(): Promise<{ name: string; data: any }> {
        return {
            name: "re621." + this.constructor.name,
            data: await XM.Storage.getValue("re621." + this.constructor.name, {})
        };
    }

    /** Establish the module's hotkeys */
    public async resetHotkeys(): Promise<void> {
        await this.loadSettingsCache();

        const enabled = this.pageMatchesFilter();
        this.hotkeys.forEach((value) => {
            this.fetchSettings(value.keys).split("|").forEach((key) => {
                if (key === "") return;
                if (enabled) Hotkeys.register(key, value.fnct, value.element, value.selector);
                else Hotkeys.register(key, () => { return; });
            });

        });
    }

    /**
     * Registers the provided hotkeys with the module
     * @param hotkeys Hotkey to register
     */
    protected registerHotkeys(...hotkeys: Hotkey[]): void {
        this.hotkeys.push(...hotkeys);
        this.resetHotkeys();
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    protected static getInstance(): RE6Module {
        if (this.instance == undefined) this.instance = new this();
        return this.instance;
    }

}

interface Hotkey {
    /** List of keys that should trigger the function, pipe-separated */
    keys: string;
    /** Function to execute on hotkey keypress */
    fnct: Function;
    /** Element to listen to hotkeys. Defaults to document */
    element?: JQuery<HTMLElement>;
    /** Selector to look for within the element. Defaults to null */
    selector?: string;
}

export type Settings = {
    enabled: boolean;
} & {
    [prop: string]: any;
};

type SettingsProperty = {
    [prop: string]: any;
};
