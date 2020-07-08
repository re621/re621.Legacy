
declare const GM: any;
declare const GM_addValueChangeListener: any;
declare const GM_removeValueChangeListener: any;
declare const chrome: any;

export class XMStorage {

    /**
     * Saves the specified data to the storage
     * @param name Name of the data entry
     * @param value Data value
     */
    public static async setValue(name: string, value: any): Promise<boolean> {
        return new Promise(async (resolve) => {
            if (typeof GM === "undefined") {
                await new Promise((resolve) => {
                    chrome.storage.sync.set({ [name]: value }, () => { resolve(); });
                });
            } else await GM.setValue(name, value);
            resolve(true);
        });
    };

    /**
     * Returns the value with the specified name  
     * If no such entry exists, returns the default value
     * @param name Name of the data entry
     * @param defaultValue Default value
     */
    public static async getValue(name: string, defaultValue: any): Promise<any> {
        return new Promise(async (resolve) => {
            if (typeof GM === "undefined") {
                chrome.storage.sync.get(name, (result: any) => {
                    if (typeof result[name] === "undefined") resolve(Promise.resolve(defaultValue));
                    else resolve(Promise.resolve(result[name]));
                });
            } else resolve(GM.getValue(name, defaultValue));
        });
    };

    /**
     * Deletes the entry with the specified name from storage
     * @param name Name of the data entry
     */
    public static async deleteValue(name: string): Promise<void> {
        return new Promise(async (resolve) => {
            if (typeof GM === "undefined") {
                await new Promise((resolve) => {
                    chrome.storage.sync.set({ name: undefined }, () => {
                        resolve();
                    });
                });
            } else await GM.deleteValue(name);
            resolve();
        });
    }

    /**
     * Adds a change listener to the storage and returns the listener ID.
     * @param name string The name of the observed variable
     * @param callback function(name, oldValue, newValue, remote) {}  
     *      **name**        _string_  The name of the observed variable  
     *      **oldValue**    _any_     The old value of the variable (undefined if created)  
     *      **newValue**    _any_     The new value of the variable (undefined if deleted)  
     *      **remote**      _boolean_ true if modified in another tab or false for this script instance  
     */
    public static addListener(name: string, callback: (name: string, oldValue: any, newValue: any, remote: boolean) => void): string {
        if (typeof GM_addValueChangeListener === "undefined") {
            chrome.storage.onChanged.addListener(function (changes: ChromeStorageDataChange) {
                for (const key in changes) {
                    if (key !== name) return;
                    console.log(changes[key]);
                    callback(key, changes[key].oldValue, changes[key].newValue, true);
                }
            });
        } else return GM_addValueChangeListener(name, callback);
    }

    /**
     * Removes a change listener by its ID.
     * @param listenerId string ID of the listener
     */
    public static removeListener(listenerId: string): void {
        if (typeof GM_removeValueChangeListener === "undefined") {
            return;
        } else GM_removeValueChangeListener(listenerId);
    }

}

type ChromeStorageDataChange = {
    [name: string]: {
        oldValue: any;
        newValue: any;
    };
}
