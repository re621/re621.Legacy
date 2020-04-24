const fs = require("fs"),
    https = require("https"),
    rimraf = require("rimraf"),
    util = require("./util");

// Get the build mode
const prodMode = process.argv[2] === "prod";

// Prepare the directory
rimraf.sync("./build/extension");
fs.mkdirSync("./build/extension");
fs.mkdirSync("./build/extension/lib");

if (prodMode) {
    rimraf.sync("./build/cache");
    fs.mkdirSync("./build/cache");
}

const manifest = JSON.parse(util.parseTemplate(
    fs.readFileSync("./bin/extension-manifest.json").toString(),
    JSON.parse(fs.readFileSync("./package.json"))
));

// Copy the icons
fs.mkdirSync("./build/extension/icons");
const downloadQueue = [];
manifest["icons-lib"].forEach((entry, index) => {
    downloadQueue.push(new Promise(async (resolve) => {
        const fileName = entry.path.replace(/^.*[\\\/]/, '');
        if (prodMode || !fs.existsSync(entry.path)) await fetchFile(entry.url, entry.path, "./build/extension/icons/" + fileName);
        else fs.createReadStream(entry.path).pipe(fs.createWriteStream("./build/extension/icons/" + fileName));
        manifest["icons"][entry.size] = "icons/" + fileName;
        resolve();
    }));
});
delete manifest["icons-lib"];

// Copy required libraries
manifest["content_scripts"][0]["js-lib"].forEach((file, index) => {
    downloadQueue.push(new Promise(async (resolve) => {
        const fileName = file[1].replace(/^.*[\\\/]/, '');
        if (prodMode || !fs.existsSync(file[1])) await fetchFile(file[0], file[1], "./build/extension/lib/" + fileName);
        else fs.createReadStream(file[1]).pipe(fs.createWriteStream("./build/extension/lib/" + fileName));
        manifest["content_scripts"][0]["js"].push("lib/" + fileName);
        resolve();
    }));
});
delete manifest["content_scripts"][0]["js-lib"];

Promise.all(downloadQueue).then((resolved) => {

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

    // Copy the background page
    fs.createReadStream("./bin/extension-background.js").pipe(fs.createWriteStream("./build/extension/background.js"));

    // Copy the injected code
    fs.createReadStream("./bin/extension-injector.js").pipe(fs.createWriteStream("./build/extension/injector.js"));


    // Write the manifest file
    fs.writeFileSync("./build/extension/manifest.json", JSON.stringify(manifest, null, 4) + "\n");

});


function fetchFile(url, resourcePath, finalPath) {
    const parsedURL = new URL(url);
    const options = {
        hostname: parsedURL.hostname,
        path: parsedURL.pathname,
        headers: { "User-Agent": "re621/1.0 buildscript re621.github.io" },
    }

    return new Promise((resolve, reject) => {
        // console.log("fetching " + url + " to " + resourcePath);
        const file = fs.createWriteStream(resourcePath);
        https.get(options, function(request) {
            request.pipe(file);

            request.on("end", () => {
                fs.createReadStream(resourcePath).pipe(fs.createWriteStream(finalPath));
                resolve();
            });

            request.on("error", (error) => {
                console.log(error);
                reject();
            });
        });
    });
}
