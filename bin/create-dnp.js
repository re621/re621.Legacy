const fs = require("fs");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const package = JSON.parse(fs.readFileSync("./package.json"));

loadJSON("https://e621.net/tag_implications.json?search[consequent_name]=avoid_posting",
    function(data) {
        let parsedData = {
            meta: {
                package: package.name + "/dnp",
                version: process.env.GIT_TAG_NAME === undefined ? package.version : process.env.GIT_TAG_NAME
            },
            data: {}
        };
        data.forEach((entry) => {
            parsedData["data"][entry["antecedent_name"]] = { reason: entry["reason"] }
        });
        fs.writeFileSync("./build/avoid-posting.json", JSON.stringify(parsedData, null, 2));
    },
    function(xhr) { console.error(xhr); }
);

function loadJSON(path, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
            if (success) success(JSON.parse(xhr.responseText));
        } else {
            if (error) error(xhr);
        }
    };
    xhr.open("GET", path, true);
    xhr.setRequestHeader("User-Agent", "re621/1.0 buildscript re621.github.io");
    xhr.send();
}
