const fs = require("fs");

const headerData = JSON.parse(fs.readFileSync("./bin/userscript-header.json")),
    templateData = fs.readFileSync("./bin/userscript-template.js").toString(),
    package = JSON.parse(fs.readFileSync("./package.json")),
    mode = process.argv[2] ? process.argv[2] : "build",
    browser = process.argv[3] ? process.argv[3] : "chrome";

// Create the userscript header
let header = "";
for (let [key, value] of Object.entries(headerData)) {
    if (Array.isArray(value)) {
        value.forEach((subValue) => { header += formateHeaderLine(key, subValue);; });
    } else if (typeof value === "object" && value !== null) {
        for (let [subKey, subValue] of Object.entries(value))
            header += formateHeaderLine(key, subKey, subValue);
    } else {
        // assume string
        header += formateHeaderLine(key, value);
    }
}

fs.createReadStream("./build/style.min.css").pipe(fs.createWriteStream("./build/userscript/style.min.css"));

switch (mode) {
    case "injector": {
        // Injector script
        header = header
            .replace(/(\/\/ @name[ ]+)(.+)/, "$1re621 Injector")
            .replace(/\/\/ @updateURL.*\n/, "")
            .replace(/\/\/ @downloadURL.*\n/, "")
            .replace(/(\/\/ @resource[ ]+re621_css )(.+)/, browser == "chrome" ? "$1file://" + __dirname + "\\..\\build\\userscript\\style.min.css" : "$1http://localhost:7000/style.min.css");
        header += formateHeaderLine("require", browser == "chrome" ? "file://" + __dirname + "\\..\\build\\userscript\\script.user.js" : "http://localhost:7000/script.user.js");
        fs.writeFileSync("./build/userscript/injector.user.js", parseTemplate("// ==UserScript==\n" + header + "// ==/UserScript==\n"));
        break;
    }
    case "prod": {
        // Metadata file
        fs.writeFileSync(
            "./build/userscript/script.meta.js",
            parseTemplate("// ==UserScript==\n" + header + "// ==/UserScript==\n")
        );
    }
    default: {
        // Normal mode
        fs.writeFileSync(
            "./build/userscript/script.user.js",
            parseTemplate("// ==UserScript==\n" + header + "// ==/UserScript==\n") + "\n\n" +
            parseTemplate(templateData) + "\n\n" +
            fs.readFileSync("./build/script.js")
        );
    }
}

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

function formateHeaderLine(a, b, c) {
    let output = "// @";
    while (a.length < 15) a += " ";
    output += a + " " + b;
    if (c !== undefined) output += " " + c;
    output += "\n";
    return output;
}
