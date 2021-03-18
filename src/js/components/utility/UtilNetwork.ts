import { XM } from "../api/XM";

export class UtilNetwork {

    public static async isOnline(): Promise<boolean> {

        // Not terribly reliable.
        // If the computer is connected to any network, including LAN, this
        // will return true. So, if there's a connection to the router, but
        // not to the internet as a whole, this will not work.
        if (!navigator.onLine) return Promise.resolve(false);

        // Fallback method
        // Tries to make a HEAD request to e621.net, and checks if it works
        return new Promise((resolve) => {
            XM.Connect.xmlHttpRequest({
                method: "HEAD",
                url: "https://e621.net/",
                onerror: () => { resolve(false); },
                onload: () => { resolve(true); },
            });
        })
    }

}
