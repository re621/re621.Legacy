declare const GM: any;
declare const chrome: any;

export class XMStorage {

    /**
     * Saves the specified data to the storage
     * @param name Name of the data entry
     * @param value Data value
     */
    public static async setValue(name: string, value: any): Promise<void> {
        return new Promise(async (resolve) => {
            if (typeof GM === "undefined") {
                await new Promise((resolve) => {
                    chrome.storage.sync.set({ name: value }, () => {
                        resolve();
                    });
                });
            } else await GM.setValue(name, value);
            resolve();
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
                chrome.storage.sync.get([name], (result: any) => {
                    if (result["name"] === undefined) resolve(defaultValue);
                    else resolve(result["name"]);
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

}
