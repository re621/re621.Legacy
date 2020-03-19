const fs = require("fs");

const template = fs.readFileSync("./src/userscript-template.txt").toString();
const json = JSON.parse(fs.readFileSync("./package.json"));

const templateReplaced = template.replace(/%NAME%/g, json.displayName).
    replace(/%NAMESPACE%/g, json.namespace).
    replace(/%VERSION%/g, json.version).
    replace(/%DESCRIPTION%/g, json.description).
    replace(/%AUTHOR%/g, json.author);

fs.writeFileSync("./build/script.user.js", templateReplaced + fs.readFileSync("./build/script.user.js"));
