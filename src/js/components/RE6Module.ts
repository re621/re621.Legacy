import { Page } from "./data/Page";
import { Hotkeys } from "./data/Hotkeys";
import { TM } from "./api/TM";

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
     * Fetches the specified settings property
     * @param property Property name
     * @param fresh Fetches some freshly baked cookies
     * @returns Property value
     */
    public fetchSettings(property: string): any;
    public async fetchSettings(property: string, fresh: boolean): Promise<any>;
    public fetchSettings(property: string, fresh?: boolean): any {
        if (fresh) {
            return new Promise(async (resolve) => {
                await this.loadSettingsCache();
                resolve(this.settings[property]);
            })
        }
        return this.settings[property];
    }

    /**
     * Saves the specified settings property-value pair
     * @param property Property name
     * @param value Property value
     * @param preserve Ensures that all other values are preserved
     */
    public async pushSettings(property: string, value: any): Promise<void> {
        await this.loadSettingsCache();
        this.settings[property] = value;
        this.saveSettingsCache();
    }

    /**
     * Clears stored settings and resets the configuration to default values.
     */
    public clearSettings(): void {
        TM.deleteValue("re621." + this.constructor.name);
        this.loadSettingsCache();
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
     */
    private async loadSettingsCache(): Promise<void> {
        const defaultValues = this.getDefaultSettings();
        this.settings = await TM.getValue("re621." + this.constructor.name, defaultValues);

        // If defaultValues has a entry the defaultSettings do not have, add it
        // this might happen if the user saved and a defaultSetting gets added afterwards
        for (const key of Object.keys(defaultValues)) {
            if (this.settings[key] === undefined) {
                this.settings[key] = defaultValues[key];
            }
        }
    }

    /**
     * Save the settings to Tampermoknkey storage.  
     */
    private async saveSettingsCache(): Promise<void> {
        await TM.setValue("re621." + this.constructor.name, this.settings);
        return Promise.resolve();
    }

    /**
     * Reloads the settings cache from file
     */
    public async refreshSettings(): Promise<void> {
        await this.loadSettingsCache();
    }

    /**
     * Retrieves the data that has actually been saved into the settings.  
     * Used while exporting settings to file, and pretty much nowhere else.
     */
    public async getSavedSettings(): Promise<{ name: string; data: any }> {
        return {
            name: "re621." + this.constructor.name,
            data: await TM.getValue("re621." + this.constructor.name, {})
        };
    }

    /** Establish the module's hotkeys */
    public async resetHotkeys(): Promise<void> {
        await this.loadSettingsCache();

        const enabled = this.pageMatchesFilter();
        this.hotkeys.forEach((value) => {
            this.fetchSettings(value.keys).split("|").forEach((key) => {
                if (key === "") return;
                if (enabled) Hotkeys.register(key, value.fnct);
                else Hotkeys.register(key, () => { return; });
            });

        });
    }

    /**
     * Registers the provided hotkeys with the module
     * @param hotkeys Hotkey to register
     */
    protected registerHotkeys(...hotkeys: Hotkey[]): void {
        this.hotkeys = this.hotkeys.concat(hotkeys);
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
    keys: string;
    fnct: Function;
}

export type Settings = {
    enabled: boolean;
} & {
    [prop: string]: any;
};
