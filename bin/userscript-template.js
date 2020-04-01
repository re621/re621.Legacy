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
// @require      https://cdn.jsdelivr.net/npm/jquery.hotkeys@0.1.0/jquery.hotkeys.min.js
// @resource     re621_styles https://github.com/re621/re621/releases/download/%VERSION%/style.min.css
// @resource     re621_dnp https://github.com/re621/re621/releases/download/%VERSION%/avoid-posting.json
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_download
// ==/UserScript==

window.re621 = {
    name: "%NAME%",
    displayName: "%DISPLAYNAME%",
    version: "%VERSION%",
    build: "%BUILD%",
    repo: "re621/re621",
    links: {
        website: "https://re621.github.io/",
        repository: "https://github.com/" + this.repo + "/",
        issues: "https://github.com/" + this.repo + "/issues/",
        releases: "https://github.com/" + this.repo + "/releases",
        forum: "https://e621.net/forum_topics/25872",
    },
    debug: true,
    toString: function() { return this.name + " v." + this.version + " (" + this.build + ")"; }
};
