import css from "./css/style.module.scss";
import AvoidPosting from "./js/cache/AvoidPosting";
import { ModuleController } from "./js/models.old/ModuleController";
import Danbooru from "./js/models/api/Danbooru";

import { FavDownloader } from "./js/components/downloader/FavDownloader";
import { MassDownloader } from "./js/components/downloader/MassDownloader";
import { PoolDownloader } from "./js/components/downloader/PoolDownloader";
import { CommentBlacklist } from "./js/components/general/CommentBlacklist";
import { CompatibilityPatcher } from "./js/components/general/CompatibilityPatcher";
import { FormattingExtender } from "./js/components/general/FormattingExtender";
import { HeaderCustomizer } from "./js/components/general/HeaderCustomizer";
import { JanitorEnhancements } from "./js/components/general/JanitorEnhancements";
import { Miscellaneous } from "./js/components/general/Miscellaneous";
import { SettingsController } from "./js/components/general/SettingsController";
import { ThemeCustomizer } from "./js/components/general/ThemeCustomizer";
import { EditTracker } from "./js/components/misc/EditTracker";
import { ScriptAssistant } from "./js/components/misc/ScriptAssistant";
import { SmartAlias } from "./js/components/misc/SmartAlias";
import { TagSuggester } from "./js/components/misc/TagSuggester";
import { UploadUtilities } from "./js/components/misc/UploadUtilities";
import { WikiEnhancer } from "./js/components/misc/WikiEnhancer";
import { DownloadCustomizer } from "./js/components/post/DownloadCustomizer";
import { ImageScaler } from "./js/components/post/ImageScaler";
import { PoolNavigator } from "./js/components/post/PoolNavigator";
import { PostViewer } from "./js/components/post/PostViewer";
import { TitleCustomizer } from "./js/components/post/TitleCustomizer";
import { BetterSearch } from "./js/components/search/BetterSearch";
import { BlacklistEnhancer } from "./js/components/search/BlacklistEnhancer";
import { CustomFlagger } from "./js/components/search/CustomFlagger";
import { HoverZoom } from "./js/components/search/HoverZoom";
import { InstantFilters } from "./js/components/search/InstantFilters";
import { PostSuggester } from "./js/components/search/PostSuggester";
import { ProgressTracker } from "./js/components/search/ProgressTracker";
import { SearchUtilities } from "./js/components/search/SearchUtilities";
import { ThumbnailTweaks } from "./js/components/search/ThumbnailTweaks";
import { CommentTracker } from "./js/components/subscriptions/CommentTracker";
import { ForumTracker } from "./js/components/subscriptions/ForumTracker";
import { PoolTracker } from "./js/components/subscriptions/PoolTracker";
import { TagTracker } from "./js/components/subscriptions/TagTracker";
import { SubscriptionManager } from "./js/components/subscriptions/_SubscriptionManager";
import { IgnoredPages, Page, PageDefinition } from "./js/models/data/Page";
import Script from "./js/models/data/Script";
import User from "./js/models/data/User";
import Version from "./js/models/data/Version";
import PageObserver from "./js/models/structure/PageObserver";
import { Debug } from "./js/utility/Debug";
import { ErrorHandler } from "./js/utility/ErrorHandler";
import { Patcher } from "./js/utility/Patcher";
import { Util } from "./js/utility/Util";

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
