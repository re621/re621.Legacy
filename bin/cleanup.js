const fs = require("fs");

fs.rmSync("./build/tsc-temp", { recursive: true, force: true });
