import { E621 } from "../../components/api/E621";
import { APIForumPost } from "../../components/api/responses/APIForumPost";
import { XM } from "../../components/api/XM";
import { Hotkeys } from "../../components/data/Hotkeys";
import { User } from "../../components/data/User";
import { Debug, Patcher } from "../../components/ErrorHandler";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Form, FormElement } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Tabbed } from "../../components/structure/Tabbed";
import { Util } from "../../components/structure/Util";
import { FavDownloader } from "../downloader/FavDownloader";
import { MassDownloader } from "../downloader/MassDownloader";
import { PoolDownloader } from "../downloader/PoolDownloader";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { ImageScaler } from "../post/ImageScaler";
import { PoolNavigator } from "../post/PoolNavigator";
import { PostViewer } from "../post/PostViewer";
import { TitleCustomizer } from "../post/TitleCustomizer";
import { BlacklistEnhancer } from "../search/BlacklistEnhancer";
import { CustomFlagger, FlagDefinition } from "../search/CustomFlagger";
import { InfiniteScroll } from "../search/InfiniteScroll";
import { SearchUtilities } from "../search/SearchUtilities";
import { ThumbnailClickAction, ThumbnailEnhancer, ThumbnailPerformanceMode } from "../search/ThumbnailsEnhancer";
import { ForumTracker } from "../subscriptions/ForumTracker";
import { PoolTracker } from "../subscriptions/PoolTracker";
import { SubscriptionManager } from "../subscriptions/SubscriptionManager";
import { HeaderCustomizer } from "./HeaderCustomizer";
import { Miscellaneous } from "./Miscellaneous";

/**
 * SettingsController  
 * Interface for accessing and changing project settings
 */
export class SettingsController extends RE6Module {

    public constructor() {
        super();
        this.registerHotkeys(
            { keys: "hotkeyOpenSettings", fnct: this.openSettings },
        );
    }

