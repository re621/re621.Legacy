RE:621
================

## e621, Reimagined

RE621 is a comprehensive project created to improve the basic user experience while browsing e621.net.
It consists of several different modules that enhance the entire site, top to bottom - literally.

## Installation

The project is delivered via a userscript. This means that you need a script manager, such as [Tampermonkey](https://www.tampermonkey.net/).

With a script manager installed, click on [this link](https://github.com/re621/re621.Legacy/releases/latest/download/script.user.js) and follow the instructions on the new page.

## Features

For a complete feature overview visit the projects website, found under [re621.bitwolfy.com](https://re621.bitwolfy.com/)

## Contributing

Contributions are always welcome.  
For bug reports, suggestions, and feature requests, head on over to the [issue tracker](https://github.com/re621/re621.Legacy/issues).

## Building the Script

Start by cloning the repo as normal.  
Run `npm i` to install dependencies, then run `npm run build:prod` to start the build process.

Build artifacts are placed in the `/build/` folder. This process produces both the userscript and the extension version.

For development purposes, you may also wish to create an injector userscript by running `npm run injector:chrome` or `npm run injector:firefox`, which references the local file, removing the need to reload the script. Note that the firefox version requires running a [TamperDAV server](https://github.com/Tampermonkey/tamperdav).
