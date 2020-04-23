const fs = require("fs"),
    rimraf = require("rimraf"),
    util = require("./util");

// Prepare the directory
rimraf.sync("./build/extension");
fs.mkdirSync("./build/extension");
fs.mkdirSync("./build/extension/lib");

const manifest = JSON.parse(util.parseTemplate(
    fs.readFileSync("./bin/extension-manifest.json").toString(),
    JSON.parse(fs.readFileSync("./package.json"))
));

// Copy required libraries
manifest["content_scripts"][0]["js-lib"].forEach((file, index) => {
    const fileName = file.replace(/^.*[\\\/]/, '');
    fs.createReadStream(file).pipe(fs.createWriteStream("./build/extension/lib/" + fileName));
    manifest["content_scripts"][0]["js"].push("lib/" + fileName);
});
delete manifest["content_scripts"][0]["js-lib"];

// Copy the script file
let resourceString = "window.resources = new function() {\n";
Object.keys(manifest["resources"]).forEach((resource) => {
    resourceString += `    this.` + resource + ` = "` + manifest["resources"][resource] + `";\n`;
});
resourceString += "}\n\n";
delete manifest["resources"];

fs.writeFileSync(
    "./build/extension/script.js",
    resourceString +
    fs.readFileSync("./build/script.js")
);
manifest["content_scripts"][0]["js"].push("script.js");

// Copy the stylesheet
fs.createReadStream("./build/style.min.css").pipe(fs.createWriteStream("./build/extension/style.min.css"));
manifest["content_scripts"][0]["css"].push("style.min.css");

// Copy the background page
fs.createReadStream("./bin/extension-background.js").pipe(fs.createWriteStream("./build/extension/background.js"));

// Copy the injected code
fs.createReadStream("./bin/extension-injector.js").pipe(fs.createWriteStream("./build/extension/injector.js"));

// Write the manifest file
fs.writeFileSync("./build/extension/manifest.json", JSON.stringify(manifest, null, 4) + "\n");
