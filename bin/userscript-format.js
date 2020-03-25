const fs = require("fs");

const template = fs.readFileSync("./bin/userscript-template.txt").toString();
const json = JSON.parse(fs.readFileSync("./package.json"));

var templateReplaced = template.replace(/%NAME%/g, json.displayName).
    replace(/%NAMESPACE%/g, json.namespace).
    replace(/%DESCRIPTION%/g, json.description).
    replace(/%AUTHOR%/g, json.author);

const tagName = process.env.GIT_TAG_NAME;
if (tagName === undefined) {
    templateReplaced = templateReplaced.replace(/%VERSION%/g, json.version);
} else {
    templateReplaced = templateReplaced.replace(/%VERSION%/g,
        json.version.substring(0, json.version.lastIndexOf(".")) +
        tagName.substring(tagName.lastIndexOf("."))
    );
}

fs.writeFileSync("./build/script.user.js", templateReplaced + fs.readFileSync("./build/script.user.js"));
