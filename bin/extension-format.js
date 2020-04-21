const fs = require("fs"),
    rimraf = require("rimraf");

// Prepare the directory
rimraf.sync("./build/extension");
fs.mkdirSync("./build/extension");
fs.mkdirSync("./build/extension/lib");

const package = JSON.parse(fs.readFileSync("./package.json")),
    manifest = JSON.parse(parseTemplate(fs.readFileSync("./bin/extension-manifest.json").toString()));

// Copy required libraries
manifest["content_scripts"][0]["js-lib"].forEach((file, index) => {
    const fileName = file.replace(/^.*[\\\/]/, '');
    fs.createReadStream(file).pipe(fs.createWriteStream("./build/extension/lib/" + fileName));
    manifest["content_scripts"][0]["js"].push("lib/" + fileName);
});
delete manifest["content_scripts"][0]["js-lib"];

// Copy the script files
fs.createReadStream("./build/script.user.js").pipe(fs.createWriteStream("./build/extension/script.js"));
fs.createReadStream("./build/style.min.css").pipe(fs.createWriteStream("./build/extension/style.min.css"));
manifest["content_scripts"][0]["js"].push("script.js");
manifest["content_scripts"][0]["css"].push("style.min.css");

// Write the manifest file
fs.writeFileSync("./build/extension/manifest.json", JSON.stringify(manifest, null, 4) + "\n");

/**
 * Replaces the variables in the provided string with those from the package.json
 * @param {*} input String to process
 */
function parseTemplate(input) {
    return input
        .replace(/%NAME%/g, package.name)
        .replace(/%DISPLAYNAME%/g, package.displayName)
        .replace(/%NAMESPACE%/g, package.namespace)
        .replace(/%DESCRIPTION%/g, package.description)
        .replace(/%AUTHOR%/g, package.author)
        .replace(/%VERSION%/g, process.env.GIT_TAG_NAME === undefined ? package.version : process.env.GIT_TAG_NAME)
        .replace(/%BUILD%/g, getBuildTime())
        .replace(/%HOMEPAGE%/g, package.homepage)
        .replace(/%GITHUB%/g, package.github);
}

/**
 * Returns the current time, in YYMMDD:HHMM format
 */
function getBuildTime() {
    function twoDigit(n) { return (n < 10 ? '0' : '') + n; }

    const date = new Date();
    return (date.getFullYear() + "").substring(2) + twoDigit(date.getMonth() + 1) + twoDigit(date.getDate()) + ":" + twoDigit(date.getHours()) + twoDigit(date.getMinutes());
}
