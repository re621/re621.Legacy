/**
 * RE621 - E621 Reimagined
 * Script root. Better keep this place tidy.
 */

// Load Modules
import { Danbooru } from "./components/api/Danbooru";
import { Page, PageDefinition } from "./components/data/Page";
import { User } from "./components/data/User";
import { ModuleController } from "./components/ModuleController";
import { CleanSlate } from "./components/structure/CleanSlate";
import { StartupTasks } from "./components/structure/StartupTasks";
import { Debug } from "./components/utility/Debug";
import { Patcher } from "./components/utility/Patcher";
import { Util } from "./components/utility/Util";
import { VersionChecker } from "./components/utility/VersionChecker";
import { FavDownloader } from "./modules/downloader/FavDownloader";
import { MassDownloader } from "./modules/downloader/MassDownloader";
import { PoolDownloader } from "./modules/downloader/PoolDownloader";
import { CommentBlacklist } from "./modules/general/CommentBlacklist";
import { CompatibilityPatcher } from "./modules/general/CompatibilityPatcher";
import { FormattingExtender } from "./modules/general/FormattingExtender";
import { HeaderCustomizer } from "./modules/general/HeaderCustomizer";
import { JanitorEnhancements } from "./modules/general/JanitorEnhancements";
import { Miscellaneous } from "./modules/general/Miscellaneous";
import { SettingsController } from "./modules/general/SettingsController";
import { ThemeCustomizer } from "./modules/general/ThemeCustomizer";
import { EditTracker } from "./modules/misc/EditTracker";
import { ScriptAssistant } from "./modules/misc/ScriptAssistant";
import { SmartAlias } from "./modules/misc/SmartAlias";
import { TagSuggester } from "./modules/misc/TagSuggester";
import { UploadUtilities } from "./modules/misc/UploadUtilities";
import { WikiEnhancer } from "./modules/misc/WikiEnhancer";
import { DownloadCustomizer } from "./modules/post/DownloadCustomizer";
import { ImageScaler } from "./modules/post/ImageScaler";
import { PoolNavigator } from "./modules/post/PoolNavigator";
import { PostViewer } from "./modules/post/PostViewer";
import { TitleCustomizer } from "./modules/post/TitleCustomizer";
import { BetterSearch } from "./modules/search/BetterSearch";
import { BlacklistEnhancer } from "./modules/search/BlacklistEnhancer";
import { CustomFlagger } from "./modules/search/CustomFlagger";
import { HoverZoom } from "./modules/search/HoverZoom";
import { InstantFilters } from "./modules/search/InstantFilters";
import { PostSuggester } from "./modules/search/PostSuggester";
import { ProgressTracker } from "./modules/search/ProgressTracker";
import { SearchUtilities } from "./modules/search/SearchUtilities";
import { ThumbnailTweaks } from "./modules/search/ThumbnailTweaks";
import { CommentTracker } from "./modules/subscriptions/CommentTracker";
import { ForumTracker } from "./modules/subscriptions/ForumTracker";
import { PoolTracker } from "./modules/subscriptions/PoolTracker";
import { TagTracker } from "./modules/subscriptions/TagTracker";
import { SubscriptionManager } from "./modules/subscriptions/_SubscriptionManager";


const loadOrder = [
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

const subscriptions = [
    TagTracker,
    PoolTracker,
    ForumTracker,
    CommentTracker,
];

// Show the script version in the console
console.log(`${window["re621"]["name"]} v.${window["re621"]["version"]} build ${window["re621"]["build"]}`);

// Reroute the title page before everything else loads
if (Page.matches(PageDefinition.title)) {
    const page = Util.LS.getItem("re621.mainpage");
    if (page && page !== "default") window.location.replace("/" + page);
}

// Disable existing keyboard shortcuts
Danbooru.Utility.disableShortcuts(true);

// Create the basic DOM structure
CleanSlate.createDOM().then(async () => {

    // Abort loading the script
    // This is a workaround for the fact that the title page
    // is missing the blacklist data, causing issues with
    // subscriptions
    if (Page.matches(PageDefinition.title)) return;

    // Disable existing keyboard shortcuts, again.
    // Workaround made specificially for one user who presses 
    // the Edit hotkey immediately after the post page loads.
    // You know who you are.
    Danbooru.Utility.disableShortcuts(true);

    StartupTasks.createSearchbox();
    StartupTasks.createTagList();

    await Debug.init();
    await Patcher.patchConfig();
    await VersionChecker.init();

    User.init();

    // Subscriptions have to be registered before the SubscriptionManager
    await ModuleController.register(subscriptions);
    await SubscriptionManager.register(subscriptions);

    // Register the rest of the modules
    await ModuleController.register(loadOrder);

});
