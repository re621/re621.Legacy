const fs = require("fs");

if (fs.existsSync("./build/tsc-temp"))
    fs.rmdirSync("./build/tsc-temp/", { recursive: true });