    public create(): void {

        // Create a button in the header
        const openSettingsButton = DomUtilities.addSettingsButton({
            id: "header-button-settings",
            name: `<i class="fas fa-wrench"></i>`,
            title: "Settings",
            tabClass: "float-right",
        });

        // Establish the settings window contents
        const $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "Features", page: this.createFeaturesTab().get() },
                { name: "General", page: this.createGeneralTab().get() },
                { name: "Downloads", page: this.createDownloadsTab().get() },
                { name: "Custom Flags", page: this.createFlagsTab().get() },
                { name: "Hotkeys", page: this.createHotkeysTab().get() },
                { name: "Other", page: this.createMiscTab().get() },
                { name: "About", page: this.createAboutTab().get() },
            ]
        });

        // Create the modal
        new Modal({
            title: "Settings",
            triggers: [{ element: openSettingsButton }],
            escapable: false,
            fixed: true,
            reserveHeight: true,
            content: $settings.create(),
            position: { my: "center", at: "center" }
        });

        // Start up the version checker
        if (new Date().getTime() - (1000 * 60 * 60) > this.fetchSettings("lastVersionCheck")) {

            const releases = { latest: null, current: null };
            (async (): Promise<void> => {
                releases.latest = JSON.parse(await Util.userscriptRequest("https://api.github.com/repos/re621/re621/releases/latest"));
                releases.current = JSON.parse(await Util.userscriptRequest("https://api.github.com/repos/re621/re621/releases/tags/" + window["re621"]["version"]));
                this.pushSettings("newVersionAvailable", releases.latest.name !== releases.current.name);
                this.pushSettings("lastVersionCheck", new Date().getTime());
                this.pushSettings("changelog", releases.current.body);

                $("div#changelog-list").html(Util.quickParseMarkdown(releases.current.body));
                $("#project-update-button").attr("data-available", (releases.latest.name !== releases.current.name) + "");
            })();
        }
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,

            hotkeyOpenSettings: "",

            newVersionAvailable: false,
            lastVersionCheck: 0,
            changelog: "",
        };
    }

    /** Creates the script features tab */
    private createFeaturesTab(): Form {
        const modules = ModuleController.getAll();

        function createInput(moduleName: string, label: string): FormElement {
            const module = modules.get(moduleName);
            return Form.checkbox(
                moduleName + "-enabled", module.fetchSettings("enabled"), label, "column",
                (event, data) => {
                    module.pushSettings("enabled", data);
                    module.setEnabled(data);
                    if (data === true) {
                        if (module.canInitialize()) module.create();
                    } else module.destroy();
                }
            );
        }

        return new Form({ id: "settings-module-status", columns: 3, parent: "div#modal-container", }, [
            Form.header("Features"),

            createInput("HeaderCustomizer", "Header Customizer"),
            Form.div("Add, delete, and customize header links to your heart's content", "mid"),

            createInput("InfiniteScroll", "Infinite Scroll"),
            Form.div("New posts are automatically loaded. No need to turn pages", "mid"),

            createInput("InstantSearch", "Instant Filters"),
            Form.div("Quickly add filters to your current search, with no need for a page reload", "mid"),

            createInput("FormattingManager", "Formatting Helper"),
            Form.div("Fully customizable toolbar for easy DText formatting and post templates", "mid"),

            createInput("TinyAlias", "Tiny Alias"),
            Form.div("A more intelligent way to quickly fill out post tags", "mid"),
        ]);
    }

    /** Creates the general settings tab */
    private createGeneralTab(): Form {
        const titleCustomizer = ModuleController.get(TitleCustomizer),
            miscellaneous = ModuleController.get(Miscellaneous),
            postViewer = ModuleController.get(PostViewer),
            blacklistEnhancer = ModuleController.get(BlacklistEnhancer),
            imageScaler = ModuleController.get(ImageScaler),
            infiniteScroll = ModuleController.get(InfiniteScroll),
            thumbnailEnhancer = ModuleController.get(ThumbnailEnhancer),
            headerCustomizer = ModuleController.get(HeaderCustomizer),
            searchUtilities = ModuleController.get(SearchUtilities);

        return new Form({ id: "settings-general", columns: 3, parent: "div#modal-container" }, [

            // General
            Form.section({ id: "general", columns: 3 }, [
                Form.header("General", "column"),
                Form.div(`<div class="notice text-right">Settings are saved and applied automatically.</div>`, "mid"),

                // TitleCustomizer
                Form.section({ id: "title", columns: 3 }, [
                    Form.input(
                        "template", titleCustomizer.fetchSettings("template"), "Page Title", "full", undefined,
                        async (event, data) => {
                            await titleCustomizer.pushSettings("template", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.section({ id: "template-vars-title", columns: 2, }, [
                        Form.div(`<div class="notice unmargin">The following variables can be used:</div>`, "mid"),
                        Form.copy("postnum", "%postid%", "Post ID"),
                        Form.copy("author", "%artist%", "Artist"),
                        Form.copy("copyright", "%copyright%", "Copyright"),
                        Form.copy("characters", "%character%", "Characters"),
                        Form.copy("species", "%species%", "Species"),
                        Form.copy("meta", "%meta%", "Meta"),
                    ], " "),

                    Form.checkbox(
                        "symbol-enabled", titleCustomizer.fetchSettings("symbolsEnabled"), "Vote / Favorite Icons", "column",
                        async (event, data) => {
                            await titleCustomizer.pushSettings("symbolsEnabled", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.spacer("mid"),
                    Form.input("symbol-fav", titleCustomizer.fetchSettings("symbolFav"), "Favorite", "column", undefined,
                        async (event, data) => {
                            await titleCustomizer.pushSettings("symbolFav", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.input("symbol-voteup", titleCustomizer.fetchSettings("symbolVoteUp"), "Upvoted", "column", undefined,
                        async (event, data) => {
                            await titleCustomizer.pushSettings("symbolVoteUp", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.input("symbol-votedown", titleCustomizer.fetchSettings("symbolVoteDown"), "Downvoted", "column", undefined,
                        async (event, data) => {
                            await titleCustomizer.pushSettings("symbolVoteDown", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                ]),

                Form.checkbox("improve-tagcount", searchUtilities.fetchSettings("improveTagCount"), "Expanded Tag Count", "column",
                    async (event, data) => {
                        await searchUtilities.pushSettings("improveTagCount", data);
                        searchUtilities.improveTagCount(data);
                    }
                ),
                Form.checkbox("shorten-tagnames", searchUtilities.fetchSettings("shortenTagNames"), "Shorten Tag Names", "column",
                    async (event, data) => {
                        await searchUtilities.pushSettings("shortenTagNames", data);
                        searchUtilities.shortenTagNames(data);
                    }
                ),
                Form.spacer("column"),

                Form.checkbox("sticky-header", miscellaneous.fetchSettings("stickyHeader"), "Fixed Header", "column",
                    async (event, data) => {
                        await miscellaneous.pushSettings("stickyHeader", data);
                        miscellaneous.createStickyHeader(data);
                    }
                ),
                Form.checkbox("sticky-searchbox", miscellaneous.fetchSettings("stickySearchbox"), "Fixed Searchbox", "column",
                    async (event, data) => {
                        await miscellaneous.pushSettings("stickySearchbox", data);
                        miscellaneous.createStickySearchbox(data);
                    }
                ),
                Form.spacer("column"),

                Form.hr(),
            ]),

            // ThumbnailEnhancer
            Form.section({ id: "thumb", columns: 3 }, [
                Form.header("Thumbnails"),
                Form.select(
                    "upscale", thumbnailEnhancer.fetchSettings("upscale"), "Upscale",
                    [
                        { value: ThumbnailPerformanceMode.Disabled, name: "Disabled" },
                        { value: ThumbnailPerformanceMode.Hover, name: "On Hover" },
                        { value: ThumbnailPerformanceMode.Always, name: "Always" },
                    ],
                    "column",
                    async (event, data) => {
                        await thumbnailEnhancer.pushSettings("upscale", data);
                    }
                ),
                Form.div("Replace 150x150 blurry thumbnails with larger versions", "mid"),
                Form.spacer(),
                Form.div(`<div class="unmargin"><b>Requires a page reload</b></div>`, "mid"),

                Form.subsection({ id: "advanced", columns: 3 }, "Advanced", [
                    Form.checkbox("zoom", thumbnailEnhancer.fetchSettings("zoom"), "Enlarge on Hover", "column",
                        async (event, data) => {
                            await thumbnailEnhancer.pushSettings("zoom", data);
                            thumbnailEnhancer.toggleHoverZoom(data);
                        }
                    ),
                    Form.div("Increases the size of the thumbnail when hovering over it", "mid"),

                    Form.input("zoom-scale", thumbnailEnhancer.fetchSettings("zoomScale"), "Zoom scale", "column", { pattern: "^[1-9](\\.\\d+)?$" },
                        async (event, data) => {
                            if (!(event.target as HTMLInputElement).checkValidity()) return;
                            await thumbnailEnhancer.pushSettings("zoomScale", data);
                            thumbnailEnhancer.setZoomScale(data);
                        }
                    ),
                    Form.div("The ratio of the enlarged thumbnail to its original size", "mid"),

                    Form.checkbox("zoom-contextual", thumbnailEnhancer.fetchSettings("zoomContextual"), "Contextual Scaling", "column",
                        async (event, data) => {
                            await thumbnailEnhancer.pushSettings("zoomContextual", data);
                            thumbnailEnhancer.toggleZoomContextual(data);
                        }
                    ),
                    Form.div("Only enable thumbnail scaling in the viewing mode", "mid"),

                    Form.spacer("full"),


                    Form.checkbox("vote", thumbnailEnhancer.fetchSettings("vote"), "Voting Buttons", "column",
                        async (event, data) => {
                            await thumbnailEnhancer.pushSettings("vote", data);
                            thumbnailEnhancer.toggleHoverVote(data);
                        }
                    ),
                    Form.div("Adds voting buttons when hovering over a thumbnail", "mid"),

                    Form.spacer("full"),


                    Form.checkbox("crop", thumbnailEnhancer.fetchSettings("crop"), "Resize Images", "column",
                        async (event, data) => {
                            await thumbnailEnhancer.pushSettings("crop", data);
                            thumbnailEnhancer.toggleThumbCrop(data);
                        }
                    ),
                    Form.div("Resize thumbnail images according to settings below", "mid"),

                    Form.input("crop-size", thumbnailEnhancer.fetchSettings("cropSize"), "Thumbnail Size", "column", { pattern: "^\\d{2,3}(px|rem|em)$" },
                        async (event, data) => {
                            if (!(event.target as HTMLInputElement).checkValidity()) return;
                            await thumbnailEnhancer.pushSettings("cropSize", data);
                            thumbnailEnhancer.setThumbSize(data);
                        }
                    ),
                    Form.div("Thumbnail width, in px, em, or rem", "mid"),

                    Form.input("crop-ratio", thumbnailEnhancer.fetchSettings("cropRatio"), "Image Ratio", "column", { pattern: "^(([01](\\.\\d+)?)|2)$" },
                        async (event, data) => {
                            if (!(event.target as HTMLInputElement).checkValidity()) return;
                            await thumbnailEnhancer.pushSettings("cropRatio", data);
                            thumbnailEnhancer.setThumbRatio(data);
                        }
                    ),
                    Form.div("Height to width ratio of the image", "mid"),

                    Form.spacer("full"),


                    Form.checkbox("state-ribbons", thumbnailEnhancer.fetchSettings("ribbons"), "Status Ribbons", "column",
                        async (event, data) => {
                            await thumbnailEnhancer.pushSettings("ribbons", data);
                            if (thumbnailEnhancer.isInitialized()) thumbnailEnhancer.toggleStatusRibbons(data);

                            $("input#advanced-state-relations").prop("disabled", !data);
                            $("input#advanced-state-relations").parent().toggleClass("input-disabled", !data);
                            $("div#advanced-state-ribbons-text").parent().toggleClass("input-disabled", !data);
                        }
                    ),
                    Form.div("Use corner ribbons instead of colored borders for flags", "mid"),

                    Form.checkbox(
                        "state-relations", thumbnailEnhancer.fetchSettings("relRibbons"), "Relations Ribbons", "column",
                        async (event, data) => {
                            await thumbnailEnhancer.pushSettings("relRibbons", data);
                            if (thumbnailEnhancer.isInitialized()) thumbnailEnhancer.toggleRelationRibbons(data);
                        },
                        (thumbnailEnhancer.fetchSettings("ribbons") ? undefined : "input-disabled")
                    ),
                    Form.div(
                        "Display ribbons for parent/child relationships",
                        "mid", undefined, "state-ribbons-text",
                        (thumbnailEnhancer.fetchSettings("ribbons") ? undefined : "input-disabled")
                    ),
                ]),


                Form.select(
                    "click-action", thumbnailEnhancer.fetchSettings("clickAction"), "Double Click Action",
                    [
                        { value: ThumbnailClickAction.Disabled, name: "Disabled" },
                        { value: ThumbnailClickAction.NewTab, name: "Open New Tab" },
                        { value: ThumbnailClickAction.CopyID, name: "Copy Post ID" },
                    ],
                    "column",
                    async (event, data) => {
                        await thumbnailEnhancer.pushSettings("clickAction", data);
                    }
                ),
                Form.div("Action taken when a thumbnail is double-clicked", "mid"),
                Form.spacer(),
                Form.div(`<div class="unmargin"><b>Requires a page reload</b></div>`, "mid"),


                Form.hr(),
            ]),

            // Infinite Scroll
            Form.section({ id: "infscroll", columns: 3 }, [
                Form.header("Infinite Scroll"),
                Form.checkbox(
                    "votefavorite", infiniteScroll.fetchSettings("keepHistory"), "Preserve history", "column",
                    async (event, data) => { await infiniteScroll.pushSettings("keepHistory", data); }
                ),
                Form.div(`If enabled, will load all result pages up to the current one.`, "mid"),

                Form.spacer("column"),
                Form.div(`<div class="unmargin"><b>Requires a page reload</b></div>`, "mid"),

                Form.hr(),
            ]),

            // Actions
            Form.section({ id: "actions", columns: 3 }, [
                Form.header("Miscellaneous"),

                Form.checkbox(
                    "votefavorite", postViewer.fetchSettings("upvoteOnFavorite"), "Auto-upvote favorites", "column",
                    async (event, data) => { await postViewer.pushSettings("upvoteOnFavorite", data); }
                ),
                Form.checkbox(
                    "click-scale", imageScaler.fetchSettings("clickScale"), "Click images to resize them", "column",
                    async (event, data) => { await imageScaler.pushSettings("clickScale", data); }),

                Form.checkbox(
                    "collapse-tag-cats", searchUtilities.fetchSettings("collapseCategories"), "Collapse tag categories", "column",
                    async (event, data) => { await searchUtilities.pushSettings("collapseCategories", data); }
                ),

                Form.checkbox(
                    "quickadd", blacklistEnhancer.fetchSettings("quickaddTags"), "Click X to add tag to blacklist", "column",
                    async (event, data) => { await blacklistEnhancer.pushSettings("quickaddTags", data); }),
                Form.spacer("mid"),

                Form.checkbox(
                    "forumUpdateDot", headerCustomizer.fetchSettings("forumUpdateDot"), "Header forum notifications", "column",
                    async (event, data) => { await headerCustomizer.pushSettings("forumUpdateDot", data); }),
                Form.div("Red dot on the Forum tab in the header if there are new posts", "mid"),

                Form.spacer("column"),
                Form.div(`<div class="unmargin"><b>Requires page update</b></div>`, "mid"),

            ]),

        ]);
    }

    /** Creates the downloads settings tab */
    private createDownloadsTab(): Form {
        const downloadCustomizer = ModuleController.get(DownloadCustomizer),
            massDownloader = ModuleController.get(MassDownloader),
            poolDownloader = ModuleController.get(PoolDownloader),
            favDownloader = ModuleController.get(FavDownloader);

        return new Form({ id: "settings-download", columns: 3, parent: "div#modal-container" }, [

            // Download Customizer
            Form.section({ id: "customizer", columns: 3 }, [
                Form.header("Download Customizer", "column"),
                Form.div(`<div class="notice float-right">Download individual files</div>`, "mid"),
                Form.input(
                    "template", downloadCustomizer.fetchSettings("template"), "Download File Name", "full", undefined,
                    async (event, data) => {
                        await downloadCustomizer.pushSettings("template", data);
                        if (downloadCustomizer.isInitialized()) downloadCustomizer.refreshDownloadLink();
                    }
                ),
                Form.section({ id: "template-vars-cust", columns: 2 }, [
                    Form.div(`<div class="notice unmargin">The following variables can be used:</div>`, "mid"),
                    Form.copy("postid", "%postid%", "Post ID"),
                    Form.copy("artist", "%artist%", "Artist"),
                    Form.copy("copyright", "%copyright%", "Copyright"),
                    Form.copy("character", "%character%", "Characters"),
                    Form.copy("species", "%species%", "Species"),
                    Form.copy("meta", "%meta%", "Meta"),
                ], " "),
                Form.hr(),
            ]),

            // Mass Downloader
            Form.section({ id: "mass", columns: 3 }, [
                Form.header("Image Downloader", "column"),
                Form.div(`<div class="notice float-right">Download files from the search page</div>`, "mid"),
                Form.input(
                    "template", massDownloader.fetchSettings("template"), "Download File Name", "full", undefined,
                    async (event, data) => { await massDownloader.pushSettings("template", data); }
                ),
                Form.section({ id: "template-vars-mass", columns: 2 }, [
                    Form.div(`<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`, "mid"),
                ], " "),

                Form.checkbox(
                    "autodownload", massDownloader.fetchSettings("autoDownloadArchive"), "Auto Download", "column",
                    async (event, data) => { await massDownloader.pushSettings("autoDownloadArchive", data); }
                ),
                Form.div("The archive will be downloaded automatically after being created", "mid"),

                Form.checkbox(
                    "fixedSection", massDownloader.fetchSettings("fixedSection"), "Fixed Interface", "column",
                    async (event, data) => {
                        await massDownloader.pushSettings("fixedSection", data);
                        massDownloader.toggleFixedSection();
                    }
                ),
                Form.div("The downloader interface will remain on the screen as you scroll", "mid"),

                Form.hr(),
            ]),

            // Fav Downloader
            Form.section({ id: "fav", columns: 3 }, [
                Form.header("Favorites Downloader", "column"),
                Form.div(`<div class="notice float-right">Download all favorites at once</div>`, "mid"),
                Form.input(
                    "template", favDownloader.fetchSettings("template"), "Download File Name", "full", undefined,
                    async (event, data) => { await favDownloader.pushSettings("template", data); }
                ),
                Form.section({ id: "template-vars-fav", columns: 2 }, [
                    Form.div(`<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`, "mid"),
                ], " "),

                Form.checkbox(
                    "autodownload", favDownloader.fetchSettings("autoDownloadArchive"), "Auto Download", "column",
                    async (event, data) => { await favDownloader.pushSettings("autoDownloadArchive", data); }
                ),
                Form.div("The archive will be downloaded automatically after being created", "mid"),

                Form.checkbox(
                    "fixedSection", favDownloader.fetchSettings("fixedSection"), "Fixed Interface", "column",
                    async (event, data) => {
                        await favDownloader.pushSettings("fixedSection", data);
                        favDownloader.toggleFixedSection();
                    }
                ),
                Form.div("The downloader interface will remain on the screen as you scroll", "mid"),

                Form.hr(),
            ]),

            // Pool Downloader
            Form.section({ id: "pool", columns: 3 }, [
                Form.header("Pool Downloader", "column"),
                Form.div(`<div class="notice float-right">Download image pools or sets</div>`, "mid"),
                Form.input(
                    "template", poolDownloader.fetchSettings("template"), "Download File Name", "full", undefined,
                    async (event, data) => { await poolDownloader.pushSettings("template", data); }
                ),
                Form.section({ id: "template-vars-pool", columns: 2 }, [
                    Form.div(`<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`, "mid"),
                    Form.div(`<div class="notice unmargin">The following variables can also be used:</div>`, "mid"),
                    Form.copy("pool", "%pool%", "Pool Name"),
                    Form.copy("index", "%index%", "Index"),
                ], " "),

                Form.checkbox(
                    "autodownload", poolDownloader.fetchSettings("autoDownloadArchive"), "Auto Download", "column",
                    async (event, data) => { await poolDownloader.pushSettings("autoDownloadArchive", data); }
                ),
                Form.div("The archive will be downloaded automatically after being created", "mid"),
            ]),

        ]);
    }

    /** Creates the Custom Flagger tab */
    private createFlagsTab(): Form {
        const customFlagger = ModuleController.get(CustomFlagger);

        const defsContainer = $("<div>")
            .attr("id", "flag-defs-container");
        const flagDefs = customFlagger.fetchSettings("flags");

        flagDefs.forEach((flag) => {
            makeDefInput(flag).appendTo(defsContainer);
        });

        return new Form({ id: "settings-flags", columns: 3, parent: "div#modal-container" }, [
            Form.header("Flag Definitions", "mid"),
            Form.button(
                "defs-add", "New Flag", undefined, "column",
                async () => {
                    makeDefInput({
                        name: "",
                        color: "#" + Math.floor(Math.random() * 16777215).toString(16),     // Random HEX color
                        tags: "",
                    }).appendTo(defsContainer);
                }
            ),

            Form.div(defsContainer, "full"),

            Form.button(
                "defs-save", "Save", undefined, "column",
                async (event) => {
                    event.preventDefault();
                    const confirmBox = $("span#defs-confirm").html("Saving . . .");

                    const defData: FlagDefinition[] = [];
                    const defInputs = $(defsContainer).find("div.flag-defs-inputs").get();

                    for (const inputContainer of defInputs) {
                        const inputs = $(inputContainer).find("input").get();

                        const name = $(inputs[0]),
                            color = $(inputs[1]),
                            tags = $(inputs[2]);

                        if ((name.val() as string).length == 0) name.val("FLAG");
                        if (!(color.val() as string).match(/^#(?:[0-9a-f]{3}){1,2}$/i)) color.val("#800000");
                        if ((tags.val() as string).length == 0) continue;

                        defData.push({
                            name: name.val() as string,
                            color: color.val() as string,
                            tags: tags.val() as string,
                        });
                    }

                    await customFlagger.pushSettings("flags", defData);
                    confirmBox.html("Settings Saved");
                }
            ),
            Form.div(`<span id="defs-confirm"></span>`, "mid"),

            Form.div(`
                <b>Custom Flags</b> allow you to automatically highlight posts that match specified tags. For example:<br />
                <pre>-solo -duo -group -zero_pictured</pre>: posts that do not inlcude character count tags.<br />
                <pre>tagcount:&lt;5</pre>: posts with less than 5 tags<br />
                Flag names must be unique. Duplicate tag strings are allowed, by their corresponding flag may not display.
            `),
        ]);

        function makeDefInput(flag?: FlagDefinition): JQuery<HTMLElement> {
            const flagContainer = $("<div>")
                .addClass("flag-defs-inputs")
            $("<input>")
                .attr({
                    "type": "text",
                    "placeholder": "name",
                })
                .val(flag === undefined ? "" : flag.name)
                .appendTo(flagContainer);
            $("<input>")
                .attr({
                    "type": "text",
                    "placeholder": "color",
                })
                .val(flag === undefined ? "" : flag.color)
                .css("border-left-color", flag === undefined ? "transparent" : flag.color)
                .appendTo(flagContainer)
                .keyup((event) => {
                    const $target = $(event.target);
                    if (($target.val() + "").match(/^#(?:[0-9a-f]{3}){1,2}$/i)) {
                        $target.css("border-left-color", $target.val() + "");
                    }
                });
            $("<input>")
                .attr({
                    "type": "text",
                    "placeholder": "tags",
                })
                .val(flag === undefined ? "" : flag.tags)
                .appendTo(flagContainer);

            $("<button>")
                .html(`<i class="far fa-trash-alt"></i>`)
                .appendTo(flagContainer)
                .click(() => {
                    flagContainer.remove();
                });

            return flagContainer;
        }
    }

    /** Creates the hotkeys tab */
    private createHotkeysTab(): Form {
        const postViewer = ModuleController.get(PostViewer),
            poolNavigator = ModuleController.get(PoolNavigator),
            imageScaler = ModuleController.get(ImageScaler),
            miscellaneous = ModuleController.get(Miscellaneous),
            headerCustomizer = ModuleController.get(HeaderCustomizer),
            subscriptionManager = ModuleController.get(SubscriptionManager),
            searchUtilities = ModuleController.get(SearchUtilities);

        function createInputs(module: RE6Module, label: string, settingsKey: string): FormElement[] {
            const values = module.fetchSettings(settingsKey).split("|");
            const bindings: string[] = [
                values[0] === undefined ? "" : values[0],
                values[1] === undefined ? "" : values[1],
            ];

            return [
                Form.label(label),
                Form.key(
                    settingsKey + "-input-0", bindings[0], undefined, "column",
                    async (event, data) => { await handleRebinding(data, 0); }
                ),
                Form.key(
                    settingsKey + "-input-1", bindings[1], undefined, "column",
                    async (event, data) => { await handleRebinding(data, 1); }
                ),
            ];

            async function handleRebinding(data: string[], index: 0 | 1): Promise<void> {
                bindings[index] = data[0];
                await module.pushSettings(settingsKey, bindings.join("|"));
                Hotkeys.unregister(data[1]);
                await module.resetHotkeys();
            }
        }

        return new Form({ "id": "settings-hotkeys", columns: 3, parent: "div#modal-container" }, [
            // Listing
            Form.header("Listing"),
            ...createInputs(searchUtilities, "Search", "hotkeyFocusSearch"),
            ...createInputs(searchUtilities, "Random Post", "hotkeyRandomPost"),
            Form.hr(),

            // Posts
            Form.header("Posts"),
            ...createInputs(postViewer, "Upvote", "hotkeyUpvote"),
            ...createInputs(postViewer, "Downvote", "hotkeyDownvote"),
            ...createInputs(postViewer, "Toggle Favorite", "hotkeyFavorite"),
            ...createInputs(postViewer, "Add to Favorites", "hotkeyAddFavorite"),
            ...createInputs(postViewer, "Remove From Favorites", "hotkeyRemoveFavorite"),
            ...createInputs(poolNavigator, "Previous Post", "hotkeyPrev"),
            ...createInputs(poolNavigator, "Next Post", "hotkeyNext"),
            ...createInputs(poolNavigator, "Cycle Navigation", "hotkeyCycle"),
            ...createInputs(imageScaler, "Change Scale", "hotkeyScale"),
            ...createInputs(postViewer, "Add to Set", "hotkeyAddSet"),
            ...createInputs(postViewer, "Add to Pool", "hotkeyAddPool"),
            Form.hr(),

            // Actions
            Form.header("Actions"),
            ...createInputs(miscellaneous, "New Comment", "hotkeyNewComment"),
            ...createInputs(miscellaneous, "Edit Post", "hotkeyEditPost"),
            ...createInputs(postViewer, "Toggle Notes", "hotkeyHideNotes"),
            ...createInputs(postViewer, "Edit Notes", "hotkeyNewNote"),
            Form.hr(),

            // Modes
            Form.header("Search Modes"),
            ...createInputs(searchUtilities, "View", "hotkeySwitchModeView"),
            ...createInputs(searchUtilities, "Edit", "hotkeySwitchModeEdit"),
            ...createInputs(searchUtilities, "Add Favorite", "hotkeySwitchModeAddFav"),
            ...createInputs(searchUtilities, "Remove Favorite", "hotkeySwitchModeRemFav"),
            ...createInputs(searchUtilities, "Add to Set", "hotkeySwitchModeAddSet"),
            ...createInputs(searchUtilities, "Remove from Set", "hotkeySwitchModeRemSet"),
            Form.hr(),

            // Tabs
            Form.header("Header Tabs"),
            ...createInputs(headerCustomizer, "Tab #1", "hotkeyTab1"),
            ...createInputs(headerCustomizer, "Tab #2", "hotkeyTab2"),
            ...createInputs(headerCustomizer, "Tab #3", "hotkeyTab3"),
            ...createInputs(headerCustomizer, "Tab #4", "hotkeyTab4"),
            ...createInputs(headerCustomizer, "Tab #5", "hotkeyTab5"),
            ...createInputs(headerCustomizer, "Tab #6", "hotkeyTab6"),
            ...createInputs(headerCustomizer, "Tab #7", "hotkeyTab7"),
            ...createInputs(headerCustomizer, "Tab #8", "hotkeyTab8"),
            ...createInputs(headerCustomizer, "Tab #9", "hotkeyTab9"),

            ...createInputs(this, "Open Settings", "hotkeyOpenSettings"),
            ...createInputs(subscriptionManager, "Open Notifications", "hotkeyOpenNotifications"),
            Form.hr(),

            // Other
            Form.header("Miscellaneous"),
            ...createInputs(miscellaneous, "Submit Form", "hotkeySubmit"),
        ]);
    }

    /** Creates the miscellaneous settings tab */
    private createMiscTab(): Form {
        const modules = ModuleController.getAll();

        // "Reset Module" selector
        const moduleSelector = [{ value: "none", name: "------" }];
        modules.forEach((module) => {
            moduleSelector.push({ value: module.constructor.name, name: module.constructor.name });
        });
        let selectedModule = "none";

        // Create the settings form
        return new Form({ id: "settings-misc", columns: 3, parent: "div#modal-container" }, [
            Form.header("Miscellaneous"),

            // Import from File
            Form.header("Import / Export from file", "column"),
            Form.div(`<div class="notice unmargin float-right">Import subscription data from file</div>`, "mid"),

            Form.button(
                "export-button", "Export", "Export to file", "mid",
                () => { exportToFile(); }
            ),
            Form.spacer(),

            Form.file(
                "import-file", "json", "Import from file", "mid", undefined,
                (event, data) => { importFromFile(data); }
            ),
            Form.spacer(),
            Form.status(`<div id="file-import-status" class="unmargin"></div>`),

            // eSix Extended
            Form.header("eSix Extended", "column"),
            Form.div(`<div class="notice unmargin float-right">Import the settings from eSix Extended (Legacy)</div>`, "mid"),

            // From File
            Form.file(
                "esix-file", "json", "Select file", "mid", undefined,
                (event, data) => { importE6FromFile(data); }
            ),
            Form.spacer(),
            Form.status(`<div id="file-esix-status" class="unmargin"></div>`),

            // From LocalStorage
            Form.button(
                "esix-localstorage", "Load", "From LocalStorage", "mid",
                () => { importE6FromLocalStorage(); }
            ),
            Form.spacer(),
            Form.status(`<div id="localstorage-esix-status" class="unmargin"></div>`),
            Form.hr(),

            // Reset Configuration
            Form.header("<h3>Reset Modules</h3>"),
            Form.button(
                "reset-everything", "Clear", "Everything", "column",
                () => {
                    if (confirm("Are you absolutely sure?")) {
                        ModuleController.getAll().forEach((module) => { module.clearSettings(); });
                        location.reload();
                    }
                }
            ),
            Form.div("Delete settings for all modules. <b>This cannot be undone.</b>", "mid"),
            Form.select(
                "reset-specific", "none", "Module", moduleSelector, "mid",
                (event, data) => { selectedModule = data; }
            ),
            Form.div("Reset a specific module", "column"),
            Form.button(
                "reset-specific-action", "Reset", " ", "mid",
                () => {
                    if (selectedModule === "none") return;
                    ModuleController.get(selectedModule).clearSettings();
                }
            ),
            Form.div("<b>This cannot be undone.</b>", "column"),
            Form.hr(),

            Form.header("<h3>Debugging Tools</h3>"),
            Form.checkbox(
                "debug-enabled", Debug.isEnabled(), "Console output", "column",
                (event, data) => {
                    Debug.setEnabled(data);
                }
            ),
            Form.div("Enable debug messages in the console log", "mid"),
            Form.checkbox(
                "connect-log-enabled", Debug.isConnectLogEnabled(), "Connections log", "column",
                (event, data) => {
                    Debug.setConnectLogEnabled(data);
                }
            ),
            Form.div("Logs all outbound connections in the console", "mid"),
        ]);

        /** Export the currnt module settings to file */
        function exportToFile(): void {

            const promises: Promise<any>[] = [];
            ModuleController.getAll().forEach((module) => {
                promises.push(module.getSavedSettings());
            });

            Promise.all(promises).then((response) => {
                console.log(response);

                const storedData = { "meta": "re621/1.0" };
                response.forEach((data) => {
                    storedData[data.name] = data.data;
                    if (storedData[data.name]["cache"]) storedData[data.name]["cache"] = {};
                });

                Util.downloadJSON(storedData, "re621-" + User.getUsername() + "-userdata");
            })
        }

        /** Import module settings from file */
        function importFromFile(data: any): void {
            if (!data) return;
            const $info = $("div#file-import-status").html("Loading . . .");

            const reader = new FileReader();
            reader.readAsText(data, "UTF-8");
            reader.onload = function (event): void {
                const parsedData = JSON.parse(event.target.result.toString());

                if (!parsedData["meta"] || parsedData["meta"] !== "re621/1.0") {
                    $info.html("Invalid file format");
                    return;
                }

                delete parsedData.meta;

                Object.keys(parsedData).forEach((key) => {
                    $info.html("Importing " + key);
                    XM.Storage.setValue(key, parsedData[key]);
                });

                //console.log(parsedData);
                $info.html("Settings imported!");
            };
            reader.onerror = function (): void { $info.html("Error loading file"); };
        }

        /** Import eSix Extended Settings from File */
        function importE6FromFile(data): void {
            if (!data) return;
            const $info = $("div#file-esix-status").html("Loading . . .");

            const reader = new FileReader();
            reader.readAsText(data, "UTF-8");
            reader.onload = async (event): Promise<void> => {
                const parsedData = event.target.result.toString().split("\n");
                if (parsedData[0] !== "eSixExtend User Prefs") { $info.html("Invalid file format"); return; }

                parsedData.forEach((value, index) => {
                    if (index !== 0) parsedData[index] = JSON.parse(atob(value).replace(/^\d+\|/, ""));
                });

                // parsedData[2] : pools
                await importPoolData(parsedData[2], $info);

                // parsedData[3] : forums
                await importForumData(parsedData[3], $info);

                $info.html("Settings imported!");
            };
            reader.onerror = function (): void { $info.html("Error loading file"); };

            /** Import the pool data from string */
            async function importPoolData(settings: string, $info: JQuery<HTMLElement>): Promise<void> {
                $info.html("Processing pools . . .");
                const poolSubs = PoolTracker.getInstance(),
                    poolData = poolSubs.fetchSettings("data");
                for (const entry of settings) {
                    poolData[entry["id"]] = {
                        md5: entry["thumb"]["url"].substr(6, 32),
                        lastID: entry["last"],
                    };
                }
                poolSubs.pushSettings("data", poolData);
            }

            /** Import the forum data from string */
            async function importForumData(settings: string, $info: JQuery<HTMLElement>): Promise<void> {
                $info.html("Processing forums . . .");
                const forumSubs = ForumTracker.getInstance(),
                    forumData = forumSubs.fetchSettings("data"),
                    postIDs = [];
                for (const entry of settings) {
                    postIDs.push(entry["id"]);
                }
                const data = await E621.ForumPosts.get<APIForumPost>({ "search[id]": postIDs.join(",") });
                data.forEach((postData) => {
                    forumData[postData["topic_id"]] = {};
                });
                forumSubs.pushSettings("data", forumData);

            }
        }

        /** Import eSix Extended Settings from LocalStorage */
        async function importE6FromLocalStorage(): Promise<void> {
            const $info = $("div#localstorage-esix-status").html("Loading . . .");

            if (localStorage.getItem("poolSubscriptions") !== null) {
                await this.importPoolData(JSON.parse(localStorage.getItem("poolSubscriptions")), $info);
            }

            if (localStorage.getItem("forumSubscriptions") !== null) {
                await this.importForumData(JSON.parse(localStorage.getItem("forumSubscriptions")), $info);
            }

            $info.html("Settings imported!");
        }
    }

    /** Creates the about tab */
    private createAboutTab(): Form {
        return new Form({ "id": "about-form", "columns": 3, parent: "div#modal-container" }, [
            // About
            Form.div(
                `<h3 class="display-inline"><a href="${window["re621"]["links"]["website"]}">${window["re621"]["name"]} v.${window["re621"]["version"]}</a></h3>` +
                ` <span class="display-inline">build ${window["re621"]["build"]}:${Patcher.version}</span>`,
                "mid"
            ),
            Form.div(
                `<span class="float-right" id="project-update-button" data-available="${this.fetchSettings("newVersionAvailable")}">
                    <a href="${window["re621"]["links"]["releases"]}">Update Available</a>
                </span>`,
                "column"
            ),
            Form.div(
                `<b>${window["re621"]["name"]}</b> is a comprehensive set of tools designed to enhance the website for both casual and power users. ` +
                `It is created and maintained by unpaid volunteers, with the hope that it will be useful for the community.`
            ),
            Form.div(
                `Keeping the script - and the website - fully functional is our highest priority. ` +
                `If you are experiencing bugs or issues, do not hesitate to create a new ticket on <a href="${window["re621"]["links"]["issues"]}">github</a>, ` +
                `or leave us a message in the <a href="${window["re621"]["links"]["forum"]}">forum thread</a>. ` +
                `Feature requests, comments, and overall feedback are also appreciated.`
            ),
            Form.div(`Thank you for downloading and using this script. We hope that you enjoy the experience.`),
            Form.spacer("full"),

            // Changelog
            Form.header(`<a href="${window["re621"]["links"]["releases"]}" class="unmargin">What's new?</a>`),
            Form.div(`<div id="changelog-list">${Util.quickParseMarkdown(this.fetchSettings("changelog"))}</div>`)
        ]);
    }

    /**
     * Toggles the settings window
     */
    private openSettings(): void {
        $("a#header-button-settings")[0].click();
    }

}
