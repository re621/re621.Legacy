/**
 * Basic script parameters, both hard-coded and derived from the userscript header.
 * GM_info is used here because of XM.Connect initialization issues.
 */
export default class Script {
    public static version = GM_info.script.version;
    public static handler = {
        name: GM_info.scriptHandler,
        version: GM_info.version,
    }
    public static url = {
        website: "https://re621.bitwolfy.com",
        repo: "https://github.com/re621/re621.Legacy",
        issues: "https://github.com/re621/re621/issues",
        thread: "https://e621.net/forum_topics/25872",
        latest: "https://api.github.com/repos/re621/re621/releases/latest",
        kofi: "https://ko-fi.com/bitWolfy",
    }
    public static userAgent = "re621/" + this.trimVersion(Script.version);

    private static trimVersion(value: string): string {
        const match = value.match(/(\d\.\d+)\.\d+/);
        if (!match || !match[1]) return "0.0";
        return match[1];
    }
}
