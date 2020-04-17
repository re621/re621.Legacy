/**
 * RE:621 - e621 Reimagined
 * Script root. Better keep this place tidy.
 */

// Load Modules
// - requied
import { DomUtilities } from "./components/structure/DomUtilities";
import { ModuleController } from "./components/ModuleController";
// - general
import { FormattingManager } from "./modules/general/FormattingHelper";
import { HeaderCustomizer } from "./modules/general/HeaderCustomizer";
import { Miscellaneous } from "./modules/general/Miscellaneous";
import { ThemeCustomizer } from "./modules/general/ThemeCustomizer";
// - post
import { DownloadCustomizer } from "./modules/post/DownloadCustomizer";
import { ImageScaler } from "./modules/post/ImageScaler";
import { PoolNavigator } from "./modules/post/PoolNavigator";
import { PostViewer } from "./modules/post/PostViewer";
import { TitleCustomizer } from "./modules/post/TitleCustomizer";
// - search
import { BlacklistEnhancer } from "./modules/search/BlacklistEnhancer";
import { InstantSearch } from "./modules/search/InstantSearch";
import { InfiniteScroll } from "./modules/search/InfiniteScroll";
import { MassDownloader } from "./modules/search/MassDownloader";
import { ThumbnailEnhancer } from "./modules/search/ThumbnailsEnhancer";
// - misc
import { TinyAlias } from "./modules/misc/TinyAlias";
import { WikiEnhancer } from "./modules/misc/WikiEnhancer";
// - pools
import { PoolDownloader } from "./modules/pools/PoolDownloader";
// - subscriptions
import { SubscriptionManager } from "./modules/subscriptions/SubscriptionManager";
import { ForumSubscriptions } from "./modules/subscriptions/ForumSubscriptions";
import { PoolSubscriptions } from "./modules/subscriptions/PoolSubscriptions";
import { TagSubscriptions } from "./modules/subscriptions/TagSubscriptions";
// - settings
import { SettingsController } from "./modules/general/SettingsController";
import { ErrorHandler } from "./components/ErrorHandler";


const loadOrder = [
    FormattingManager,
    HeaderCustomizer,
    ThemeCustomizer,
    Miscellaneous,

    DownloadCustomizer,
    ImageScaler,
    PoolNavigator,
    PostViewer,
    TitleCustomizer,

    BlacklistEnhancer,
    InfiniteScroll,
    InstantSearch,
    MassDownloader,
    ThumbnailEnhancer,

    TinyAlias,
    WikiEnhancer,

    PoolDownloader,

    SubscriptionManager,
    SettingsController
];

const subscriptions = [
    PoolSubscriptions,
    ForumSubscriptions,
    TagSubscriptions
];

(function (): void {

    try { DomUtilities.createStructure(); }
    catch (error) { ErrorHandler.error("DOM", error.stack, "init"); }

    subscriptions.forEach(module => {
        ModuleController.register(module);
        SubscriptionManager.register(module);
    });

    ModuleController.register(loadOrder);

})();
