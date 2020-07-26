import { E621 } from "../../components/api/E621";
import { APIForumPost } from "../../components/api/responses/APIForumPost";
import { XM } from "../../components/api/XM";
import { Hotkeys } from "../../components/data/Hotkeys";
import { User } from "../../components/data/User";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Form, FormElement } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Tabbed } from "../../components/structure/Tabbed";
import { Debug } from "../../components/utility/Debug";
import { Patcher } from "../../components/utility/Patcher";
import { Sync } from "../../components/utility/Sync";
import { Util } from "../../components/utility/Util";
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
import { ThumbnailEnhancer } from "../search/ThumbnailsEnhancer";
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
                { name: "General", structure: this.createGeneralTab() },
                { name: "Downloads", structure: this.createDownloadsTab() },
                { name: "Custom Flags", structure: this.createFlagsTab() },
                { name: "Hotkeys", structure: this.createHotkeysTab() },
                { name: "Features", structure: this.createFeaturesTab() },
                // { name: "Sync", structure: this.createSyncTab() },
                { name: "Other", structure: this.createMiscTab() },
                { name: "About", structure: this.createAboutTab() },
            ]
        });

        // Create the modal
        new Modal({
            title: "Settings",
            triggers: [{ element: openSettingsButton }],
            escapable: false,
            fixed: true,
            reserveHeight: true,
            content: Form.placeholder(3),
            structure: $settings,
            position: { my: "center", at: "center" },
        });

        // Start up the version checker
        if (new Date().getTime() - (1000 * 60 * 60) > this.fetchSettings("lastVersionCheck")) {

            const releases = { latest: null, current: null };
            (async (): Promise<void> => {
                releases.latest = JSON.parse(await Util.userscriptRequest("https://api.github.com/repos/re621/re621/releases/latest"));
                releases.current = JSON.parse(await Util.userscriptRequest("https://api.github.com/repos/re621/re621/releases/tags/" + window["re621"]["version"]));
                await this.pushSettings("newVersionAvailable", releases.latest.name !== releases.current.name);
                await this.pushSettings("lastVersionCheck", new Date().getTime());
                await this.pushSettings("changelog", releases.current.body);

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

        return new Form({ name: "optgeneral", columns: 3, width: 3 }, [

            Form.accordion({ name: "gencollapse", columns: 3, width: 3, active: 0 }, [

                // Title Customizer
                Form.accordionTab({ name: "layout", label: "Layout", columns: 3, width: 3 }, [

                    Form.input(
                        {
                            name: "template", value: titleCustomizer.fetchSettings("template"),
                            label: `<b>Page Title</b>`,
                            width: 3,
                        },
                        async (data) => {
                            await titleCustomizer.pushSettings("template", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.section({ columns: 3, width: 3, }, [
                        Form.div({ value: `<div class="notice unmargin">The following variables can be used:</div>`, width: 3 }),
                        Form.copy({ value: "%postid%", label: "Post ID" }),
                        Form.copy({ value: "%artist%", label: "Artist" }),
                        Form.copy({ value: "%copyright%", label: "Copyright" }),
                        Form.copy({ value: "%character%", label: "Characters" }),
                        Form.copy({ value: "%species%", label: "Species" }),
                        Form.copy({ value: "%meta%", label: "Meta" }),
                    ]),
                    Form.spacer(3),

                    Form.checkbox(
                        { value: titleCustomizer.fetchSettings("symbolsEnabled"), label: "<b>Title Icons</b>", width: 3 },
                        async (data) => {
                            await titleCustomizer.pushSettings("symbolsEnabled", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.input(
                        { value: titleCustomizer.fetchSettings("symbolFav"), label: "Favorite" },
                        async (data) => {
                            await titleCustomizer.pushSettings("symbolFav", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.input({ value: titleCustomizer.fetchSettings("symbolVoteUp"), label: "Upvoted", },
                        async (data) => {
                            await titleCustomizer.pushSettings("symbolVoteUp", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.input({ value: titleCustomizer.fetchSettings("symbolVoteDown"), label: "Downvoted", },
                        async (data) => {
                            await titleCustomizer.pushSettings("symbolVoteDown", data);
                            if (titleCustomizer.isInitialized()) titleCustomizer.refreshPageTitle();
                        }
                    ),
                    Form.hr(3),

                    Form.checkbox(
                        {
                            value: searchUtilities.fetchSettings("improveTagCount"),
                            label: "<b>Expanded Tag Count</b><br />Replace the rounded tag count in the sidebar with the precise one",
                            width: 3,
                        },
                        async (data) => {
                            await searchUtilities.pushSettings("improveTagCount", data);
                            searchUtilities.improveTagCount(data);
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: searchUtilities.fetchSettings("shortenTagNames"),
                            label: "<b>Shorten Tag Names</b><br />Cut off long tag names to make them fit on one line",
                            width: 3,
                        },
                        async (data) => {
                            await searchUtilities.pushSettings("shortenTagNames", data);
                            searchUtilities.shortenTagNames(data);
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: miscellaneous.fetchSettings("stickyHeader"),
                            label: "<b>Fixed Header</b><br />Make the page header stick to the top when scrolling",
                            width: 3,
                        },
                        async (data) => {
                            await miscellaneous.pushSettings("stickyHeader", data);
                            miscellaneous.createStickyHeader(data);
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: miscellaneous.fetchSettings("stickySearchbox"),
                            label: "<b>Fixed Searchbox</b><br />Make the searchbox remain visible when scrolling",
                            width: 3,
                        },
                        async (data) => {
                            await miscellaneous.pushSettings("stickySearchbox", data);
                            miscellaneous.createStickySearchbox(data);
                        }
                    ),
                ]),

                // Thumbnail Enhancer
                Form.accordionTab({ name: "thumb", label: "Thumbnails", columns: 3, width: 3 }, [

                    // Upscaling
                    Form.subheader("Hi-Res Thumbnails", "Replace 150x150 thumbnails with high-resolution ones", 2),
                    Form.select(
                        { value: thumbnailEnhancer.fetchSettings("upscale"), },
                        {
                            "disabled": "Disabled",
                            "hover": "On Hover",
                            "always": "Always",
                        },
                        async (data) => { await thumbnailEnhancer.pushSettings("upscale", data); }
                    ),
                    Form.spacer(2),
                    Form.text(`<div class="unmargin text-center text-bold">Requires a page reload</div>`),

                    // Double-click
                    Form.subheader("Double-Click Action", "Action taken when a thumbnail is double-clicked", 2),
                    Form.select(
                        { value: thumbnailEnhancer.fetchSettings("clickAction") },
                        {
                            "disabled": "Disabled",
                            "newtab": "Open New Tab",
                            "copyid": "Copy Post ID",
                        },
                        async (data) => {
                            await thumbnailEnhancer.pushSettings("clickAction", data);
                        }
                    ),
                    Form.spacer(2),
                    Form.text(`<div class="unmargin text-center text-bold">Requires a page reload</div>`),

                    // Preserve Hover Text
                    Form.checkbox(
                        {
                            value: thumbnailEnhancer.fetchSettings("preserveHoverText"),
                            label: "<b>Preserve Hover Text</b><br />Restores text displayed when hovering over the thumbnail",
                            width: 2,
                        },
                        async (data) => {
                            await thumbnailEnhancer.pushSettings("preserveHoverText", data);
                        }
                    ),
                    Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
                    Form.spacer(3),

                    // Thumbnail Scaling
                    Form.checkbox(
                        {
                            value: thumbnailEnhancer.fetchSettings("crop"),
                            label: "<b>Thumbnail Rescaling</b><br />Resize thumbnail images according to settings below",
                            width: 3,
                        },
                        async (data) => {
                            await thumbnailEnhancer.pushSettings("crop", data);
                            thumbnailEnhancer.toggleThumbCrop(data);
                        }
                    ),

                    Form.collapse({ name: "scalingconf", columns: 3, width: 3, title: "Scaling Options", collapsed: true }, [

                        Form.subheader("Thumbnail Size", "Thumbnail width, in px, em, or rem", 2),
                        Form.input(
                            { value: thumbnailEnhancer.fetchSettings("cropSize"), pattern: "^\\d{2,3}(px|rem|em)$" },
                            async (data, input) => {
                                if (!(input.get()[0] as HTMLInputElement).checkValidity()) return;
                                await thumbnailEnhancer.pushSettings("cropSize", data);
                                thumbnailEnhancer.setThumbSize(data);
                            }
                        ),
                        Form.spacer(3),

                        Form.subheader("Image Ratio", "Height to width ratio of the image", 2),
                        Form.input(
                            { value: thumbnailEnhancer.fetchSettings("cropRatio"), pattern: "^(([01](\\.\\d+)?)|2)$" },
                            async (data, input) => {
                                if (!(input.get()[0] as HTMLInputElement).checkValidity()) return;
                                await thumbnailEnhancer.pushSettings("cropRatio", data);
                                thumbnailEnhancer.setThumbRatio(data);
                            }
                        ),
                        Form.spacer(3),

                        Form.checkbox(
                            {
                                value: thumbnailEnhancer.fetchSettings("cropPreserveRatio"),
                                label: "<b>Preserve Ratio</b><br />Keep the image ratio of the original image",
                                width: 3,
                            },
                            async (data) => {
                                await thumbnailEnhancer.pushSettings("cropPreserveRatio", data);
                                $("input#advanced-crop-ratio").prop('disabled', data);
                                thumbnailEnhancer.toggleThumbPreserveRatio(data);
                            }
                        ),

                        Form.hr(3),

                        Form.checkbox(
                            {
                                value: thumbnailEnhancer.fetchSettings("zoom"),
                                label: "<b>Zoom on Hover</b><br />Increases the size of the thumbnail when hovering over it",
                                width: 3,
                            },
                            async (data) => {
                                await thumbnailEnhancer.pushSettings("zoom", data);
                                thumbnailEnhancer.toggleHoverZoom(data);
                            }
                        ),
                        Form.spacer(3),

                        Form.subheader("Zoom scale", "The ratio of the enlarged thumbnail to its original size", 2),
                        Form.input(
                            { value: thumbnailEnhancer.fetchSettings("zoomScale"), pattern: "^[1-9](\\.\\d+)?$" },
                            async (data, input) => {
                                if (!(input.get()[0] as HTMLInputElement).checkValidity()) return;
                                await thumbnailEnhancer.pushSettings("zoomScale", data);
                                thumbnailEnhancer.setZoomScale(data);
                            }
                        ),
                        Form.spacer(3),

                        Form.checkbox(
                            {
                                value: thumbnailEnhancer.fetchSettings("zoomContextual"),
                                label: "<b>Contextual Zoom</b><br />Only enable thumbnail zoom in the viewing mode",
                                width: 3,
                            },
                            async (data) => {
                                await thumbnailEnhancer.pushSettings("zoomContextual", data);
                                thumbnailEnhancer.toggleZoomContextual(data);
                            }
                        ),
                        Form.spacer(3),

                    ]),

                    // Voting Buttons
                    Form.checkbox(
                        {
                            value: thumbnailEnhancer.fetchSettings("vote"),
                            label: "<b>Voting Buttons</b><br />Adds voting buttons when hovering over a thumbnail",
                            width: 3,
                        },
                        async (data) => {
                            await thumbnailEnhancer.pushSettings("vote", data);
                            thumbnailEnhancer.toggleHoverVote(data);
                        }
                    ),
                    Form.spacer(3),

                    // Ribbons
                    Form.checkbox(
                        {
                            value: thumbnailEnhancer.fetchSettings("ribbons"),
                            label: "<b>Status Ribbons</b><br />Use corner ribbons instead of colored borders for flags",
                            width: 3,
                        },
                        async (data) => {
                            await thumbnailEnhancer.pushSettings("ribbons", data);
                            if (thumbnailEnhancer.isInitialized()) thumbnailEnhancer.toggleStatusRibbons(data);

                            $("input#optgeneral-gencollapse-thumb-relations-ribbons").prop("disabled", !data);
                            $("input#optgeneral-gencollapse-thumb-relations-ribbons").parent().toggleClass("input-disabled", !data);
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            name: "relations-ribbons",
                            value: thumbnailEnhancer.fetchSettings("relRibbons"),
                            label: "<b>Relations Ribbons</b><br />Display ribbons for parent/child relationships",
                            width: 3,
                            wrapper: (thumbnailEnhancer.fetchSettings("ribbons") ? undefined : "input-disabled"),
                        },
                        async (data) => {
                            await thumbnailEnhancer.pushSettings("relRibbons", data);
                            if (thumbnailEnhancer.isInitialized()) thumbnailEnhancer.toggleRelationRibbons(data);
                        }
                    ),

                ]),

                // Miscellaneous
                Form.accordionTab({ name: "misc", label: "Other", columns: 3, width: 3 }, [

                    Form.checkbox(
                        {
                            value: infiniteScroll.fetchSettings("keepHistory"),
                            label: "<b>Preserve Scroll History</b><br />Load all result pages up to the current one (Infinite Scroll)",
                            width: 2,
                        },
                        async (data) => { await infiniteScroll.pushSettings("keepHistory", data); }
                    ),
                    Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),

                    Form.hr(3),

                    Form.checkbox(
                        {
                            value: postViewer.fetchSettings("upvoteOnFavorite"),
                            label: "<b>Auto-Upvote Favorites</b><br />Automatically upvote a post when adding it to the favorites",
                            width: 3,
                        },
                        async (data) => { await postViewer.pushSettings("upvoteOnFavorite", data); }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: imageScaler.fetchSettings("clickScale"),
                            label: "<b>Quick Rescale</b><br />Click on a post image to cycle through scaling options",
                            width: 3,
                        },
                        async (data) => { await imageScaler.pushSettings("clickScale", data); }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: searchUtilities.fetchSettings("collapseCategories"),
                            label: "<b>Remember Collapsed Tag Categories</b><br />Preserve the minimized state of the tag categories in the sidebar",
                            width: 3,
                        },
                        async (data) => { await searchUtilities.pushSettings("collapseCategories", data); }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: blacklistEnhancer.fetchSettings("quickaddTags"),
                            label: "<b>Quick Blacklist</b><br />Click X next to the tag in the sidebar to add it to the blacklist",
                            width: 3,
                        },
                        async (data) => { await blacklistEnhancer.pushSettings("quickaddTags", data); }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: headerCustomizer.fetchSettings("forumUpdateDot"),
                            label: "<b>Forum Notifications</b><br />Red dot on the Forum tab in the header if there are new posts",
                            width: 2,
                        },
                        async (data) => { await headerCustomizer.pushSettings("forumUpdateDot", data); }
                    ),
                    Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
                    Form.spacer(3),

                ]),

            ]),

        ]);
    }

    /** Creates the downloads settings tab */
    private createDownloadsTab(): Form {
        const downloadCustomizer = ModuleController.get(DownloadCustomizer),
            massDownloader = ModuleController.get(MassDownloader),
            poolDownloader = ModuleController.get(PoolDownloader),
            favDownloader = ModuleController.get(FavDownloader);

        return new Form({ name: "optdownload", columns: 3, width: 3 }, [

            // Download Customizer
            Form.section({ name: "customizer", columns: 3, width: 3 }, [
                Form.header("Download Customizer"),
                Form.div({ value: `<div class="notice float-right">Download individual files</div>`, width: 2 }),

                Form.text("<b>File name</b>"),
                Form.input(
                    { value: downloadCustomizer.fetchSettings("template"), width: 2 },
                    async (data) => {
                        await downloadCustomizer.pushSettings("template", data);
                        if (downloadCustomizer.isInitialized()) downloadCustomizer.refreshDownloadLink();
                    }
                ),
                Form.section({ columns: 3, width: 3 }, [
                    Form.div({ value: `<div class="notice unmargin">The following variables can be used:</div>`, width: 3 }),
                    Form.copy({ value: "%postid%", label: "Post ID" }),
                    Form.copy({ value: "%artist%", label: "Artist" }),
                    Form.copy({ value: "%copyright%", label: "Copyright" }),
                    Form.copy({ value: "%character%", label: "Characters" }),
                    Form.copy({ value: "%species%", label: "Species" }),
                    Form.copy({ value: "%meta%", label: "Meta" }),
                    Form.copy({ value: "%md5%", label: "MD5" }),
                ]),
            ]),
            Form.spacer(3),

            Form.accordion({ name: "downcollapse", columns: 3, width: 3, active: 0 }, [

                // Mass Downloader
                Form.accordionTab({ name: "mass", label: "Mass Downloader", subheader: "Download files from the search page", columns: 3, width: 3 }, [
                    Form.text("<b>Archive name</b>"),
                    Form.input(
                        { value: massDownloader.fetchSettings("template"), width: 2 },
                        async (data) => { await massDownloader.pushSettings("template", data); }
                    ),
                    Form.div({
                        value: `<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`,
                        width: 3
                    }),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: massDownloader.fetchSettings("autoDownloadArchive"),
                            label: "<b>Auto Download</b><br />The archive will be downloaded automatically after being created",
                            width: 3,
                        },
                        async (data) => { await massDownloader.pushSettings("autoDownloadArchive", data); }
                    ),

                    Form.checkbox(
                        {
                            value: massDownloader.fetchSettings("fixedSection"),
                            label: "<b>Fixed Interface</b><br />The downloader interface will remain on the screen as you scroll",
                            width: 3,
                        },
                        async (data) => {
                            await massDownloader.pushSettings("fixedSection", data);
                            massDownloader.toggleFixedSection();
                        }
                    ),

                ]),

                // Fav Downloader
                Form.accordionTab({ name: "fav", label: "Favorites Downloader", subheader: "Download all favorites at once", columns: 3, width: 3 }, [
                    Form.text("<b>Archive name</b>"),
                    Form.input(
                        { value: favDownloader.fetchSettings("template"), width: 2 },
                        async (data) => { await favDownloader.pushSettings("template", data); }
                    ),
                    Form.div({
                        value: `<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`,
                        width: 3
                    }),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: favDownloader.fetchSettings("autoDownloadArchive"),
                            label: "<b>Auto Download</b><br />The archive will be downloaded automatically after being created",
                            width: 3,
                        },
                        async (data) => { await favDownloader.pushSettings("autoDownloadArchive", data); }
                    ),

                    Form.checkbox(
                        {
                            value: favDownloader.fetchSettings("fixedSection"),
                            label: "<b>Fixed Interface</b><br />The downloader interface will remain on the screen as you scroll",
                            width: 3,
                        },
                        async (data) => {
                            await favDownloader.pushSettings("fixedSection", data);
                            favDownloader.toggleFixedSection();
                        }
                    ),

                ]),

                // Pool Downloader
                Form.accordionTab({ name: "pool", label: "Pool Downloader", subheader: "Download image pools or sets", columns: 3, width: 3 }, [
                    Form.text("<b>Archive name</b>"),
                    Form.input(
                        { value: poolDownloader.fetchSettings("template"), width: 2 },
                        async (data) => { await poolDownloader.pushSettings("template", data); }
                    ),
                    Form.section({ name: "template-vars-pool", columns: 3, width: 3 }, [
                        Form.div({ value: `<div class="notice unmargin">The same variables as above can be used. Add a forward slash ( / ) to signify a folder.</div>`, width: 3 }),
                        Form.div({ value: `<div class="notice unmargin">The following variables can also be used:</div>`, width: 3 }),
                        Form.copy({ value: "%pool%", label: "Pool Name" }),
                        Form.copy({ value: "%index%", label: "Index" }),
                    ]),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: poolDownloader.fetchSettings("autoDownloadArchive"),
                            label: "<b>Auto Download</b><br />The archive will be downloaded automatically after being created",
                            width: 3,
                        },
                        async (data) => { await poolDownloader.pushSettings("autoDownloadArchive", data); }
                    ),

                ]),

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

        return new Form({ name: "optflags", columns: 3, width: 3 }, [
            Form.header("Flag Definitions", 2),
            Form.button(
                { value: "New Flag" },
                async () => {
                    makeDefInput({
                        name: "",
                        color: "#" + Math.floor(Math.random() * 16777215).toString(16),     // Random HEX color
                        tags: "",
                    }).appendTo(defsContainer);
                }
            ),
            Form.div({ value: defsContainer, width: 3 }),

            Form.button(
                { value: "Save" },
                async () => {
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
                    window.setTimeout(() => { confirmBox.html(""); }, 1000);
                }
            ),
            Form.div({ value: `<span id="defs-confirm"></span>` }),

            Form.div({
                value: `
                <b>Custom Flags</b> allow you to automatically highlight posts that match specified tags. For example:<br />
                <pre>-solo -duo -group -zero_pictured</pre>: posts that do not inlcude character count tags.<br />
                <pre>tagcount:&lt;5</pre>: posts with less than 5 tags<br />
                Flag names must be unique. Duplicate tag strings are allowed, by their corresponding flag may not display.`,
                width: 3
            }),
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
                Form.div({ value: label }),
                Form.key(
                    { value: bindings[0] },
                    async (data) => { await handleRebinding(data, 0); }
                ),
                Form.key(
                    { value: bindings[1] },
                    async (data) => { await handleRebinding(data, 1); }
                ),
            ];

            async function handleRebinding(data: string[], index: 0 | 1): Promise<void> {
                bindings[index] = data[0];
                await module.pushSettings(settingsKey, bindings.join("|"));
                Hotkeys.unregister(data[1]);
                await module.resetHotkeys();
            }
        }

        return new Form({ name: "opthotkeys", columns: 3, width: 3 }, [
            // Listing
            Form.header("Listing", 3),
            ...createInputs(searchUtilities, "Search", "hotkeyFocusSearch"),
            ...createInputs(searchUtilities, "Random Post", "hotkeyRandomPost"),
            Form.hr(3),

            // Posts
            Form.header("Posts", 3),
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
            Form.hr(3),

            // Actions
            Form.header("Actions", 3),
            ...createInputs(miscellaneous, "New Comment", "hotkeyNewComment"),
            ...createInputs(miscellaneous, "Edit Post", "hotkeyEditPost"),
            ...createInputs(postViewer, "Toggle Notes", "hotkeyHideNotes"),
            ...createInputs(postViewer, "Edit Notes", "hotkeyNewNote"),
            Form.hr(3),

            // Modes
            Form.header("Search Modes", 3),
            ...createInputs(searchUtilities, "View", "hotkeySwitchModeView"),
            ...createInputs(searchUtilities, "Edit", "hotkeySwitchModeEdit"),
            ...createInputs(searchUtilities, "Add Favorite", "hotkeySwitchModeAddFav"),
            ...createInputs(searchUtilities, "Remove Favorite", "hotkeySwitchModeRemFav"),
            ...createInputs(searchUtilities, "Add to Set", "hotkeySwitchModeAddSet"),
            ...createInputs(searchUtilities, "Remove from Set", "hotkeySwitchModeRemSet"),
            Form.hr(3),

            // Tabs
            Form.header("Header Tabs", 3),
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
            Form.hr(3),

            // Other
            Form.header("Miscellaneous", 3),
            ...createInputs(miscellaneous, "Submit Form", "hotkeySubmit"),
        ]);
    }

    /** Creates the script features tab */
    private createFeaturesTab(): Form {
        const modules = ModuleController.getAll();

        function createInput(moduleName: string, label: string, description: string): FormElement[] {
            const module = modules.get(moduleName);

            return [
                Form.checkbox(
                    {
                        name: moduleName + "-enabled",
                        value: module.fetchSettings("enabled"),
                        label: `<b>${label}</b><br />${description}`,
                        width: 3,
                    },
                    (data) => {
                        module.pushSettings("enabled", data);
                        module.setEnabled(data);
                        if (data === true) {
                            if (module.canInitialize()) module.create();
                        } else module.destroy();
                    }
                ),
                Form.spacer(3),
            ];
        }

        return new Form({ name: "settings-modules", columns: 3, width: 3, }, [
            Form.header("Features", 3),

            ...createInput("HeaderCustomizer", "Header Customizer", "Add, delete, and customize header links to your heart's content."),

            ...createInput("InfiniteScroll", "Infinite Scroll", "New posts are automatically loaded as you scroll."),

            ...createInput("InstantSearch", "Instant Filters", "Quickly add filters to your current search."),

            ...createInput("FormattingManager", "Formatting Helper", "Fully customizable toolbar for easy DText formatting."),

            ...createInput("TinyAlias", "Tiny Alias", "A more intelligent way to quickly fill out post tags."),
        ]);
    }

    private createSyncTab(): Form {
        return new Form({ name: "optsync", columns: 3, width: 3 }, [
            Form.header("Settings Synchronization", 3),

            Form.checkbox(
                { value: Sync.enabled, label: "Enabled" },
                async (data) => {
                    console.log(data);
                }
            ),
            Form.spacer(2),

            Form.div({ value: "ID" }),
            Form.input(
                { value: Sync.userID },
                async (data) => {
                    console.log(data);
                }
            ),
            Form.input(
                { value: "password" },
                async (data) => {
                    console.log(data);
                }
            ),
        ]);
    }

    /** Creates the miscellaneous settings tab */
    private createMiscTab(): Form {
        const modules = ModuleController.getAll();

        // "Reset Module" selector
        const moduleSelector = { "none": "------" };
        modules.forEach((module) => {
            moduleSelector[module.getSettingsTag()] = module.getSettingsTag();
        });
        let selectedModule = "none";

        // Create the settings form
        return new Form({ name: "optmisc", columns: 3, width: 3 }, [
            Form.header("Miscellaneous", 3),

            Form.section({ name: "export", columns: 3, width: 3 }, [

                // Import from File
                Form.section({ name: "file", columns: 3, width: 3 }, [
                    Form.header("Import / Export from file"),
                    Form.div({ value: `<div class="notice float-right">Import subscription data from file</div>`, width: 2 }),

                    Form.text("Export to File"),
                    Form.button(
                        { value: "Export", width: 2 },
                        () => { exportToFile(); }
                    ),

                    Form.text("Import from File"),
                    Form.file(
                        { accept: "json", width: 2 },
                        (data) => { importFromFile(data); }
                    ),

                    Form.spacer(),
                    Form.div({ value: `<div id="file-import-status" class="unmargin"></div>`, label: " ", width: 3 }),
                ]),

                // eSix Extended
                Form.section({ name: "esix", columns: 3, width: 3, wrapper: Debug.getState("enabled") ? undefined : "display-none" }, [
                    Form.header("eSix Extended"),
                    Form.div({ value: `<div class="notice float-right">Import the settings from eSix Extended (Legacy)</div>`, width: 2 }),

                    // From File
                    Form.text("Select File"),
                    Form.file(
                        { accept: "json", width: 2 },
                        (data) => { importE6FromFile(data); }
                    ),
                    Form.spacer(),
                    Form.div({ value: `<div id="file-esix-status" class="unmargin"></div>`, label: " ", width: 3 }),

                    // From LocalStorage
                    Form.text("From LocalStorage"),
                    Form.button(
                        { value: "Load", width: 2 },
                        () => { importE6FromLocalStorage(); }
                    ),
                    Form.spacer(),
                    Form.div({ value: `<div id="localstorage-esix-status" class="unmargin"></div>`, label: " ", width: 3 }),
                ]),

                Form.hr(3),
            ]),

            // Reset Configuration
            Form.section({ name: "reset", columns: 3, width: 3 }, [
                Form.header("Reset Modules", 3),

                Form.text(`<b>Everything</b><br />Delete settings for all modules. <b>This cannot be undone.</b>`, 2),
                Form.button(
                    { value: "Clear" },
                    () => {
                        if (confirm("Are you absolutely sure?")) {
                            ModuleController.getAll().forEach((module) => { module.clearSettings(); });
                            location.reload();
                        }
                    }
                ),

                Form.text(`<b>Module</b><br />Reset a specific module`, 2),
                Form.select(
                    { value: selectedModule },
                    moduleSelector,
                    (data) => { selectedModule = data; }
                ),

                Form.text(`<div class="text-bold">Requires a page reload</div>`, 2),
                Form.button(
                    { value: "Reset" },
                    () => {
                        if (selectedModule === "none") return;
                        ModuleController.get(selectedModule).clearSettings();
                    }
                ),

                Form.hr(3),
            ]),

            // Debug Settings
            Form.section({ name: "debug", columns: 3, width: 3 }, [
                Form.header("Debugging Tools", 3),

                Form.checkbox(
                    {
                        value: Debug.getState("enabled"),
                        label: `<b>Debug Mode</b><br />Enable debug messages in the console log`,
                        width: 3,
                    },
                    (data) => {
                        Debug.setState("enabled", data);
                    }
                ),

                Form.checkbox(
                    {
                        value: Debug.getState("connect"),
                        label: `<b>Connections Log</b><br />Logs all outbound connections in the console`,
                        width: 3,
                    },
                    (data) => {
                        Debug.setState("connect", data);
                    }
                ),

                Form.checkbox(
                    {
                        value: Debug.getState("perform"),
                        label: `<b>Performance Metrics</b><br />Write script performance analysis into the console log`,
                        width: 3,
                    },
                    (data) => {
                        Debug.setState("perform", data);
                    }
                ),
            ]),
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
        return new Form({ name: "optabout", columns: 3, width: 3 }, [
            // About
            Form.div({
                value:
                    `<h3 class="display-inline"><a href="${window["re621"]["links"]["website"]}">${window["re621"]["name"]} v.${window["re621"]["version"]}</a></h3>` +
                    ` <span class="display-inline">build ${window["re621"]["build"]}:${Patcher.version}</span>`,
                width: 2
            }),
            Form.div({
                value:
                    `<span class="float-right" id="project-update-button" data-available="${this.fetchSettings("newVersionAvailable")}">
                    <a href="${window["re621"]["links"]["releases"]}">Update Available</a>
                    </span>`
            }),
            Form.div({
                value:
                    `<b>${window["re621"]["name"]}</b> is a comprehensive set of tools designed to enhance the website for both casual and power users. ` +
                    `It is created and maintained by unpaid volunteers, with the hope that it will be useful for the community.`,
                width: 3
            }),
            Form.div({
                value:
                    `Keeping the script - and the website - fully functional is our highest priority. ` +
                    `If you are experiencing bugs or issues, do not hesitate to create a new ticket on <a href="${window["re621"]["links"]["issues"]}">github</a>, ` +
                    `or leave us a message in the <a href="${window["re621"]["links"]["forum"]}">forum thread</a>. ` +
                    `Feature requests, comments, and overall feedback are also appreciated.`,
                width: 3
            }),
            Form.div({ value: `Thank you for downloading and using this script. We hope that you enjoy the experience.`, width: 3 }),
            Form.spacer(3),

            // Changelog
            Form.header(`<a href="${window["re621"]["links"]["releases"]}" class="unmargin">What's new?</a>`, 3),
            Form.div({ value: `<div id="changelog-list">${Util.quickParseMarkdown(this.fetchSettings("changelog"))}</div>`, width: 3 })
        ]);
    }

    /**
     * Toggles the settings window
     */
    private openSettings(): void {
        $("a#header-button-settings")[0].click();
    }

}
