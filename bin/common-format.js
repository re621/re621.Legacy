const fs = require("fs");
const util = require("./util");

const package = JSON.parse(fs.readFileSync("./package.json"));

fs.writeFileSync(
    "./build//script.js",
    util.parseTemplate(fs.readFileSync("./bin/common-template.js").toString(), package) + "\n\n" +
    fs.readFileSync("./build/script.js")
);
