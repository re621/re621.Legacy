// ==UserScript==
// @name         re621 - e621 Reimagined
// @namespace    bitwolfy.com
// @version      1.0.0
// @description  Increases the amount of customization on e621
// @author       bitWolfy
// @match        https://e621.net/*
// @match        https://e926.net/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js#sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=
// @require      https://cdnjs.cloudflare.com/ajax/libs/js-cookie/2.2.1/js.cookie.min.js#sha256-oE03O+I6Pzff4fiMqwEGHbdfcW7a3GRRxlL+U49L5sA=
// @require      https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js#sha256-KM512VNnjElC30ehFwehXjx1YCHPiQkOPmqnrWtpccM=
// @resource     re621_styles style.min.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Modal {
    constructor(config) {
        let _self = this;
        if (config.title == undefined)
            config.title = "Modal";
        if (config.width == undefined)
            config.title = "auto";
        if (config.height == undefined)
            config.height = "auto";
        if (config.position == undefined)
            config.position = {};
        if (config.subtabbed == undefined)
            config.subtabbed = false;
        if (config.triggerEvent == undefined)
            config.triggerEvent = "click";
        if (config.triggerMulti == undefined)
            config.triggerMulti = false;
        if (config.disabled == undefined)
            config.disabled = false;
        if (config.content == undefined)
            config.content = [];
        this.config = config;
        this.create();
        this.$activeTrigger = this.config.trigger;
        if (this.config.disabled)
            this.disable();
        this.registerTrigger(this.config.trigger);
    }
    create() {
        let _self = this;
        this.$modal = $("<re-modal>")
            .addClass("ui-draggable")
            .attr("data-open", "false")
            .css("width", this.config.width)
            .css("height", this.config.height);
        if (this.config.position.left != undefined)
            this.$modal.css("left", this.config.position.left);
        if (this.config.position.right != undefined)
            this.$modal.css("right", this.config.position.right);
        if (this.config.position.top != undefined)
            this.$modal.css("top", this.config.position.top);
        if (this.config.position.bottom != undefined)
            this.$modal.css("bottom", this.config.position.bottom);
        let $tabs = $("<re-modal-tabs>")
            .appendTo(this.$modal);
        let $header = $("<re-modal-header>")
            .addClass("bg-foreground")
            .appendTo(this.$modal);
        let $title = $("<div>")
            .addClass("re-modal-title")
            .html(this.config.title)
            .appendTo($header);
        let $closeButton = $("<a>")
            .attr("href", "#")
            .addClass("re-modal-close")
            .html(`<i class="fas fa-times"></i>`)
            .appendTo($header);
        $closeButton.click(function (event) {
            event.preventDefault();
            _self.toggle();
        });
        this.config.content.forEach(function (entry) {
            _self.addContent(entry);
        });
        let $tabList = $tabs.find("a");
        $tabList.first().click();
        if ($tabList.length == 1) {
            $tabs.css("display", "none");
        }
        $("re-modal-container").append(this.$modal);
        this.$modal.draggable({
            handle: "re-modal-header",
            containment: "parent",
            stack: "re-modal",
        });
        $(this.$modal).trigger("modal:create", [this]);
    }
    handleTriggerEvent(context, event) {
        if (context.isDisabled())
            return;
        let $target = $(event.currentTarget);
        if (context.config.triggerMulti && !context.$activeTrigger.is($target) && context.isVisible()) {
            context.toggle();
        }
        context.$activeTrigger = $target;
        event.preventDefault();
        context.toggle();
    }
    registerTrigger(element) {
        let context = this;
        element.on(this.config.triggerEvent, function (event) {
            context.handleTriggerEvent(context, event);
        });
    }
    toggle() {
        if (this.isVisible())
            this.setHidden();
        else
            this.setShown();
        $(this.$modal).trigger("modal:toggle", [this]);
    }
    isVisible() {
        return this.$modal.attr("data-open") == "true";
    }
    setShown() {
        this.$modal.attr("data-open", "true");
    }
    setHidden() {
        this.$modal.attr("data-open", "false");
    }
    isDisabled() {
        return this.config.disabled;
    }
    enable() {
        this.config.disabled = false;
        this.$activeTrigger = this.config.trigger;
    }
    disable() {
        this.config.disabled = true;
    }
    getModal() {
        return this.$modal;
    }
    getActiveTrigger() {
        return this.$activeTrigger;
    }
    addContent(content) {
        if (this.index == undefined)
            this.index = 0;
        let modalTabInput = $("<input>")
            .attr("name", this.config.uid)
            .attr("type", "radio")
            .attr("id", "tab-" + this.config.uid + "-" + this.index)
            .addClass("re-modal-tab-input")
            .appendTo(this.$modal);
        if (this.index == 0) {
            modalTabInput.attr("checked", "checked");
        }
        let modalTabLabel = $("<label>")
            .attr("for", "tab-" + this.config.uid + "-" + this.index)
            .addClass("re-modal-tab-label")
            .html(content.name)
            .appendTo(this.$modal);
        let modalTabContent = $("<div>")
            .addClass("re-modal-tab-content")
            .addClass("bg-highlight")
            .append(content.page)
            .appendTo(this.$modal);
        if (content.tabbable) {
            modalTabContent.addClass("subtabbed");
        }
        if (this.index == 0) {
            this.$modal.find("label.re-modal-tab-label").css("display", "none");
        }
        else {
            this.$modal.find("label.re-modal-tab-label").css("display", "");
        }
        this.index++;
    }
}
exports.Modal = Modal;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RE6Module {
    constructor() {
        this.prefix = this.constructor.name;
        this.settings = this.loadSettingsCookies();
    }
    fetchSettings(property) {
        if (property === undefined)
            return this.settings;
        return this.settings[property];
    }
    pushSettings(property, value) {
        this.settings[property] = value;
        this.saveSettingsCookies();
    }
    getDefaultSettings() {
        return {};
    }
    loadSettingsCookies() {
        let cookies = Cookies.get("re621." + this.prefix);
        if (cookies === undefined) {
            return this.getDefaultSettings();
        }
        else
            return JSON.parse(cookies);
    }
    saveSettingsCookies() {
        Cookies.set("re621." + this.prefix, JSON.stringify(this.settings));
    }
}
exports.RE6Module = RE6Module;

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Tabbed {
    constructor(config) {
        this.config = config;
    }
    create() {
        let _self = this;
        let $container = $("<re-tab-container>");
        let $tabGroup = $("<re-tab-group>");
        this.config.content.forEach(function (entry, index) {
            $("<input>")
                .attr("name", _self.config.name)
                .attr("type", "radio")
                .attr("id", "tab-" + _self.config.name + "-" + index)
                .addClass("re-tab-input")
                .appendTo($tabGroup);
            $("<label>")
                .attr("for", "tab-" + _self.config.name + "-" + index)
                .addClass("re-tab-label")
                .html(entry.name)
                .appendTo($tabGroup);
            $("<div>")
                .addClass("re-tab-panel")
                .html(entry.page.html())
                .appendTo($tabGroup);
        });
        $tabGroup.find("input").first().attr("checked", "checked");
        $container.append($tabGroup);
        return $container;
    }
}
exports.Tabbed = Tabbed;

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StructureUtilities_1 = require("./modules/StructureUtilities");
StructureUtilities_1.StructureUtilities.createDOM();
const SettingsController_1 = require("./modules/SettingsController");
SettingsController_1.SettingsController.getInstance();
const HeaderCustomizer_1 = require("./modules/HeaderCustomizer");
const ThemeCustomizer_1 = require("./modules/ThemeCustomizer");
const BlacklistToggler_1 = require("./modules/BlacklistToggler");
const FormattingHelper_1 = require("./modules/FormattingHelper");
HeaderCustomizer_1.HeaderCustomizer.getInstance();
ThemeCustomizer_1.ThemeCustomizer.getInstance();
BlacklistToggler_1.BlacklistToggler.getInstance();
FormattingHelper_1.FormattingHelper.getInstance();

},{"./modules/BlacklistToggler":5,"./modules/FormattingHelper":6,"./modules/HeaderCustomizer":7,"./modules/SettingsController":8,"./modules/StructureUtilities":9,"./modules/ThemeCustomizer":10}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BlacklistToggler {
    constructor() {
        let _self = this;
        this.$box = $("section#blacklist-box");
        let $toggleContainer = $("section#blacklist-box h1").html("");
        this.$toggle = $(`<a href="">Blacklisted</a>`)
            .attr("id", "blacklist-toggle")
            .appendTo($toggleContainer);
        $("<span>")
            .addClass("blacklist-help")
            .html(`<a href="/help/blacklist" data-ytta-id="-">(filter help)</a>`)
            .appendTo($toggleContainer);
        let $disableAllButton = $("#disable-all-blacklists").text("Disable all filters");
        let $enableAllbutton = $("#re-enable-all-blacklists").text("Enable all filters");
        if ($enableAllbutton.css("display") === "none") {
            this.hide();
        }
        else {
            this.show();
        }
        $("a#blacklist-toggle").click(function (e) {
            e.preventDefault();
            _self.toggleList();
        });
        $disableAllButton.click(function (e) {
            _self.show();
        });
    }
    toggleList() {
        if (this.isVisible()) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    isVisible() {
        return this.$box.attr("data-blacklist-hidden") == "false";
    }
    hide() {
        this.$box.attr("data-blacklist-hidden", "true");
    }
    show() {
        this.$box.attr("data-blacklist-hidden", "false");
    }
    static getInstance() {
        if (this.instance === undefined)
            this.instance = new BlacklistToggler();
        return this.instance;
    }
}
exports.BlacklistToggler = BlacklistToggler;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FormattingHelper {
    constructor() {
        this.createDOM();
    }
    static getInstance() {
        if (this.instance == undefined)
            this.instance = new FormattingHelper();
        return this.instance;
    }
    createDOM() {
        let $container = $("div.dtext-previewable:has(textarea)");
        $container.css("background", "green");
    }
}
exports.FormattingHelper = FormattingHelper;
FormattingHelper.instance = new FormattingHelper();

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Modal_1 = require("../components/Modal");
const RE6Module_1 = require("../components/RE6Module");
class HeaderCustomizer extends RE6Module_1.RE6Module {
    constructor() {
        super();
        let _self = this;
        this.$menu = $("menu.main");
        this.createDOM();
        $("#re621-addtab").submit(function (event) {
            event.preventDefault();
            _self.handleNewTabEvent();
        });
        $("#re621-updatetab").submit(function (event) {
            event.preventDefault();
            _self.handleUpdateEvent();
        });
        $("#re621-updatetab-delete").click(function (event) {
            event.preventDefault();
            _self.handleDeleteEvent();
        });
        this.addTabModal.getModal().on("modal:toggle", function (event, modal) {
            if (_self.addTabModal.isVisible()) {
                _self.enableEditingMode();
            }
            else {
                _self.disableEditingMode();
            }
        });
    }
    static getInstance() {
        if (this.instance == undefined)
            this.instance = new HeaderCustomizer();
        return this.instance;
    }
    getDefaultSettings() {
        let def_settings = {
            tabs: [
                { name: "Account", href: "/users/home" },
                { name: "Posts", href: "/posts" },
                { name: "Comments", href: "/comments?group_by=post" },
                { name: "Artists", href: "/artists" },
                { name: "Tags", href: "/tags" },
                { name: "Blips", href: "/blips" },
                { name: "Pools", href: "/pools" },
                { name: "Sets", href: "/post_sets" },
                { name: "Wiki", href: "/wiki_pages?title=help%3Ahome" },
                { name: "Forum", href: "/forum_topics" },
                { name: "Discord", href: "/static/discord" },
                { name: "Help", href: "/help" },
                { name: "More »", href: "/static/site_map" },
            ]
        };
        return def_settings;
    }
    createDOM() {
        this.$menu.html("");
        this.fetchSettings("tabs").forEach(function (value) {
            HeaderCustomizer.createTab({
                name: value.name,
                href: value.href,
                controls: true,
            });
        });
        this.$menu.sortable({
            axis: "x",
            containment: "parent",
            helper: "clone",
            forceHelperSize: true,
            opacity: 0.75,
            cursor: "grabbing",
            disabled: true,
            update: HeaderCustomizer.handleUpdate,
        });
        let addTabButton = HeaderCustomizer.createTab({
            name: `<i class="fas fa-tasks"></i>`,
            parent: "menu.extra",
            class: "float-left",
        });
        let $addTabForm = $(`<form id="re621-addtab" class="grid-form">`);
        $(`<label for="re621-addtab-name">Name:</label>`).appendTo($addTabForm);
        $(`<input id="re621-addtab-name">`).appendTo($addTabForm);
        $(`<label for="re621-addtab-link">Link:</label>`).appendTo($addTabForm);
        $(`<input id="re621-addtab-link">`).appendTo($addTabForm);
        $(`<button type="submit" class="full-width">Add Tab</button>`).appendTo($addTabForm);
        this.addTabModal = new Modal_1.Modal({
            uid: "header-addtab-modal",
            title: "Add Tab",
            width: "17rem",
            height: "auto",
            position: {
                right: "0",
                top: "4.5rem",
            },
            trigger: addTabButton.link,
            content: [{ name: "re621", page: $addTabForm }],
        });
        let $updateTabForm = $(`<form id="re621-updatetab" class="grid-form">`);
        $(`<label for="re621-updatetab-name">Name:</label>`).appendTo($updateTabForm);
        $(`<input id="re621-updatetab-name">`).appendTo($updateTabForm);
        $(`<label for="re621-updatetab-link">Link:</label>`).appendTo($updateTabForm);
        $(`<input id="re621-updatetab-link">`).appendTo($updateTabForm);
        $(`<button id="re621-updatetab-delete" type="button">Delete</button>`).appendTo($updateTabForm);
        $(`<button id="re621-updatetab-submit" type="submit">Update</button>`).appendTo($updateTabForm);
        this.updateModal = new Modal_1.Modal({
            uid: "header-updatetab-modal",
            title: "Update Tab",
            width: "17rem",
            height: "auto",
            position: {
                right: "18rem",
                top: "4.5rem",
            },
            trigger: $("menu.main li a"),
            triggerMulti: true,
            disabled: true,
            content: [{ name: "re621", page: $updateTabForm }],
        });
    }
    handleNewTabEvent() {
        let tabNameInput = $("#re621-addtab-name");
        let tabHrefInput = $("#re621-addtab-link");
        let newTab = HeaderCustomizer.createTab({
            name: tabNameInput.val() + "",
            href: tabHrefInput.val() + "",
            controls: true,
        }, true);
        this.updateModal.registerTrigger(newTab.link);
        tabNameInput.val("");
        tabHrefInput.val("");
    }
    handleUpdateEvent() {
        let tabName = $("#re621-updatetab-name").val() + "";
        let tabHref = $("#re621-updatetab-link").val() + "";
        this.updateModal.getActiveTrigger()
            .attr("href", tabHref)
            .text(tabName);
        HeaderCustomizer.handleUpdate();
        this.updateModal.setHidden();
    }
    handleDeleteEvent() {
        this.updateModal.getActiveTrigger().parent().remove();
        HeaderCustomizer.handleUpdate();
        this.updateModal.setHidden();
    }
    enableEditingMode() {
        let _self = this;
        this.$menu.attr("data-editing", "true");
        this.$menu.sortable("enable");
        this.updateModal.enable();
        this.updateModal.getModal().on("modal:toggle", function (event, modal) {
            let $trigger = _self.updateModal.getActiveTrigger();
            $("#re621-updatetab-name").val($trigger.text());
            $("#re621-updatetab-link").val($trigger.attr("href"));
        });
    }
    disableEditingMode() {
        this.$menu.attr("data-editing", "false");
        this.$menu.sortable("disable");
        this.updateModal.setHidden();
        this.updateModal.disable();
    }
    static createTab(config, triggerUpdate) {
        if (config.name === undefined)
            config.name = "New Tab";
        if (config.href === undefined)
            config.href = "#";
        if (config.class === undefined)
            config.class = "";
        if (config.parent === undefined)
            config.parent = "menu.main";
        if (config.controls === undefined)
            config.controls = false;
        if (triggerUpdate === undefined)
            triggerUpdate = false;
        let $tab = $(`<li>`).appendTo($(config.parent));
        let $link = $(`<a href="` + config.href + `">` + config.name + "</a>").appendTo($tab);
        if (config.controls) {
            $tab.addClass("configurable");
        }
        if (config.class) {
            $tab.addClass(config.class);
        }
        if (triggerUpdate) {
            HeaderCustomizer.handleUpdate();
        }
        return { tab: $tab, link: $link };
    }
    static handleUpdate() {
        let tabs = $("menu.main").find("li > a");
        let tabData = [];
        tabs.each(function (index, element) {
            let $link = $(element);
            tabData.push({
                name: $link.text(),
                href: $link.attr("href")
            });
        });
        HeaderCustomizer.getInstance().pushSettings("tabs", tabData);
    }
}
exports.HeaderCustomizer = HeaderCustomizer;
HeaderCustomizer.instance = new HeaderCustomizer();

},{"../components/Modal":1,"../components/RE6Module":2}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HeaderCustomizer_1 = require("./HeaderCustomizer");
const Modal_1 = require("../components/Modal");
const Tabbed_1 = require("../components/Tabbed");
class SettingsController {
    constructor() {
        let addSettingsButton = HeaderCustomizer_1.HeaderCustomizer.createTab({
            name: `<i class="fas fa-wrench"></i>`,
            parent: "menu.extra",
            class: "float-right"
        });
        let $commonSettings = $("<div>");
        $commonSettings.append(`... Coming Soon`);
        let $headerSettings = $("<div>");
        $headerSettings.append(`... Coming Soon`);
        let $postSettings = $("<div>");
        $postSettings.append(`... Coming Soon`);
        let $settings = new Tabbed_1.Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Common", page: $commonSettings },
                { name: "Header", page: $headerSettings },
                { name: "Posts", page: $postSettings },
            ]
        });
        this.modal = new Modal_1.Modal({
            uid: "settings-modal",
            title: "Settings",
            width: "30rem",
            height: "200px",
            position: {
                right: "0",
                top: "4.5rem",
            },
            subtabbed: true,
            trigger: addSettingsButton.link,
            content: [{ name: "re621", page: $settings.create(), tabbable: true }],
        });
    }
    static getInstance() {
        if (this.instance == undefined)
            this.instance = new SettingsController();
        return this.instance;
    }
    static addPage(page) {
    }
}
exports.SettingsController = SettingsController;

},{"../components/Modal":1,"../components/Tabbed":3,"./HeaderCustomizer":7}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StructureUtilities {
    static createDOM() {
        GM_addStyle(GM_getResourceText("re621_styles"));
        let $menuContainer = $("nav#nav");
        let $menuMain = $("menu.main");
        let $menuLogo = $("<menu>").addClass("logo desktop-only").html(`<a href="/" data-ytta-id="-">e621</a>`);
        $menuContainer.prepend($menuLogo);
        let $menuExtra = $("<menu>").addClass("extra");
        $menuMain.after($menuExtra);
        $("menu:last-child").addClass("submenu");
        let $modalContainer = $("<re-modal-container>").prependTo("body");
    }
}
exports.StructureUtilities = StructureUtilities;

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HeaderCustomizer_1 = require("./HeaderCustomizer");
const Modal_1 = require("../components/Modal");
const RE6Module_1 = require("../components/RE6Module");
const THEME_MAIN = [
    { value: "hexagon", name: "Hexagon" },
    { value: "pony", name: "Pony" },
    { value: "bloodlust", name: "Bloodlust" },
    { value: "serpent", name: "Serpent" },
    { value: "hotdog", name: "Hotdog" },
];
const THEME_EXTRA = [
    { value: "none", name: "None" },
    { value: "autumn", name: "Autumn" },
    { value: "winter", name: "Winter" },
    { value: "spring", name: "Spring" },
    { value: "aurora", name: "Aurora" },
    { value: "hexagons", name: "Hexagons" },
    { value: "space", name: "Space" },
    { value: "stars", name: "Stars" },
];
class ThemeCustomizer extends RE6Module_1.RE6Module {
    constructor() {
        super();
        this.createDOM();
        this.handleThemeSwitcher("th-main", "hexagon");
        this.handleThemeSwitcher("th-extra", "hexagon");
        this.handleScalingToggle();
    }
    static getInstance() {
        if (this.instance == undefined)
            this.instance = new ThemeCustomizer();
        return this.instance;
    }
    getDefaultSettings() {
        return {
            "th-main": "hexagon",
            "th-extra": "hexagons",
            "unscaling": false,
        };
    }
    createDOM() {
        let addTabButton = HeaderCustomizer_1.HeaderCustomizer.createTab({
            name: `<i class="fas fa-paint-brush"></i>`,
            parent: "menu.extra",
        });
        let $themeCustomizerContainer = $("<div>");
        let $themeCustomizer = $("<form>")
            .addClass("grid-form")
            .appendTo($themeCustomizerContainer);
        $("<div>")
            .html("Theme:")
            .appendTo($themeCustomizer);
        let $themeSelector = $("<select>")
            .attr("id", "th-main-selector")
            .appendTo($themeCustomizer);
        THEME_MAIN.forEach(function (entry) {
            $("<option>").val(entry.value).text(entry.name).appendTo($themeSelector);
        });
        $("<div>")
            .html("Extras:")
            .appendTo($themeCustomizer);
        let $extraSelector = $("<select>")
            .attr("id", "th-extra-selector")
            .appendTo($themeCustomizer);
        THEME_EXTRA.forEach(function (entry) {
            $("<option>").val(entry.value).text(entry.name).appendTo($extraSelector);
        });
        let $scalingSelector = $("<div>").addClass("full-width").appendTo($themeCustomizer);
        $("<input>")
            .attr("type", "checkbox")
            .attr("id", "theme-scaling")
            .attr("name", "theme-scaling")
            .css("float", "right")
            .appendTo($scalingSelector);
        $("<label>")
            .attr("for", "theme-scaling")
            .css("font-weight", "500")
            .text("Disable Scaling")
            .appendTo($scalingSelector);
        this.modal = new Modal_1.Modal({
            uid: "theme-customizer-modal",
            title: "Themes",
            width: "15rem",
            height: "auto",
            position: {
                right: "0",
                top: "4.5rem",
            },
            trigger: addTabButton.link,
            content: [{ name: "re621", page: $themeCustomizerContainer }],
        });
    }
    handleThemeSwitcher(selector, default_option) {
        let _self = this;
        let theme = this.fetchSettings(selector);
        $("body").attr("data-" + selector, theme);
        $("#" + selector + "-selector").val(theme);
        $("#" + selector + "-selector").change(function (e) {
            let theme = $(this).val() + "";
            _self.pushSettings(selector, theme);
            $("body").attr("data-" + selector, theme);
        });
    }
    handleScalingToggle() {
        let _self = this;
        let unscaling = this.fetchSettings("unscaling");
        if (unscaling) {
            $("body").css("max-width", "unset");
        }
        $("#theme-scaling").prop("checked", unscaling);
        $("re-modal-container").on("change", "#theme-scaling", function (e) {
            let disable_scaling = $(this).is(":checked");
            _self.pushSettings("unscaling", disable_scaling);
            if (disable_scaling) {
                $("body").css("max-width", "unset");
            }
            else {
                $("body").css("max-width", "");
            }
        });
    }
}
exports.ThemeCustomizer = ThemeCustomizer;

},{"../components/Modal":1,"../components/RE6Module":2,"./HeaderCustomizer":7}]},{},[4]);
