var fs = require("fs");
var parseChangelog = require('changelog-parser')

const template = fs.readFileSync("./bin/userscript-template.js").toString();
const package = JSON.parse(fs.readFileSync("./package.json"));

parseChangelog('./CHANGELOG.md', function(err, result) {
    if (err) { throw err; }

    let isDevBuild = process.env.GIT_TAG_NAME === undefined,
        changelog = { changes: [], fixes: [], };

    let versions = result.versions,
        versionIndex = 0;

    if (!isDevBuild) {
        for (var i = 0; i < versions.length; i++) {
            if (versions[i].version == process.env.GIT_TAG_NAME) { versionIndex = i; break; }
        }
    }

    if (versions[versionIndex].parsed.Changes !== undefined) changelog.changes = versions[versionIndex].parsed.Changes;
    if (versions[versionIndex].parsed.Fixes !== undefined) changelog.fixes = versions[versionIndex].parsed.Fixes;

    var templateReplaced = template
        .replace(/%NAME%/g, package.name)
        .replace(/%DISPLAYNAME%/g, package.displayName)
        .replace(/%NAMESPACE%/g, package.namespace)
        .replace(/%DESCRIPTION%/g, package.description)
        .replace(/%AUTHOR%/g, package.author)
        .replace(/%VERSION%/g, isDevBuild ? package.version : process.env.GIT_TAG_NAME)
        .replace(/%BUILD%/g, getBuildTime())
        .replace(/"%CHANGELOG%"/g, JSON.stringify(changelog.changes))
        .replace(/"%FIXLOG%"/g, JSON.stringify(changelog.fixes));

    fs.writeFileSync("./build/script.user.js", templateReplaced + "\n" + fs.readFileSync("./build/script.user.js"));

});


function getBuildTime() {
    function twoDigit(n) { return (n < 10 ? '0' : '') + n; }

    const date = new Date();
    return (date.getFullYear() + "").substring(2) + twoDigit(date.getMonth() + 1) + twoDigit(date.getDate()) + ":" + twoDigit(date.getHours()) + twoDigit(date.getMinutes());
}
