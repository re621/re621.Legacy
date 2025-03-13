const fs = require("fs"),
    util = require("./util");

const packageJSON = JSON.parse(fs.readFileSync("./package.json"));

fs.writeFileSync(
    "./build//script.js",
    util.parseTemplate(fs.readFileSync("./bin/common-template.js").toString(), packageJSON) + "\n\n" +
    fs.readFileSync("./build/script.js") + "\n"
);
