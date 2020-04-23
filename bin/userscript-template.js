// ==UserScript==
// @name         %DISPLAYNAME%
// @namespace    %NAMESPACE%
// @version      %VERSION%
// @description  %DESCRIPTION%
// @author       %AUTHOR%
// @match        https://e621.net/*
// @match        https://e926.net/*
// @updateURL    https://github.com/re621/re621/releases/latest/download/script.user.js
// @downloadURL  https://github.com/re621/re621/releases/latest/download/script.user.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js#sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=
// @require      https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js#sha256-KM512VNnjElC30ehFwehXjx1YCHPiQkOPmqnrWtpccM=
// @require      https://raw.githubusercontent.com/aFarkas/lazysizes/5.2.0/lazysizes.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.3.0/jszip.min.js
// @require      https://cdn.jsdelivr.net/npm/jquery.hotkeys@0.1.0/jquery.hotkeys.min.js
// @require      https://cdn.jsdelivr.net/npm/file-saver@2.0.2/dist/FileSaver.min.js
// @resource     re621_styles https://github.com/re621/re621/releases/download/%VERSION%/style.min.css
// @resource     re621_dnp https://cdn.jsdelivr.net/gh/re621/re621@master/dist/avoid-posting.json
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @icon64       https://re621.github.io/images/icon.png
// @connect      api.github.com
// @connect      static1.e621.net
// ==/UserScript==

/**
 * This is a minified build. To see the source visit the projects github page
 */

window.re621 = new function() {
    this.name = "%NAME%";
    this.displayName = "%DISPLAYNAME%";
    this.version = "%VERSION%";
    this.build = "%BUILD%";
    this.repo = "re621/re621";
    this.links = {
        website: "https://re621.github.io/",
        repository: "https://github.com/" + this.repo + "/",
        issues: "https://github.com/" + this.repo + "/issues/",
        releases: "https://github.com/" + this.repo + "/releases",
        forum: "https://e621.net/forum_topics/25872",
    };
    this.useragent = "%NAME%/1.0 userscript " + this.links.website;
    this.debug = true;
    this.toString = function() { return this.name + " v." + this.version + " (" + this.build + ")"; };
};
