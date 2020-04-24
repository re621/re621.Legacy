var fs = require("fs");

const template = fs.readFileSync("./bin/userscript-template.js").toString();
const package = JSON.parse(fs.readFileSync("./package.json"));

var templateReplaced = template
    .replace(/%NAME%/g, package.name)
    .replace(/%DISPLAYNAME%/g, package.displayName)
    .replace(/%NAMESPACE%/g, package.namespace)
    .replace(/%DESCRIPTION%/g, package.description)
    .replace(/%AUTHOR%/g, package.author)
    .replace(/%VERSION%/g, process.env.GIT_TAG_NAME === undefined ? package.version : process.env.GIT_TAG_NAME)
    .replace(/%VERSHORT%/g, package.version.replace(/\.\d+$/g, ""))
    .replace(/%BUILD%/g, getBuildTime());

fs.writeFileSync("./build/script.user.js", templateReplaced + "\n" + fs.readFileSync("./build/script.user.js"));


function getBuildTime() {
    function twoDigit(n) { return (n < 10 ? '0' : '') + n; }

    const date = new Date();
    return (date.getFullYear() + "").substring(2) + twoDigit(date.getMonth() + 1) + twoDigit(date.getDate()) + ":" + twoDigit(date.getHours()) + twoDigit(date.getMinutes());
}
