import { E621 } from "../../components/api/E621";
import { APIForumPost } from "../../components/api/responses/APIForumPost";
import { XM } from "../../components/api/XM";
import { AvoidPosting } from "../../components/cache/AvoidPosting";
import { TagCache } from "../../components/cache/TagCache";
import { User } from "../../components/data/User";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { DomUtilities } from "../../components/structure/DomUtilities";
import { Form, FormElement } from "../../components/structure/Form";
import { Modal } from "../../components/structure/Modal";
import { Tabbed } from "../../components/structure/Tabbed";
import { Debug } from "../../components/utility/Debug";
import { Patcher } from "../../components/utility/Patcher";
import { Util } from "../../components/utility/Util";
import { VersionChecker } from "../../components/utility/VersionChecker";
import { FavDownloader } from "../downloader/FavDownloader";
import { MassDownloader } from "../downloader/MassDownloader";
import { PoolDownloader } from "../downloader/PoolDownloader";
import { SmartAlias } from "../misc/SmartAlias";
import { UploadUtilities } from "../misc/UploadUtilities";
import { DownloadCustomizer } from "../post/DownloadCustomizer";
import { ImageScaler } from "../post/ImageScaler";
import { PoolNavigator } from "../post/PoolNavigator";
import { PostViewer } from "../post/PostViewer";
import { TitleCustomizer } from "../post/TitleCustomizer";
import { BetterSearch } from "../search/BetterSearch";
import { BlacklistEnhancer } from "../search/BlacklistEnhancer";
import { CustomFlagger, FlagDefinition } from "../search/CustomFlagger";
import { HoverZoom } from "../search/HoverZoom";
import { SearchUtilities } from "../search/SearchUtilities";
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

    private openSettingsButton: JQuery<HTMLElement>;
    private utilTabButton: JQuery<HTMLElement>;
    private aboutTabButton: JQuery<HTMLElement>;

    public constructor() {
        super();
        this.registerHotkeys(
            { keys: "hotkeyOpenSettings", fnct: this.openSettings },
        );
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,
            checkUpdates: true,
            hotkeyOpenSettings: "",
        };
    }

    public create(): void {

        // Create a button in the header
        this.openSettingsButton = DomUtilities.addSettingsButton({
            id: "header-button-settings",
            name: `<i class="fas fa-wrench"></i>`,
            title: "Settings",
            tabClass: "float-right",
            attr: {
                "data-loading": "false",
                "data-updates": "0",
            },
            linkClass: "update-notification",
        });

        // Establish the settings window contents
        const $settings = new Tabbed({
            name: "settings-tabs",
            content: [
                { name: "General", structure: this.createGeneralTab() },
                { name: "Blacklist", structure: this.createBlacklistTab() },
                { name: "Downloads", structure: this.createDownloadsTab() },
                { name: "Custom Flags", structure: this.createFlagsTab() },
                { name: "Uploads and Tags", structure: this.createUploadsTab() },
                { name: "Hotkeys", structure: this.createHotkeysTab() },
                { name: "Features", structure: this.createFeaturesTab() },
                {
                    name: this.utilTabButton = $("<a>")
                        .attr({
                            "data-loading": "false",
                            "data-updates": "0",
                            "id": "conf-tab-util",
                        })
                        .addClass("update-notification")
                        .html("Utilities"),
                    structure: this.createMiscTab(),
                },
                {
                    name: this.aboutTabButton = $("<a>")
                        .attr({
                            "data-loading": "false",
                            "data-updates": "0",
                            "id": "conf-tab-about",
                        })
                        .addClass("update-notification")
                        .html("About"),
                    structure: this.createAboutTab(),
                },
            ]
        });

        // Create the modal
        new Modal({
            title: "Settings",
            triggers: [{ element: this.openSettingsButton }],
            escapable: false,
            fixed: true,
            reserveHeight: true,
            content: Form.placeholder(3),
            structure: $settings,
            position: { my: "center", at: "center" },
        });
    }

    private pushNotificationsCount(tab: "util" | "about", count = 0): void {
        this.openSettingsButton.attr(
            "data-updates",
            (parseInt(this.openSettingsButton.attr("data-updates")) || 0) + count
        );

        const button = tab == "util" ? this.utilTabButton : this.aboutTabButton;
        button.attr(
            "data-updates",
            (parseInt(this.utilTabButton.attr("data-updates")) || 0) + count
        );
    }

    /** Creates the general settings tab */
    private createGeneralTab(): Form {
        const titleCustomizer = ModuleController.get(TitleCustomizer),
            miscellaneous = ModuleController.get(Miscellaneous),
            postViewer = ModuleController.get(PostViewer),
            // blacklistEnhancer = ModuleController.get(BlacklistEnhancer),
            imageScaler = ModuleController.get(ImageScaler),
            headerCustomizer = ModuleController.get(HeaderCustomizer),
            searchUtilities = ModuleController.get(SearchUtilities),
            betterSearch = ModuleController.get(BetterSearch),
            hoverZoom = ModuleController.get(HoverZoom);

        return new Form({ name: "conf-general", columns: 3, width: 3 }, [

            Form.accordion({ name: "collapse", columns: 3, width: 3, active: 0 }, [

                // General
                Form.accordionTab({ name: "general", label: "General", columns: 3, width: 3 }, [

                    Form.div({ value: "<b>Main Page</b><br />Reroute the title page to the one specified", width: 2 }),
                    Form.select(
                        { value: Util.LS.getItem("re621.mainpage") || "default" },
                        {
                            "default": "Default",
                            "posts": "Posts",
                            "forum_topics": "Forums",
                            "blips": "Blips",
                        },
                        (value) => { Util.LS.setItem("re621.mainpage", value); }
                    ),
                    Form.spacer(3, true),

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
                        Form.div({ value: `<div class="notice">The following variables can be used:</div>`, width: 3 }),
                        Form.copy({ value: "%postid%", label: "Post ID" }),
                        Form.copy({ value: "%artist%", label: "Artist" }),
                        Form.copy({ value: "%copyright%", label: "Copyright" }),
                        Form.copy({ value: "%character%", label: "Characters" }),
                        Form.copy({ value: "%species%", label: "Species" }),
                        Form.copy({ value: "%general%", label: "General" }),
                        Form.copy({ value: "%meta%", label: "Meta" }),
                        Form.copy({ value: "%all%", label: "All Tags" }),
                    ]),
                    Form.spacer(3, true),

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

                ]),

                // Page Layout
                Form.accordionTab({ name: "layout", label: "Page Layout", columns: 3, width: 3 }, [

                    Form.checkbox(
                        {
                            value: searchUtilities.fetchSettings("improveTagCount"),
                            label: "<b>Expanded Tag Count</b><br />Replace the rounded tag count in the sidebar with the precise one",
                            width: 3,
                        },
                        async (data) => {
                            await searchUtilities.pushSettings("improveTagCount", data);
                            if (searchUtilities.isInitialized()) searchUtilities.improveTagCount(data);
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
                            if (searchUtilities.isInitialized()) searchUtilities.shortenTagNames(data);
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: searchUtilities.fetchSettings("hidePlusMinusIcons"),
                            label: "<b>Hide + and - Icons</b><br />Remove these icons from view",
                            width: 3,
                        },
                        async (data) => {
                            await searchUtilities.pushSettings("hidePlusMinusIcons", data);
                            if (searchUtilities.isInitialized()) searchUtilities.hidePlusMinusIcons(data);
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: postViewer.fetchSettings("moveChildThumbs"),
                            label: "<b>Move Related Thumbnails</b><br />Moves the parent / child thumbnails to the sidebar",
                            width: 2,
                        },
                        async (data) => {
                            await postViewer.pushSettings("moveChildThumbs", data);
                        }
                    ),
                    Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: postViewer.fetchSettings("boldenTags"),
                            label: "<b>Boldened Tags</b><br />Restore the classic boldened look on the sidebar tags",
                            width: 3,
                        },
                        async (data) => {
                            await postViewer.pushSettings("boldenTags", data);
                            postViewer.toggleBoldenedTags(data);
                        }
                    ),
                    Form.hr(3),

                    // ------------------------------------------ //

                    Form.checkbox(
                        {
                            value: miscellaneous.fetchSettings("stickyHeader"),
                            label: "<b>Fixed Header</b><br />Make the page header stick to the top when scrolling",
                            width: 3,
                        },
                        async (data) => {
                            await miscellaneous.pushSettings("stickyHeader", data);
                            miscellaneous.createStickyHeader(data);
                            $("#sidebar").trigger("re621:reflow");
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: miscellaneous.fetchSettings("stickySearchbox"),
                            label: "<b>Fixed Sidebar</b><br />Leave the sidebar controls on the screen while scrolling",
                            width: 3,
                        },
                        async (data) => {
                            await miscellaneous.pushSettings("stickySearchbox", data);
                            miscellaneous.createStickySearchbox(data);
                            $("#sidebar").trigger("re621:reflow");
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: miscellaneous.fetchSettings("stickyEditBox"),
                            label: "<b>Fixed Edit Form</b><br />Make the quick tags form stick to the top when scrolling",
                            width: 3,
                        },
                        async (data) => {
                            await miscellaneous.pushSettings("stickyEditBox", data);
                            miscellaneous.createStickyEditBox(data);
                        }
                    ),
                ]),

                // Thumbnail Enhancer
                Form.accordionTab({ name: "thumb", label: "Thumbnails", columns: 3, width: 3 }, [

                    // Upscaling
                    Form.subheader("Hi-Res Thumbnails", "Replace 150x150 thumbnails with high-resolution ones", 2),
                    Form.select(
                        { value: betterSearch.fetchSettings("imageLoadMethod"), },
                        {
                            "disabled": "Disabled",
                            "hover": "On Hover",
                            "always": "Always",
                        },
                        async (data) => {
                            await betterSearch.pushSettings("imageLoadMethod", data);
                            if (betterSearch.isInitialized()) {
                                betterSearch.reloadEventListeners();
                                betterSearch.reloadRenderedPosts();
                            }
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("autoPlayGIFs"),
                            label: "<b>Auto-Play GIFs</b><br />If disabled, animated GIFs will only play on hover",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("autoPlayGIFs", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadRenderedPosts();
                        }
                    ),
                    Form.spacer(3, true),

                    // Double-click
                    Form.subheader("Double-Click Action", "Action taken when a thumbnail is double-clicked", 2),
                    Form.select(
                        { value: betterSearch.fetchSettings("clickAction") },
                        {
                            "disabled": "Disabled",
                            "newtab": "Open New Tab",
                            "copyid": "Copy Post ID",
                            "blacklist": "Add to Blacklist",
                            "addtoset": "Add to Current Set ",
                            "toggleset": "Toggle Current Set ",
                        },
                        async (data) => {
                            await betterSearch.pushSettings("clickAction", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadRenderedPosts();
                        }
                    ),
                    Form.spacer(3, true),

                    // Preserve Hover Text
                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("hoverTags"),
                            label: "<b>Preserve Hover Text</b><br />Restores text displayed when hovering over the thumbnail",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("hoverTags", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadRenderedPosts();
                        }
                    ),
                    Form.spacer(3, true),

                    Form.collapse({ name: "scaling", columns: 3, width: 3, title: "Scaling Options", collapsed: true }, [

                        // Thumbnail Scaling
                        Form.checkbox(
                            {
                                value: betterSearch.fetchSettings("imageSizeChange"),
                                label: "<b>Thumbnail Rescaling</b><br />Resize thumbnail images according to settings below",
                                width: 3,
                            },
                            async (data) => {
                                await betterSearch.pushSettings("imageSizeChange", data);
                                if (betterSearch.isInitialized()) betterSearch.updateContentHeader();

                                $("#conf-general-collapse-thumb-scaling-thumbsize-desc").toggleClass("input-disabled", !data);
                                $("#conf-general-collapse-thumb-scaling-thumbsize")
                                    .prop("disabled", !data)
                                    .parent()
                                    .toggleClass("input-disabled", !data);
                            }
                        ),
                        Form.spacer(3, true),

                        Form.subheader(
                            "Thumbnail Size",
                            "Thumbnail card width, in pixels",
                            2,
                            "thumbsize-desc",
                            betterSearch.fetchSettings("imageSizeChange") ? undefined : "input-disabled",
                        ),
                        Form.input(
                            {
                                name: "thumbsize",
                                value: betterSearch.fetchSettings("imageWidth"),
                                title: "Number between 150 and 999",
                                required: true,
                                pattern: "^(1[5-9][0-9]|[2-9][0-9][0-9])$",
                                wrapper: betterSearch.fetchSettings("imageSizeChange") ? undefined : "input-disabled",
                                disabled: !betterSearch.fetchSettings("imageSizeChange"),
                            },
                            async (data, input) => {
                                if (input.val() == "" || !(input.get()[0] as HTMLInputElement).checkValidity()) return;
                                await betterSearch.pushSettings("imageWidth", parseInt(data));
                                if (betterSearch.isInitialized()) betterSearch.updateContentHeader();
                            }
                        ),
                        Form.spacer(3, true),

                        // ------------------------------------------ //

                        Form.checkbox(
                            {
                                name: "cropimages",
                                value: betterSearch.fetchSettings("imageRatioChange"),
                                label: "<b>Crop Images</b><br />Restrict image size to the specified ratio",
                                width: 3,
                            },
                            async (data) => {
                                await betterSearch.pushSettings("imageRatioChange", data);
                                if (betterSearch.isInitialized()) {
                                    betterSearch.updateContentHeader();
                                    betterSearch.reloadRenderedPosts();
                                }

                                $("#conf-general-collapse-thumb-scaling-cropratio-desc").toggleClass("input-disabled", !data);
                                $("#conf-general-collapse-thumb-scaling-cropratio")
                                    .prop("disabled", !data)
                                    .parent()
                                    .toggleClass("input-disabled", !data);
                            }
                        ),
                        Form.spacer(3, true),

                        Form.subheader(
                            "Image Ratio",
                            "Height to width ratio of the image",
                            2,
                            "cropratio-desc",
                            betterSearch.fetchSettings("imageRatioChange") ? undefined : "input-disabled",
                        ),
                        Form.input(
                            {
                                name: "cropratio",
                                value: betterSearch.fetchSettings("imageRatio"),
                                title: "Number between 0.1 and 1.9",
                                required: true,
                                pattern: "^([01]\\.[1-9]|1\\.0)$",
                                wrapper: betterSearch.fetchSettings("imageRatioChange") ? undefined : "input-disabled",
                                disabled: !betterSearch.fetchSettings("imageRatioChange"),
                            },
                            async (data, input) => {
                                if (input.val() == "" || !(input.get()[0] as HTMLInputElement).checkValidity()) return;
                                await betterSearch.pushSettings("imageRatio", parseFloat(data));
                                if (betterSearch.isInitialized()) {
                                    betterSearch.updateContentHeader();
                                    betterSearch.reloadRenderedPosts();
                                }
                            }
                        ),
                        Form.spacer(3, true),

                        // ------------------------------------------ //

                        Form.checkbox(
                            {
                                name: "compactMode",
                                value: betterSearch.fetchSettings("compactMode"),
                                label: "<b>Compact Mode</b><br />Limit the image height to the same value as the width",
                                width: 3,
                            },
                            async (data) => {
                                await betterSearch.pushSettings("compactMode", data);
                                if (betterSearch.isInitialized()) {
                                    betterSearch.updateContentHeader();
                                    betterSearch.reloadRenderedPosts();
                                }
                            }
                        ),
                        Form.spacer(3, true),

                        Form.subheader("Minimum Image Width", "Images narrower than this percent value will be cropped to fit", 2),
                        Form.input(
                            {
                                value: betterSearch.fetchSettings("imageMinWidth"),
                                required: true,
                                pattern: "^([1-9][0-9]|100)$",
                                title: "Number between 10 and 100",
                            },
                            async (data, input) => {
                                if (input.val() == "" || !(input.get()[0] as HTMLInputElement).checkValidity()) return;
                                await betterSearch.pushSettings("imageMinWidth", parseInt(data));
                                if (betterSearch.isInitialized()) betterSearch.updateContentHeader();
                            }
                        ),
                        Form.spacer(3, true),

                    ]),
                    Form.spacer(3, true),

                    // Voting Buttons
                    Form.checkbox(
                        {
                            name: "votebutton",
                            value: betterSearch.fetchSettings("buttonsVote"),
                            label: "<b>Voting Buttons</b><br />Adds voting buttons when hovering over a thumbnail",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("buttonsVote", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadRenderedPosts();
                        }
                    ),
                    Form.spacer(3, true),

                    // Favorite Button
                    Form.checkbox(
                        {
                            name: "favbutton",
                            value: betterSearch.fetchSettings("buttonsFav"),
                            label: "<b>Favorite Button</b><br />Adds a +favorite button when hovering over a thumbnail",
                            width: 3
                        },
                        async (data) => {
                            await betterSearch.pushSettings("buttonsFav", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadRenderedPosts();
                        }
                    ),
                    Form.spacer(3, true),

                    // Ribbons
                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("ribbonsRel"),
                            label: "<b>Relations Ribbons</b><br />Display ribbons for parent/child relationships",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("ribbonsRel", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadRenderedPosts();
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("ribbonsFlag"),
                            label: "<b>Status Ribbons</b><br />Display post status as a colored ribbon on the post",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("ribbonsFlag", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadRenderedPosts();
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("ribbonsAlt"),
                            label: "<b>Alternative Ribbons</b><br />Place the ribbons on the bottom of the thumbnail",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("ribbonsAlt", data);
                            if (betterSearch.isInitialized()) betterSearch.updateContentHeader();
                        }
                    ),

                ]),

                // Infinite Scroll
                Form.accordionTab({ name: "infscroll", label: "Scrolling and Zoom", columns: 3, width: 3 }, [

                    Form.header("Infinite Scroll", 3),

                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("infiniteScroll"),
                            label: "<b>Enable Infinite Scroll</b><br />Append the next page of posts below the current one",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("infiniteScroll", data);
                            if (betterSearch.isInitialized()) {
                                betterSearch.reloadEventListeners();
                                betterSearch.reloadPaginator();
                            }
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("loadAutomatically"),
                            label: "<b>Auto-Load Posts</b><br />Load posts automatically as you scroll, not by clicking a button",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("loadAutomatically", data);
                            if (betterSearch.isInitialized()) betterSearch.reloadEventListeners();
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("loadPrevPages"),
                            label: "<b>Preserve Scroll History</b><br />When opening a specific result page, load several previous pages as well",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("loadPrevPages", data);
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: betterSearch.fetchSettings("hidePageBreaks"),
                            label: "<b>Hide Page Separators</b><br />Display posts as one continuous section, instead of being separated by page",
                            width: 3,
                        },
                        async (data) => {
                            await betterSearch.pushSettings("hidePageBreaks", data);
                            if (betterSearch.isInitialized()) betterSearch.updateContentHeader();
                        }
                    ),
                    Form.hr(3),


                    Form.header("Hover Zoom", 3),
                    Form.div({
                        value: "<b>Zoom Mode</b><br />Increases the size of the thumbnail when hovering over it",
                        width: 2,
                    }),
                    Form.select(
                        {
                            name: "hoverzoom",
                            value: hoverZoom.fetchSettings("mode"),
                        },
                        {
                            "disabled": "Disabled",
                            "hover": "On Hover",
                            "onshift": "Holding Shift",
                        },
                        async (data) => {
                            await hoverZoom.pushSettings("mode", data);
                            if (hoverZoom.isInitialized()) hoverZoom.reloadEventListeners();
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: hoverZoom.fetchSettings("tags"),
                            label: "<b>Show Tags</b><br />Display the list of post's tags under the zoom-in image",
                            width: 3,
                        },
                        async (data) => {
                            await hoverZoom.pushSettings("tags", data);
                        }
                    ),
                    Form.spacer(3, true),

                    Form.checkbox(
                        {
                            value: hoverZoom.fetchSettings("time"),
                            label: "<b>Relative Time</b><br />Display the post's upload time in a relative format",
                            width: 3,
                        },
                        async (data) => {
                            await hoverZoom.pushSettings("time", data);
                        }
                    ),
                    Form.spacer(3, true),

                ]),

                // Miscellaneous
                Form.accordionTab({ name: "misc", label: "Other", columns: 3, width: 3 }, [

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
                        async (data) => {
                            await imageScaler.pushSettings("clickScale", data);
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: imageScaler.fetchSettings("organizeModes"),
                            label: "<b>Organize Scaling Modes</b><br />Change the order of image scaling modes so that it actually makes sense",
                            width: 2,
                        },
                        async (data) => {
                            await imageScaler.pushSettings("organizeModes", data);
                        }
                    ),
                    Form.requiresReload(),
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
                            value: headerCustomizer.fetchSettings("forumUpdateDot"),
                            label: "<b>Forum Notifications</b><br />Red dot on the Forum tab in the header if there are new posts",
                            width: 3,
                        },
                        async (data) => {
                            headerCustomizer.toggleForumDot(data);
                            await headerCustomizer.pushSettings("forumUpdateDot", data)
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: miscellaneous.fetchSettings("commitWikiLinks"),
                            label: "<b>Wiki Links in Post History</b><br />Redirect the tag links in the post history to the wiki pages",
                            width: 2,
                        },
                        async (data) => {
                            await miscellaneous.pushSettings("commitWikiLinks", data)
                        }
                    ),
                    Form.requiresReload(),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: postViewer.fetchSettings("betterImageSearch"),
                            label: "<b>Better Reverse Image Search</b><br />Dynamically select appropriate image resolutions",
                            width: 2,
                        },
                        async (data) => {
                            await postViewer.pushSettings("betterImageSearch", data)
                        }
                    ),
                    Form.requiresReload(),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: miscellaneous.fetchSettings("disableCommentRules"),
                            label: "<b>Hide the Comment Rules Warning</b><br />Removes the \"read the how to comment guide\" warning",
                            width: 3,
                        },
                        async (data) => {
                            await miscellaneous.pushSettings("disableCommentRules", data)
                            miscellaneous.handleCommentRules(data);
                        }
                    ),

                ]),

            ]),

        ]);
    }

    /** Creates the blacklist settings tab */
    private createBlacklistTab(): Form {

        const searchUtilities = ModuleController.get(SearchUtilities),
            miscellaneous = ModuleController.get(Miscellaneous),
            blacklistEnhancer = ModuleController.get(BlacklistEnhancer),
            imageScaler = ModuleController.get(ImageScaler);

        return new Form({ name: "conf-blacklist", columns: 3, width: 3 }, [

            Form.header("Blacklist Settings"),

            Form.checkbox(
                {
                    value: miscellaneous.fetchSettings("hideBlacklist"),
                    label: "<b>Hide Blacklist</b><br />Completely remove the \"Blacklisted\" section in the sidebar",
                    width: 3,
                },
                async (data) => {
                    await miscellaneous.pushSettings("hideBlacklist", data);
                    miscellaneous.hideBlacklist(data);
                }
            ),
            Form.spacer(3),

            Form.checkbox(
                {
                    value: searchUtilities.fetchSettings("quickBlacklist"),
                    label: "<b>Quick Blacklist</b><br />Click X next to the tag in the sidebar to add it to the blacklist",
                    width: 3,
                },
                async (data) => {
                    await searchUtilities.pushSettings("quickBlacklist", data);
                    searchUtilities.initQuickBlacklist(data);
                }
            ),
            Form.spacer(3),

            Form.checkbox(
                {
                    value: imageScaler.fetchSettings("clickShowFiltered"),
                    label: "<b>Click to Show Blacklisted</b><br />Click on the blacklisted image on the post page to show it",
                    width: 2,
                },
                async (data) => {
                    await imageScaler.pushSettings("clickShowFiltered", data);
                }
            ),
            Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
            Form.hr(3),

            Form.checkbox(
                {
                    value: blacklistEnhancer.fetchSettings("favorites"),
                    label: "<b>Exclude Favorites</b><br />Prevent your favorites from being filtered out by the blacklist",
                    width: 2,
                },
                async (data) => {
                    await blacklistEnhancer.pushSettings("favorites", data);
                }
            ),
            Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
            Form.spacer(3),

            Form.checkbox(
                {
                    value: blacklistEnhancer.fetchSettings("uploads"),
                    label: "<b>Exclude Uploads</b><br />Prevent your uploads from being filtered out by the blacklist",
                    width: 2,
                },
                async (data) => {
                    await blacklistEnhancer.pushSettings("uploads", data);
                }
            ),
            Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
            Form.spacer(3),

            Form.text("<b>Whitelist</b>"),
            Form.input(
                {
                    value: blacklistEnhancer.fetchSettings("whitelist"),
                    width: 2,
                },
                async (data) => { await blacklistEnhancer.pushSettings("whitelist", data); }
            ),
            Form.text(`Posts with these tags will never be filtered out`, 2),
            Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
            Form.hr(3),


            Form.text("<b>Persistent Tags</b>"),
            Form.input(
                {
                    value: searchUtilities.fetchSettings("persistentTags"),
                    width: 2,
                },
                async (data) => { await searchUtilities.pushSettings("persistentTags", data); }
            ),
            Form.text(`Tags added to every search, used to emulate server-side blacklisting`, 2),
            Form.text(`<div class="text-center text-bold">Requires a page reload</div>`, 1, "align-middle"),
            Form.spacer(3),

        ]);
    }

    /** Creates the downloads settings tab */
    private createDownloadsTab(): Form {
        const downloadCustomizer = ModuleController.get(DownloadCustomizer),
            massDownloader = ModuleController.get(MassDownloader),
            poolDownloader = ModuleController.get(PoolDownloader),
            favDownloader = ModuleController.get(FavDownloader);

        return new Form({ name: "conf-download", columns: 3, width: 3 }, [

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

            Form.accordion({ name: "collapse", columns: 3, width: 3, active: 0 }, [

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

        return new Form({ name: "conf-flags", columns: 3, width: 3 }, [
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
                <pre>-solo -duo -group -zero_pictured</pre>: posts that do not include character count tags.<br />
                <pre>tagcount:&lt;5</pre>: posts with less than 5 tags<br />
                Flag names must be unique. Duplicate tag strings are allowed, but their corresponding flag may not display.`,
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
                .on("keyup", (event) => {
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
                .on("click", () => {
                    flagContainer.remove();
                });

            return flagContainer;
        }
    }

    /** Creates the SmartAlias settings tab */
    private createUploadsTab(): Form {
        const smartAlias = ModuleController.get(SmartAlias),
            uploadUtilities = ModuleController.get(UploadUtilities);

        const aliasContainer = $("<textarea>")
            .attr("id", "alias-list-container")
            .val(smartAlias.fetchSettings<string>("data"));

        return new Form({ name: "conf-alias", columns: 3, width: 3 }, [

            Form.accordion({ name: "collapse", columns: 3, width: 3, active: 0 }, [

                // Validator Configuration
                Form.accordionTab({ name: "uploads", label: "Upload Utilities", columns: 3, width: 3 }, [

                    Form.checkbox(
                        {
                            value: uploadUtilities.fetchSettings("checkDuplicates"),
                            label: `<b>Check Duplicates</b><br />Search for visually similar images on e621 when uploading`,
                            width: 2,
                        },
                        async (data) => {
                            await uploadUtilities.pushSettings("checkDuplicates", data);
                        }
                    ),
                    Form.text(`<div class="text-center text-bold">Requires a page reload</div>`),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: uploadUtilities.fetchSettings("addSourceLinks"),
                            label: `<b>Source Link Buttons</b><br />Add utility buttons to the upload source inputs`,
                            width: 2,
                        },
                        async (data) => {
                            await uploadUtilities.pushSettings("addSourceLinks", data);
                        }
                    ),
                    Form.text(`<div class="text-center text-bold">Requires a page reload</div>`),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: uploadUtilities.fetchSettings("cleanSourceLinks"),
                            label: `<b>Clean Source Links</b><br />Convert source links to https, and remove the "www" prefix`,
                            width: 3,
                        },
                        async (data) => {
                            await uploadUtilities.pushSettings("cleanSourceLinks", data);
                        }
                    ),
                    Form.spacer(3),

                    Form.section(
                        {
                            width: 3,
                            wrapper: window["re621"].privacy ? "display-none" : undefined,
                        },
                        [
                            Form.checkbox(
                                {
                                    value: uploadUtilities.fetchSettings("loadImageData"),
                                    label: `<b>Fetch Image Data</b><br />Displays image dimensions, format, and filesize`,
                                    width: 2,
                                },
                                async (data) => {
                                    await uploadUtilities.pushSettings("loadImageData", data);
                                }
                            ),
                            Form.text(
                                `<div class="text-center text-bold">Requires a page reload</div>`
                            ),
                            Form.text(`This feature requires access to various domains not explicitly whitelisted by the script.<br />You will be prompted to approve a cross-origin request when that happens.`, 3),
                            Form.spacer(3),
                        ]),

                ]),

                // Validator Configuration
                Form.accordionTab({ name: "validatior", label: "Tag Validation", columns: 3, width: 3 }, [

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("autoLoad"),
                            label: `<b>Run Automatically</b><br />Either validate tag input as you type, or by pressing a button`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("autoLoad", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("replaceAliasedTags"),
                            label: `<b>Replace Aliases</b><br />Automatically replace aliased tag names with their consequent version`,
                            width: 3,
                        },
                        (data) => { smartAlias.pushSettings("replaceAliasedTags", data); }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("fixCommonTypos"),
                            label: `<b>Fix Common Typos</b><br />Correct several common typos in the tag fields`,
                            width: 3,
                        },
                        (data) => { smartAlias.pushSettings("fixCommonTypos", data); }
                    ),
                    Form.spacer(3),

                    Form.subheader("Tag Display Order", "How the tags should be arranged in the display box", 2),
                    Form.select(
                        { value: smartAlias.fetchSettings("tagOrder"), },
                        {
                            "default": "Original",
                            "alphabetical": "Alphabetical",
                            "grouped": "Grouped by Category",
                        },
                        (data) => { smartAlias.pushSettings("tagOrder", data); }
                    ),
                    Form.spacer(3),

                    Form.subheader("Minimum Posts Warning", "Highlight tags that have less than the specified number of posts", 2),
                    Form.input(
                        {
                            value: smartAlias.fetchSettings("minPostsWarning"),
                            width: 1,
                            pattern: "\\d+",
                        },
                        (data, input) => {
                            if (!(input.get()[0] as HTMLInputElement).checkValidity()) return;
                            smartAlias.pushSettings("minPostsWarning", data);
                        }
                    ),
                    Form.spacer(3),

                    Form.subheader("Cache Post Minimum", "Tags with this amount of posts will be cached to speed up lookups", 2),
                    Form.input(
                        {
                            value: smartAlias.fetchSettings("minCachedTags"),
                            width: 1,
                            pattern: "\\d{2,}",
                        },
                        (data, input) => {
                            if (!(input.get()[0] as HTMLInputElement).checkValidity()) return;
                            smartAlias.pushSettings("minCachedTags", data);
                        }
                    ),
                    Form.hr(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("searchForm"),
                            label: `<b>Search Form Aliases</b><br />Apply custom aliases in the tag search form`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("searchForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("compactOutput"),
                            label: `<b>Compact Display</b><br />Limit the tag information section to a set height`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("compactOutput", data);
                            smartAlias.setCompactOutput(data);
                        }
                    ),

                ]),

                Form.accordionTab({ name: "aliasref", label: "Validated Inputs", columns: 3, width: 3 }, [

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("quickTagsForm"),
                            label: `<b>Quick Tags</b><br />SmartAlias validation on the search page editing mode form`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("quickTagsForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("editTagsForm"),
                            label: `<b>Post Editing</b><br />SmartAlias validation on the individual post editing form`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("editTagsForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.hr(3),

                    Form.header("Upload Page"),
                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("uploadCharactersForm"),
                            label: `<b>Artist Tags</b>`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("uploadCharactersForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("uploadSexesForm"),
                            label: `<b>Characters</b>`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("uploadSexesForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("uploadBodyTypesForm"),
                            label: `<b>Species</b>`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("uploadBodyTypesForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("uploadThemesForm"),
                            label: `<b>Themes</b>`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("uploadThemesForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                    Form.checkbox(
                        {
                            value: smartAlias.fetchSettings("uploadTagsForm"),
                            label: `<b>Other Tags</b>`,
                            width: 3,
                        },
                        async (data) => {
                            await smartAlias.pushSettings("uploadTagsForm", data);
                            await smartAlias.reload();
                        }
                    ),
                    Form.spacer(3),

                ]),

                // Alias Definitions
                Form.accordionTab({ name: "aliasdef", label: "Alias Definitions", columns: 3, width: 3 }, [
                    Form.div({ value: aliasContainer, width: 3 }),

                    Form.button(
                        { value: "Save" },
                        async () => {
                            const confirmBox = $("span#defs-confirm").html("Saving . . .");
                            await smartAlias.pushSettings("data", $("#alias-list-container").val().toString().trim());
                            confirmBox.html("Settings Saved");
                            window.setTimeout(() => { confirmBox.html(""); }, 1000);
                        }
                    ),
                    Form.div({ value: `<span id="defs-confirm"></span>` }),
                    Form.div({
                        value: `<div class="float-right">[ <a href="https://github.com/re621/re621/wiki/SmartAlias">syntax help</a> ]</div>`
                    })
                ]),

            ]),
        ]);

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

        /** Creates and returns two keybind inputs and a label */
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

            async function handleRebinding(data: string, index: 0 | 1): Promise<void> {
                bindings[index] = data;
                await module.pushSettings(settingsKey, bindings.join("|"));
                await module.resetHotkeys();
            }
        }

        /** Creates and returns a label, a keybind input, and a text input */
        function createCustomInputs(module: RE6Module, label: string, dataLabel: string, settingsKey: string, pattern?: string): FormElement[] {
            const values = module.fetchSettings(settingsKey).split("|"),
                dataVal = module.fetchSettings(settingsKey + "_data");
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
                Form.input(
                    {
                        value: dataVal,
                        label: dataLabel,
                        pattern: pattern,
                    },
                    async (data, input) => {
                        if (!(input.get()[0] as HTMLInputElement).checkValidity()) return;
                        await module.pushSettings(settingsKey + "_data", data)
                    }
                )
            ];

            async function handleRebinding(data: string, index: 0 | 1): Promise<void> {
                bindings[index] = data;
                await module.pushSettings(settingsKey, bindings.join("|"));
                await module.resetHotkeys();
            }
        }

        return new Form({ name: "conf-hotkeys", columns: 3, width: 3 }, [
            // Listing
            Form.header("Listing", 3),
            ...createInputs(searchUtilities, "Search", "hotkeyFocusSearch"),
            ...createInputs(searchUtilities, "Random Post", "hotkeyRandomPost"),
            ...createInputs(miscellaneous, "Toggle Blacklist", "hotkeyToggleBlacklist"),
            Form.hr(3),

            // Posts
            Form.header("Posts", 3),
            ...createInputs(postViewer, "Upvote Post", "hotkeyUpvoteNU"),
            ...createInputs(postViewer, "Toggle Upvote", "hotkeyUpvote"),
            ...createInputs(postViewer, "Downvote Post", "hotkeyDownvoteNU"),
            ...createInputs(postViewer, "Toggle Downvote", "hotkeyDownvote"),

            ...createInputs(postViewer, "Toggle Favorite", "hotkeyFavorite"),
            ...createInputs(postViewer, "Add to Favorites", "hotkeyAddFavorite"),
            ...createInputs(postViewer, "Remove From Favorites", "hotkeyRemoveFavorite"),
            ...createInputs(imageScaler, "Fullscreen Mode", "hotkeyFullscreen"),
            Form.spacer(3, true),

            ...createInputs(poolNavigator, "Previous Post", "hotkeyPrev"),
            ...createInputs(poolNavigator, "Next Post", "hotkeyNext"),
            ...createInputs(poolNavigator, "Cycle Navigation", "hotkeyCycle"),
            ...createInputs(imageScaler, "Change Scale", "hotkeyScale"),
            Form.spacer(3, true),

            ...createInputs(postViewer, "Open `Add to Set` Dialog", "hotkeyAddSet"),
            ...createInputs(postViewer, "Open `Add to Pool` Dialog", "hotkeyAddPool"),
            ...createInputs(postViewer, "Toggle Current Set", "hotkeyToggleSetLatest"),
            ...createInputs(postViewer, "Add to Current Set", "hotkeyAddSetLatest"),
            ...createInputs(postViewer, "Remove from Current Set", "hotkeyRemoveSetLatest"),
            Form.spacer(3, true),

            ...createCustomInputs(postViewer, "Add to Set", "Set ID", "hotkeyAddSetCustom1", "\\d+"),
            ...createCustomInputs(postViewer, "Add to Set", "Set ID", "hotkeyAddSetCustom2", "\\d+"),
            ...createCustomInputs(postViewer, "Add to Set", "Set ID", "hotkeyAddSetCustom3", "\\d+"),
            Form.hr(3),

            // Actions
            Form.section(
                {
                    columns: 3,
                    width: 3,
                },
                [
                    Form.header("Actions", 3),
                    ...createInputs(miscellaneous, "New Comment", "hotkeyNewComment"),
                    ...createInputs(miscellaneous, "Edit Post", "hotkeyEditPost"),
                    ...createInputs(postViewer, "Toggle Notes", "hotkeyHideNotes"),
                    ...createInputs(postViewer, "Edit Notes", "hotkeyNewNote"),
                    ...createInputs(postViewer, "Post History", "hotkeyOpenHistory"),
                    ...createInputs(postViewer, "Go To Artist", "hotkeyOpenArtist"),
                    ...createInputs(postViewer, "Go To Source", "hotkeyOpenSource"),
                    ...createInputs(postViewer, "Go To Parent", "hotkeyOpenParent"),
                    ...createInputs(postViewer, "Toggle Child Posts", "hotkeyToggleRel"),
                    ...createInputs(postViewer, "Open IQDB", "hotkeyOpenIQDB"),
                    Form.hr(3),
                ]
            ),

            // Modes
            Form.header("Search Modes", 3),
            ...createInputs(searchUtilities, "View", "hotkeySwitchModeView"),
            ...createInputs(searchUtilities, "Edit", "hotkeySwitchModeEdit"),
            ...createInputs(searchUtilities, "Fullscreen", "hotkeySwitchModeOpen"),
            ...createInputs(searchUtilities, "Add Favorite", "hotkeySwitchModeAddFav"),
            ...createInputs(searchUtilities, "Remove Favorite", "hotkeySwitchModeRemFav"),
            ...createInputs(searchUtilities, "Blacklist", "hotkeySwitchModeBlacklist"),
            ...createInputs(searchUtilities, "Add to Set", "hotkeySwitchModeAddSet"),
            ...createInputs(searchUtilities, "Remove from Set", "hotkeySwitchModeRemSet"),
            Form.hr(3),

            // Tag Scripts
            Form.section(
                {
                    columns: 3,
                    width: 3,
                    wrapper: undefined, // TODO Hide from member-level users
                },
                [
                    Form.header("Tag Scripts", 3),

                    ...createInputs(searchUtilities, "Tag Script", "hotkeySwitchModeScript"),
                    Form.spacer(3),

                    ...createInputs(searchUtilities, "Script #1", "hotkeyScriptOne"),
                    ...createInputs(searchUtilities, "Script #2", "hotkeyScriptTwo"),
                    ...createInputs(searchUtilities, "Script #3", "hotkeyScriptThree"),
                    ...createInputs(searchUtilities, "Script #4", "hotkeyScriptFour"),
                    ...createInputs(searchUtilities, "Script #5", "hotkeyScriptFive"),
                    ...createInputs(searchUtilities, "Script #6", "hotkeyScriptSix"),
                    ...createInputs(searchUtilities, "Script #7", "hotkeyScriptSeven"),
                    ...createInputs(searchUtilities, "Script #8", "hotkeyScriptEight"),
                    ...createInputs(searchUtilities, "Script #9", "hotkeyScriptNine"),
                    ...createInputs(searchUtilities, "Script #0", "hotkeyScriptTen"),
                    Form.hr(3),
                ]
            ),


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
            ...createInputs(miscellaneous, "Random Set Post", "hotkeyRandomSetPost"),
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

            ...createInput("BetterSearch", "Improved Thumbnails", "Massively overhauled thumbnail system. Many features will not work with this module disabled."),

            ...createInput("HeaderCustomizer", "Header Customizer", "Add, delete, and customize header links to your heart's content."),

            ...createInput("InstantFilters", "Instant Filters", "Quickly add filters to your current search."),

            ...createInput("FormattingManager", "Formatting Helper", "Fully customizable toolbar for easy DText formatting."),

            ...createInput("SmartAlias", "Smart Alias", "A more intelligent way to quickly fill out post tags."),
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

        let dnpcacheUpdated = true;

        // Create the settings form
        return new Form({ name: "conf-misc", columns: 3, width: 3 }, [
            Form.header("Miscellaneous", 3),

            Form.accordion({ name: "collapse", columns: 3, width: 3, active: 0 }, [

                Form.accordionTab({ name: "cache", label: "Cache", columns: 3, width: 3 }, [

                    Form.section({ name: "tagcache", columns: 3, width: 3 }, [

                        Form.div({
                            value: `<b>Tag Cache</b><br />Used to speed up SmartAlias tag checking`,
                            width: 2,
                        }),
                        Form.button({ name: "reset", value: "Clear", }, async (data, input) => {
                            TagCache.clear();
                            input.html("Done!");
                            window.setTimeout(() => { input.html("Clear"); }, 1000);
                        }),

                    ]),
                    Form.spacer(3),

                    Form.section({ name: "dnpcache", columns: 3, width: 3 }, [

                        Form.div({
                            value: `<b>Avoid Posting Cache</b><br />Used to validate the artist tags against the DNP list`,
                            width: 2,
                        }),
                        Form.button({ name: "reset", value: "Reset", }, async (data, input) => {
                            input.prop("disabled", "true");
                            await AvoidPosting.update($("#dnpcache-status"));
                            input.prop("disabled", "false");

                            if (dnpcacheUpdated) return;
                            dnpcacheUpdated = false;
                            this.pushNotificationsCount("util", -1);
                        }),
                        Form.div({
                            value: async (element) => {
                                const $status = $("<div>")
                                    .attr("id", "dnpcache-status")
                                    .html(`<i class="fas fa-circle-notch fa-spin"></i> Initializing . . .`)
                                    .appendTo(element);

                                if (AvoidPosting.getUpdateTime() == 0)
                                    await AvoidPosting.update();

                                if (AvoidPosting.size() == 0) {
                                    $status.html(`
                                        <i class="far fa-times-circle"></i> 
                                        <span style="color:gold">Reset required</span>: Cache integrity failure
                                    `);

                                    this.pushNotificationsCount("util", 1);
                                    dnpcacheUpdated = true;
                                } else $status.html(`<i class="far fa-check-circle"></i> Cache integrity verified`)
                            },
                            width: 2,
                        }),
                        Form.div({
                            value: (element) => {
                                const lastUpdate = AvoidPosting.getUpdateTime();
                                if (lastUpdate) element.html(Util.Time.format(lastUpdate));
                                else element.html("");
                            },
                            wrapper: "text-center input-disabled",
                        })

                    ]),

                ]),

                Form.accordionTab({ name: "export", label: "Import / Export", columns: 3, width: 3 }, [

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

                ]),

                // Reset Configuration
                Form.accordionTab({ name: "reset", label: "Reset Modules", columns: 3, width: 3 }, [

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
                    Form.spacer(3),

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
                    Form.spacer(3),

                ]),

                // Debug Settings
                Form.accordionTab({ name: "debug", label: "Debugging Tools", columns: 3, width: 3 }, [

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
                    Form.spacer(3),

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
                    Form.spacer(3),

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
                    Form.spacer(3),
                ]),
            ]),
        ]);

        /** Export the current module settings to file */
        function exportToFile(): void {

            const promises: Promise<any>[] = [];
            ModuleController.getAll().forEach((module) => {
                promises.push(module.getSavedSettings());
            });

            Promise.all(promises).then((response) => {
                Debug.log(response);

                const storedData = { "meta": "re621/1.0" };
                response.forEach((data) => {
                    storedData[data.name] = data.data;
                    if (storedData[data.name]["cache"]) storedData[data.name]["cache"] = {};
                });

                Util.downloadAsJSON(storedData, "re621-" + User.username + "-userdata");
            })
        }

        /** Import module settings from file */
        function importFromFile(data: any): void {
            if (!data) return;
            const $info = $("#file-import-status").html("Loading . . .");

            const reader = new FileReader();
            reader.readAsText(data[0], "UTF-8");
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
            const $info = $("#file-esix-status").html("Loading . . .");

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
            const $info = $("#localstorage-esix-status").html("Loading . . .");

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

        if (VersionChecker.hasUpdate && this.fetchSettings("checkUpdates"))
            this.pushNotificationsCount("about", 1);

        return new Form({ name: "conf-about", columns: 3, width: 3 }, [
            // About
            Form.div({
                value:
                    `<h3 class="display-inline"><a href="${window["re621"]["links"]["website"]}" target="_blank">${window["re621"]["name"]} v.${VersionChecker.scriptBuild}</a></h3>` +
                    ` <span class="display-inline">build ${window["re621"]["build"]}:${Patcher.version}</span>`,
                width: 2
            }),
            Form.div({
                value:
                    `<span class="float-right" id="project-update-button" data-available="${VersionChecker.hasUpdate}">
                    <a href="${window["re621"]["links"]["releases"]}" target="_blank">Update Available</a>
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

            Form.checkbox(
                {
                    label: "<b>Show Update Notification</b><br />Display a red dot over the settings icon if an update is available",
                    value: this.fetchSettings("checkUpdates"),
                    width: 3,
                },
                async (data) => {
                    console.log(data);
                    await this.pushSettings("checkUpdates", data);
                }
            ),
            Form.spacer(3),

            // Changelog
            Form.header(`<a href="${window["re621"]["links"]["releases"]}" target="_blank" class="unmargin">What's new?</a>`, 3),
            Form.div({ value: `<div id="changelog-list"><h5>Version ${VersionChecker.latestBuild}</h5>${VersionChecker.changesHTML}</div>`, width: 3 })
        ]);
    }

    /**
     * Toggles the settings window
     */
    private openSettings(): void {
        $("a#header-button-settings")[0].click();
    }

}
