import { ModuleController } from "./js/components/ModuleController";
import { Danbooru } from "./js/components/api/Danbooru";
import AvoidPosting from "./js/components/cache/AvoidPosting";
import css from "./scss/style.module.scss";

import { IgnoredPages, Page, PageDefinition } from "./js/components/data/Page";
import { User } from "./js/components/data/User";
import { Debug } from "./js/components/utility/Debug";
import { ErrorHandler } from "./js/components/utility/ErrorHandler";
import { Patcher } from "./js/components/utility/Patcher";
import { Util } from "./js/components/utility/Util";
import Script from "./js/models/data/Script";
import Version from "./js/models/data/Version";
import PageObserver from "./js/models/structure/PageObserver";
import { FavDownloader } from "./js/modules/downloader/FavDownloader";
import { MassDownloader } from "./js/modules/downloader/MassDownloader";
import { PoolDownloader } from "./js/modules/downloader/PoolDownloader";
import { CommentBlacklist } from "./js/modules/general/CommentBlacklist";
import { CompatibilityPatcher } from "./js/modules/general/CompatibilityPatcher";
import { FormattingExtender } from "./js/modules/general/FormattingExtender";
import { HeaderCustomizer } from "./js/modules/general/HeaderCustomizer";
import { JanitorEnhancements } from "./js/modules/general/JanitorEnhancements";
import { Miscellaneous } from "./js/modules/general/Miscellaneous";
import { SettingsController } from "./js/modules/general/SettingsController";
import { ThemeCustomizer } from "./js/modules/general/ThemeCustomizer";
import { EditTracker } from "./js/modules/misc/EditTracker";
import { ScriptAssistant } from "./js/modules/misc/ScriptAssistant";
import { SmartAlias } from "./js/modules/misc/SmartAlias";
import { TagSuggester } from "./js/modules/misc/TagSuggester";
import { UploadUtilities } from "./js/modules/misc/UploadUtilities";
import { WikiEnhancer } from "./js/modules/misc/WikiEnhancer";
import { DownloadCustomizer } from "./js/modules/post/DownloadCustomizer";
import { ImageScaler } from "./js/modules/post/ImageScaler";
import { PoolNavigator } from "./js/modules/post/PoolNavigator";
import { PostViewer } from "./js/modules/post/PostViewer";
import { TitleCustomizer } from "./js/modules/post/TitleCustomizer";
import { BetterSearch } from "./js/modules/search/BetterSearch";
import { BlacklistEnhancer } from "./js/modules/search/BlacklistEnhancer";
import { CustomFlagger } from "./js/modules/search/CustomFlagger";
import { HoverZoom } from "./js/modules/search/HoverZoom";
import { InstantFilters } from "./js/modules/search/InstantFilters";
import { PostSuggester } from "./js/modules/search/PostSuggester";
import { ProgressTracker } from "./js/modules/search/ProgressTracker";
import { SearchUtilities } from "./js/modules/search/SearchUtilities";
import { ThumbnailTweaks } from "./js/modules/search/ThumbnailTweaks";
import { CommentTracker } from "./js/modules/subscriptions/CommentTracker";
import { ForumTracker } from "./js/modules/subscriptions/ForumTracker";
import { PoolTracker } from "./js/modules/subscriptions/PoolTracker";
import { TagTracker } from "./js/modules/subscriptions/TagTracker";
import { SubscriptionManager } from "./js/modules/subscriptions/_SubscriptionManager";

export default class RE621 {

    // public static Registry: ComponentListAnnotated = {};
    public static Registry = {};

    private loadOrder = [
        FormattingExtender,
        HeaderCustomizer,
        ThemeCustomizer,
    
        DownloadCustomizer,
        ImageScaler,
        PostViewer,
        PoolNavigator,
        TitleCustomizer,
    
        BlacklistEnhancer,
        CustomFlagger,
        ThumbnailTweaks,
        BetterSearch,
        InstantFilters,
        HoverZoom,
        ProgressTracker,
    
        PostSuggester,
        SearchUtilities,
        Miscellaneous,
    
        SmartAlias,
        TagSuggester,
        EditTracker,
        WikiEnhancer,
        UploadUtilities,
        ScriptAssistant,
        CommentBlacklist,
        JanitorEnhancements,
    
        FavDownloader,
        PoolDownloader,
        MassDownloader,
    
        SubscriptionManager,
        CompatibilityPatcher,
        SettingsController,
    ];

