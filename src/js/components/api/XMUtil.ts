declare const GM: any;

export class XMUtil {

    /**
     * Open a new tab with this url.
     * @param url Page URL
     * @param options Tab options
     */
    public static openInTab(url: string, options?: GMOpenInTabOptions): GMOpenInTab;
    public static openInTab(url: string, loadInBackground?: boolean): GMOpenInTab;
    public static openInTab(a: any, b?: any): GMOpenInTab {
        if (typeof GM === "undefined") return null; // TODO Chrome function
        else return GM.openInTab(a, b);
    }

    /**
     * Copies data into the clipboard
     * @param data Data to be copied
     * @param info object like "{ type: 'text', mimetype: 'text/plain'}" or a string expressing the type ("text" or "html")
     */
    public static setClipboard(data: any, info?: { type: string; mimetype: string } | string): void {
        if (typeof GM === "undefined") return null; // TODO Chrome function
        else return GM.setClipboard(data, info);
    };
}

interface GMOpenInTabOptions {
    /** **active** decides whether the new tab should be focused */
    active?: boolean;

    /** **insert** that inserts the new tab after the current one */
    insert?: boolean;

    /** **setParent** makes the browser re-focus the current tab on close */
    setParent?: boolean;

    /** **incognito** makes the tab being opened inside a incognito mode/private mode window.*/
    incognito?: boolean;
}

interface GMOpenInTab {
    /** Closes the open tab */
    close(): void;

    /** Listener that executes when the tab is closed */
    onclosed(): void;

    /** Tab's current state */
    closed: boolean;
}
