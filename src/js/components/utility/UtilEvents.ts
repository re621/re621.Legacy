
export class UtilEvents {

    /**
     * Attaches a handler function to a document event with the specified name
     * @param name Event selector
     * @param callback Handler function
     */
    public static on(name: string, callback: (event: JQuery.TriggeredEvent, data: any) => void): void {
        $(document).on(name, (event, data) => {
            callback(event, data);
        });
    }

    /**
     * Executes a handler function exactly once whe encountering a specified event
     * @param name Event selector
     * @param callback Handler function
     */
    public static one(name: string, callback: (event: JQuery.TriggeredEvent, data: any) => void): void {
        $(document).on(name, (event, data) => {
            callback(event, data);
            this.off(name);
        });
    }

    /**
     * Detaches all handlers from the specified module event
     * @param name Event selector
     */
    public static off(name: string): void {
        $(document).off(name);
    }

    /**
     * Execute all handlers for the specified module event
     * @param name Event selector
     * @param data Event data
     */
    public static trigger(name: string, data?: any): void {
        $(document).trigger(name, data);
    }

}
