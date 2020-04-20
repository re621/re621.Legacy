const fs = require("fs");
const https = require('https');
const core = require("@actions/core");

(async () => {
    const package = JSON.parse(fs.readFileSync("./package.json"));
    let parsedData = {
        meta: {
            package: package.name + "/dnp",
            version: getBuildTime()
        },
        data: {}
    };

    const dnp = await getDnp();
    dnp.forEach((entry) => {
        parsedData["data"][entry["antecedent_name"]] = {
            text: entry["reason"],
            date: entry["created_at"],
        }
    });

    if (fs.existsSync("./dist/avoid-posting.json")) {
        let oldList = Object.keys(JSON.parse(fs.readFileSync("./dist/avoid-posting.json")).data),
            newList = Object.keys(parsedData.data);

        let added = newList.filter(n => !oldList.includes(n)),
            removed = oldList.filter(n => !newList.includes(n));

        let changelog = "";
        if (added.length > 0) changelog += "Added " + added.join(", ") + "\n";
        if (removed.length > 0) changelog += "Removed " + removed.join(", ") + "\n";

        if (changelog != "") core.setOutput("changelog", changelog);
    }

    fs.writeFileSync("./dist/avoid-posting.json", JSON.stringify(parsedData, null, 4) + "\n");

})();

async function getDnp() {
    let result = [];
    const url = "https://e621.net/tag_implications.json?search[consequent_name]=avoid_posting&limit=320&page=";
    let page = 1;
    let response;
    do {
        try {
            response = await loadJSON(url + page);
        } catch (error) {
            console.error(error);
            process.exit(1); //exit non-null to abort build process
        }
        result = result.concat(response);
        page++;
    } while (response.length === 320);
    return result;
}

function loadJSON(url) {
    const options = {
        hostname: "e621.net",
        headers: { "User-Agent": "re621/1.0 dnp-crawler re621.github.io" },
        port: 443,
        path: url,
        method: "GET"
    }

    return new Promise((resolve, reject) => {
        const request = https.request(options, message => {
            if (message.statusCode !== 200) {
                reject();
            }
            let result = "";
            message.on('data', d => {
                result += d;
            })
            message.on("close", () => {
                resolve(JSON.parse(result));
            });
        })

        request.on('error', error => {
            reject(error);
        });

        request.end()
    });
}

/**
 * Returns the current time, in YYMMDD:HHMM format
 */
function getBuildTime() {
    function twoDigit(n) { return (n < 10 ? '0' : '') + n; }

    const date = new Date();
    return (date.getFullYear() + "").substring(2) + twoDigit(date.getMonth() + 1) + twoDigit(date.getDate()) + ":" + twoDigit(date.getHours()) + twoDigit(date.getMinutes());
}
