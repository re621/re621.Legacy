const fs = require("fs"),
  util = require("./util");

const headerData = JSON.parse(fs.readFileSync("./bin/userscript-header.json")),
  packageJSON = JSON.parse(fs.readFileSync("./package.json")),
  mode = process.argv[2] ? process.argv[2] : "build",
  browser = process.argv[3] ? process.argv[3] : "chrome";

// Prepare the directory
if (mode !== "injector") {
  fs.rmSync("./build/userscript", { recursive: true, force: true });
  fs.mkdirSync("./build/userscript");
}

// Create the userscript header
let header = "";
for (let [key, value] of Object.entries(headerData)) {
  if (Array.isArray(value)) {
    value.forEach((subValue) => { header += formateHeaderLine(key, subValue); });
  } else if (typeof value === "object" && value !== null) {
    for (let [subKey, subValue] of Object.entries(value))
      header += formateHeaderLine(key, subKey, subValue);
  } else {
    // assume string
    header += formateHeaderLine(key, value);
  }
}

switch (mode) {
  case "injector": {
    // Injector script
    header = header
      .replace(/(\/\/ @name[ ]+)(.+)/, "$1re621 Injector")
      .replace(/\/\/ @updateURL.*\n/, "")
      .replace(/\/\/ @downloadURL.*\n/, "")
      .replace(/(\/\/ @resource[ ]+re621_css )(.+)/, browser == "chrome" ? "$1file://" + __dirname + "\\..\\build\\userscript\\style.min.css" : "$1http://localhost:7000/style.min.css");
    header += formateHeaderLine("require", browser == "chrome" ? "file://" + __dirname + "\\..\\build\\userscript\\script.user.js" : "http://localhost:7000/script.user.js");
    header += formateHeaderLine("match", "http://localhost:3000/*");
    fs.writeFileSync("./build/userscript/injector.user.js", util.parseTemplate("// ==UserScript==\n" + header + "// ==/UserScript==\n", packageJSON));
    break;
  }
  case "prod": {
    const metaBody = util.parseTemplate("// ==UserScript==\n" + header + "// ==/UserScript==\n", packageJSON);
    // Metadata file
    fs.writeFileSync("./build/userscript/script.meta.js", metaBody);
    fs.writeFileSync(
      "./build/userscript/altver.meta.js",
      metaBody
        .replace(/\/\/ @connect +\*[\n\r]/g, "")
        .replace(/download\/script\./g, "download/altver."),
    );
  }
  default: {
    // Normal mode
    const scriptBody
            = util.parseTemplate("// ==UserScript==\n" + header + "// ==/UserScript==\n", packageJSON) + "\n\n"
            + (fs.readFileSync("./build/script.js") + "")
              .replace(/%BUILDTYPE%/g, "script")
              .replace(/\/\/ %STYLESHEET%/g, "const attachedStylesheet = `" + JSON.stringify(fs.readFileSync("./build/style.css").toString(), null, 2) + "`;");
    fs.writeFileSync("./build/userscript/script.user.js", scriptBody.replace(/"%PRIVACY%"/g, false));
    fs.writeFileSync(
      "./build/userscript/altver.user.js",
      scriptBody
        .replace(/"%PRIVACY%"/g, true)
        .replace(/\/\/ @connect +\*[\n\r]/g, "")
        .replace(/download\/script\./g, "download/altver."),
    );
  }
}

function formateHeaderLine (a, b, c) {
  let output = "// @";
  while (a.length < 15) a += " ";
  output += a + " " + b;
  if (c !== undefined) output += " " + c;
  output += "\n";
  return output;
}
