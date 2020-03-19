declare var Cookies;

/**
 * Abstract class that other modules extend.  
 * Provides methods to save and load settings from cookies.
 */
export abstract class RE6Module {

    private settings: any;
    private readonly prefix: string = this.constructor.name;

    protected constructor() {
        this.loadCookies();
    }

    /**
     * Fetches the specified settings property
     * @param property Property name
     * @param fresh Fetches some freshly baked cookies
     * @returns Property value
     */
    protected fetchSettings(property?: string, fresh?: boolean) {
        if (fresh) this.loadCookies();
        if (property === undefined) return this.settings;
        return this.settings[property];
    }

    /**
     * Saves the specified settings property-value pair
     * @param property Property name
     * @param value Property value
     */
    protected pushSettings(property: string, value: any) {
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
        if (cookies === undefined) { this.settings = this.getDefaultSettings(); }
        else this.settings = JSON.parse(cookies);
    }

    /**
     * Saves the settings to cookies
     */
    private saveCookies() {
        Cookies.set("re621." + this.prefix, JSON.stringify(this.settings));
    }

}
