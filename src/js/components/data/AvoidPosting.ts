import { TM } from "../api/TM";

/**
 * Manages the Avoid Posted list
 */
export class AvoidPosting {

    private static cache: DNPList;

    /** Returns the cached DNP data. */
    private static async getData(): Promise<DNPData> {
        if (this.cache === undefined) this.cache = await TM.getResourceJSON<DNPList>("re621_dnp");
        return Promise.resolve(this.cache.data);
    }

    /**
     * Returns the DNP entry for the specified tag name.  
     * If the tag is not on the list, returns undefined.
     * @param name Tag name
     */
    public static get(name: string): {} {
        return this.getData()[name];
    }

    /**
     * Returns true if the provided tag name is on the DNP list, false otherwise
     * @param name Tag name
     */
    public static async contains(name: string): Promise<boolean> {
        return this.get(name) !== undefined;
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
    [prop: string]: { reason: string };
}