    private subscriptions = [
        TagTracker,
        PoolTracker,
        ForumTracker,
        CommentTracker,
    ];

    public async run(): Promise<void> {

        if (Page.matches(IgnoredPages)) return;

        console.log("%c[RE621]%c v." + Script.version, "color: maroon", "color: unset");

        // Reroute the title page before everything else loads
        if (Page.matches(PageDefinition.root)) {
            const page = Util.LS.getItem("re621.mainpage");
            if (page && page !== "default") window.location.replace("/" + page);
            return;
        }

        // Load assets
        await Debug.init();
        await Version.init();
        await AvoidPosting.init();
        await Patcher.patchConfig();

        // Disable existing keyboard shortcuts
        Danbooru.Shortcuts.disabled = true;

        // Initialize basic functionality
        let headLoaded: Promise<void>, bodyLoaded: Promise<void>, pageLoaded: Promise<boolean>;
        try {
            Debug.log("+ Page Observer");
            PageObserver.init();

            // Append the CSS to head, and make sure it overrides other styles
            headLoaded = PageObserver.watch("head").then(() => {
                Debug.log("+ HEAD is ready");
                const styleElement = Util.DOM.addStyle(css);
                $(() => { styleElement.appendTo("head"); });
            });

            bodyLoaded = PageObserver.watch("body").then(() => {
                Debug.log("+ BODY is ready");
                $("body").attr("re621", Script.version);
                Danbooru.Shortcuts.disabled = true;
                Util.DOM.setupDialogContainer(); // TODO Move to the dialog class
                User.init();
            });

            pageLoaded = PageObserver.watch("#page");

            PageObserver.watch("menu.main").then((result) => {
                if (!result) {
                    Debug.log("+ MENU missing");
                    return;
                }
                Debug.log("+ MENU is ready");
                Util.DOM.patchHeader();
            });

            if (Page.matches([PageDefinition.posts.list, PageDefinition.posts.view, PageDefinition.favorites]))
                PageObserver.watch("section#mode-box").then((result) => {
                    if (!result) return;
                    Util.DOM.setupSearchBox();
                });
        } catch (error) {
            ErrorHandler.log("An error ocurred during script initialization", error);
            return;
        }


        // Start loading components
        await Promise.all([headLoaded, bodyLoaded]);

        // Bootstrap settings (synchronous)
        /*
        for (const module of this.loadOrder) {
            const instance = new module();
            RE621.Registry[instance.getName()] = instance;
            await instance.bootstrapSettings();
        }
        Util.Events.trigger("re621:bootstrap");

        // Load modules (asynchronous)
        const promises: Promise<void>[] = [];
        for (const instance of Object.values(RE621.Registry))
            promises.push(instance.load());
        Promise.all(promises).then(() => {
            console.log("%c[RE621]%c loaded", "color: maroon", "color: unset");
        });
        */
       
        User.init();

        await pageLoaded;

        // Subscriptions have to be registered before the SubscriptionManager
        await ModuleController.register(this.subscriptions);
        await SubscriptionManager.register(this.subscriptions);

        // Register the rest of the modules
        await ModuleController.register(this.loadOrder);
    }

}
new RE621().run();

/*
interface ComponentListAnnotated extends ComponentList {
    // Header
    HeaderCustomizer?: HeaderCustomizer,
    ThemeCustomizer?: ThemeCustomizer,
    DMailHeaderButton?: HeaderButtons,

    // General
    FormattingExtender?: FormattingExtender,

    // Posts
    ThumbnailEngine?: ThumbnailEngine,
    ThumbnailResizer?: ThumbnailResizer,
    PostViewer?: PostViewer,
    BlacklistUI?: BlacklistUI,
    HoverZoom?: HoverZoom,
    CommentBlacklist?: CommentBlacklist,
    ModeExtender?: ModeExtender,

    // Tags
    SmartAlias?: SmartAlias,
    EditTracker?: EditTracker,
    UploadUtilities?: UploadUtilities,

    // Minor
    Miscellaneous?: Miscellaneous,
    ProfileEnhancer?: ProfileEnhancer,
    QuoteTools?: QuoteTools,
    StickyElements?: StickyElements,
    WikiEnhancer?: WikiEnhancer,

    // Subscriptions
    SubscriptionManager?: SubscriptionManager,
    CommentTracker?: CommentTracker,
    ForumTracker?: ForumTracker,
    PoolTracker?: PoolTracker,
    TagTracker?: TagTracker,

    // Settings
    SettingsManager?: SettingsManager,
}
*/
