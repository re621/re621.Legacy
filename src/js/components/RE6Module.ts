declare var Cookies;

/**
 * Abstract class that other modules extend.  
 * Provides methods to save and load settings from cookies.
 */
export abstract class RE6Module {

    private settings : any;
    private readonly prefix : string = this.constructor.name;

    protected constructor() {
        this.settings = this.loadSettingsCookies();
    }

    /**
     * Fetches the specified settings property
     * @param property Property name
     * @returns Property value
     */
    protected fetchSettings(property? : string) {
        if(property === undefined) return this.settings;
        return this.settings[property];
    }

    /**
     * Saves the specified settings property-value pair
     * @param property Property name
     * @param value Property value
     */
    protected pushSettings(property : string, value : any) {
        this.settings[property] = value;
        this.saveSettingsCookies();
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return { };
    }

    /**
     * Loads settings values from cookies if they exist.  
     * Otherwise, returns the default values.
     * @returns Settings set
     */
    private loadSettingsCookies() {
        let cookies = Cookies.get("re621." + this.prefix);
        if(cookies === undefined) { return this.getDefaultSettings(); }
        else return JSON.parse(cookies);
    }

    /**
     * Saves the settings to cookies
     */
    private saveSettingsCookies() {
        Cookies.set("re621." + this.prefix, JSON.stringify(this.settings));
    }

}