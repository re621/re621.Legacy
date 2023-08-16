const ConcatSource = require("webpack-sources").ConcatSource
const ModuleFilenameHelpers = require("webpack/lib/ModuleFilenameHelpers")
const Compilation = require("webpack/lib/Compilation")

function longestLength(a) {
    return a.reduce(function (a, b) { return a.length > b.length ? a : b }).length;
}

function parseAuthor(author) {
    if (typeof author === "string") return author;

    let a = author["name"];
    if (author["email"]) a += " <" + author["email"] + ">";
    if (author["url"]) a += " (" + author["url"] + ")";

    return a;
}

function generateMetadataBlock(metadata) {
    let pad = longestLength(Object.keys(metadata)) + 3;

    let block = [];
    for (let key in metadata) {
        if (metadata.hasOwnProperty(key)) {
            let values = key === "author"
                ? parseAuthor(metadata[key])
                : metadata[key];

            if (!values) {
                block.push("// @" + key);
                continue;
            }

            if (typeof values === "object" && !Array.isArray(values)) {
                let subLongest = longestLength(Object.keys(values));

                for (const [subkey, subvalue] of Object.entries(values))
                    block.push(`// @${key.padEnd(pad) + subkey.padEnd(subLongest)} ${subvalue}`);

            } else {
                if (!Array.isArray(values)) values = [values];
                for (const entry of values)
                    block.push("// @" + key.padEnd(pad) + entry);
            }
        }
    }
    return "// ==UserScript==\n" + block.join("\n") + "\n// ==/UserScript==\n"
}

class UserScriptMetaDataPlugin {

    constructor(options) {
        if (typeof options !== "object") throw new TypeError(`Argument "options" must be an object.`);
        if (!options.hasOwnProperty("metadata")) throw new TypeError(`"Options" must have property "metadata"`);

        this.header = generateMetadataBlock(options.metadata);
        this.test = /\.(user|meta)\.js$/;
    }

    apply(compiler) {
        const header = this.header
        const tester = { test: this.test }

        compiler.hooks.compilation.tap("UserScriptMetaDataPlugin", (compilation) => {
            compilation.hooks.afterProcessAssets.tap(
                {
                    name: "UserScriptMetaDataPlugin",
                    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                () => {
                    compilation.chunks.forEach(chunk => {
                        chunk.files.forEach(file => {
                            if (ModuleFilenameHelpers.matchObject(tester, file))
                                compilation.updateAsset(file, old => new ConcatSource(String(header), "\n", old));
                        });
                    });
                }
            );
        });
    }
}

module.exports = UserScriptMetaDataPlugin
