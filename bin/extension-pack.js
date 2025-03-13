const fs = require("fs");
const ChromeExtension = require("crx");
const util = require("./util");

const packageJSON = JSON.parse(fs.readFileSync("./package.json"));

if (process.env.CRX_SECRET_KEY !== undefined) {
  fs.writeFileSync("./bin/extension-key.pem", process.env.CRX_SECRET_KEY);
}

const privateKey = fs.existsSync("./bin/extension-key.pem") ? fs.readFileSync("./bin/extension-key.pem") : undefined;

const crx = new ChromeExtension({
  privateKey: privateKey,
});

crx.load("./build/extension/src")
  .then(crx => crx.pack())
  .then(crxBuffer => {
    //    const updateXML = crx.generateUpdateXML()
    //    fs.writeFile('../update.xml', updateXML);
    fs.writeFileSync(util.parseTemplate("./build/extension/%NAME%.crx", packageJSON), crxBuffer);
  })
  .catch(err => {
    console.error(err);
  });
