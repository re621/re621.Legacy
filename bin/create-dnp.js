const fs = require("fs");
const https = require('https');

(async () => {
    const package = JSON.parse(fs.readFileSync("./package.json"));
    let parsedData = {
        meta: {
            package: package.name + "/dnp",
            version: process.env.GIT_TAG_NAME === undefined ? package.version : process.env.GIT_TAG_NAME
        },
        data: {}
    };

    const dnp = await getDnp();
    dnp.forEach((entry) => {
        parsedData["data"][entry["antecedent_name"]] = { reason: entry["reason"] }
    });
    fs.writeFileSync("./build/avoid-posting.json", JSON.stringify(parsedData, null, 2));

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
            process.exit(1);    //exit non-null to abort build process
        }
        result = result.concat(response);
        page++;
    } while (response.length === 320);
    return result;
}

function loadJSON(url) {
    const options = {
        hostname: "e621.net",
        headers: {
            "User-Agent": "re621/1.0 buildscript re621.github.io"
        },
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
