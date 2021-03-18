import { XM } from "../api/XM";

export class UtilNetwork {

    public static async isOnline(): Promise<boolean> {
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
