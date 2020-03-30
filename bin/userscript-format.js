const fs = require("fs");

const template = fs.readFileSync("./bin/userscript-template.txt").toString();
const package = JSON.parse(fs.readFileSync("./package.json"));

var templateReplaced = template.replace(/%NAME%/g, package.displayName)
    .replace(/%NAMESPACE%/g, package.namespace)
    .replace(/%DESCRIPTION%/g, package.description)
    .replace(/%AUTHOR%/g, package.author)
    .replace(/%VERSION%/g, process.env.GIT_TAG_NAME === undefined ? package.version : process.env.GIT_TAG_NAME);

fs.writeFileSync("./build/script.user.js", templateReplaced + fs.readFileSync("./build/script.user.js"));
