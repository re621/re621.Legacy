import { XM } from "../api/XM";

/**
 * Manages the Avoid Posted list
 */
export class AvoidPosting {

    private static cache: DNPList;

    /** Returns the cached DNP data. */
    private static async getData(): Promise<DNPData> {
        if (this.cache === undefined) this.cache = await XM.Connect.getResourceJSON<DNPList>("re621_dnp");
        return Promise.resolve(this.cache.data);
    }

    /**
     * Returns the DNP entry for the specified tag name.  
     * If the tag is not on the list, returns undefined.
     * @param name Tag name
     */
    public static async get(name: string): Promise<DNPDataEntry> {
        return this.getData().then((data) => {
            return Promise.resolve(data[name]);
        });
    }

    /**
     * Returns true if the provided tag name is on the DNP list, false otherwise
     * @param name Tag name
     */
    public static async contains(name: string): Promise<boolean> {
        return this.get(name).then((data) => {
            return Promise.resolve(data !== undefined);
        });
    }

}

interface DNPList {
    meta: {
        package: string;
        version: string;
    };
    data: DNPData;
}

type DNPData = {
    [prop: string]: DNPDataEntry;
}

interface DNPDataEntry {
    reason: string;
}
