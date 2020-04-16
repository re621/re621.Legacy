/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
const fs = require("fs");

const headerData = JSON.parse(fs.readFileSync("./bin/userscript-header.json")),
    templateData = fs.readFileSync("./bin/userscript-template.js").toString(),
    package = JSON.parse(fs.readFileSync("./package.json"));

// Create the userscript header
let header = "// ==UserScript==\n";
for (let [key, value] of Object.entries(headerData)) {
    if (Array.isArray(value)) {
        value.forEach((subValue) => { header += "// @" + key + " " + subValue + "\n"; });
    } else if (typeof value === "object" && value !== null) {
        for (let [subKey, subValue] of Object.entries(value))
            header += "// @" + key + " " + subKey + " " + subValue + "\n";
    } else {
        // assume string
        header += "// @" + key + " " + value + "\n";
    }
}
header += "// ==/UserScript==\n"

// Write to file
fs.writeFileSync("./build/script.user.js", parseTemplate(header) + "\n\n" + parseTemplate(templateData) + "\n\n" + fs.readFileSync("./build/script.user.js"));

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
