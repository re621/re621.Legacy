declare const GM_getResourceText;

/**
 * Manages the Avoid Posted list
 */
export class AvoidPosting {

    private static instance: AvoidPosting;

    private data;

    private constructor() {
        this.data = JSON.parse(GM_getResourceText("re621_dnp")).data;
    }

    /** Returns a new instance of the current object */
    private static getInstance(): AvoidPosting {
        if (this.instance === undefined) this.instance = new AvoidPosting();
        return this.instance;
    }

    public static contains(name: string): boolean {
        return this.getInstance().data[name] !== undefined;
    }

    public static get(name: string): {} {
        return this.getInstance().data[name];
    }

}
