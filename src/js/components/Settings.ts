declare var Cookies;

/**
 * Settings  
 * Handles and stores user-adjustable project settings
 */
export class Settings {

    private static instance: Settings;

    private data;

    private constructor() {

    }

    /**
     * Returns a singleton instance of the class
     * @returns Settings instance
     */
    public static getInstance() {
        if (this.instance === undefined) { this.instance = new Settings(); }
        return this.instance;
    }

}
