const fs = require("fs");

const template = fs.readFileSync("./bin/userscript-template.txt").toString();
const json = JSON.parse(fs.readFileSync("./package.json"));

var templateReplaced = template.replace(/%NAME%/g, json.displayName).
replace(/%NAMESPACE%/g, json.namespace).
replace(/%DESCRIPTION%/g, json.description).
replace(/%AUTHOR%/g, json.author);

if (process.argv[2] === undefined) {
    templateReplaced = templateReplaced.replace(/%VERSION%/g, json.version);
} else {
    templateReplaced = templateReplaced.replace(/%VERSION%/g,
        json.version.substring(0, json.version.lastIndexOf(".")) +
        process.argv[2].substring(process.argv[2].lastIndexOf("."))
    );
}

fs.writeFileSync("./build/script.user.js", templateReplaced + fs.readFileSync("./build/script.user.js"));
