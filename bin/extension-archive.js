const fs = require("fs"),
    archiver = require('archiver'),
    util = require("./util");

const package = JSON.parse(fs.readFileSync("./package.json"));

var output = fs.createWriteStream(util.parseTemplate("./build/extension/%NAME%.zip", package));
var archive = archiver('zip');

output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);
archive.directory('./build/extension/src/', false);
archive.finalize();
