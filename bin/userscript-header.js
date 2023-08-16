const pkg = require('../package.json');

module.exports = {
    name: pkg.displayName,
    namespace: pkg.namespace,
    version: pkg.version,
    author: pkg.author,
    description: pkg.description,
    license: pkg.license,

    homepageURL: pkg.homepage,
    supportURL: pkg.homepage + "/issues",
    icon: "https://cdn.jsdelivr.net/gh/re621/re621@master/assets/icon64.png",
    icon64: "https://cdn.jsdelivr.net/gh/re621/re621@master/assets/icon64.png",

    updateURL: pkg.homepage + "/releases/latest/download/script.meta.js",
    downloadURL: pkg.homepage + "/releases/latest/download/script.user.js",

    match: [
        "https://e621.net/*",
        "https://e926.net/*",
        "http://localhost:3000/*",
    ],

    require: [
        "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js",
        "https://cdn.jsdelivr.net/npm/@re621/zestyapi@latest/dist/ZestyAPI.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jquery.hotkeys/0.2.0/jquery.hotkeys.min.js",
    ],

    grant: [
        "GM_info",
        "GM_setValue",
        "GM_getValue",
        "GM_deleteValue",
        "GM_listValues",
        "GM_addValueChangeListener",
        "GM_removeValueChangeListener",
        "GM_setClipboard",
        "GM_getResourceText",
        "GM_xmlhttpRequest",
        "GM_openInTab",
        "GM_download",
    ],

    connect: [
        "static1.e621.net",
        "re621.bitwolfy.com",
        "*",
    ],

    "run-at": "document-start",
};
