/**
 * RE:621 - e621 Reimagined
 * Script root. Better keep this place tidy.
 */

// Load Modules
import { ModuleController } from "./components/ModuleController";
import { DomUtilities } from "./components/structure/DomUtilities";
import { FormattingManager } from "./modules/general/FormattingHelper";
import { HeaderCustomizer } from "./modules/general/HeaderCustomizer";
import { Miscellaneous } from "./modules/general/Miscellaneous";
import { SettingsController } from "./modules/general/SettingsController";
import { ThemeCustomizer } from "./modules/general/ThemeCustomizer";
import { TinyAlias } from "./modules/misc/TinyAlias";
import { WikiEnhancer } from "./modules/misc/WikiEnhancer";
import { PoolDownloader } from "./modules/pools/PoolDownloader";
import { DownloadCustomizer } from "./modules/post/DownloadCustomizer";
import { ImageScaler } from "./modules/post/ImageScaler";
import { PoolNavigator } from "./modules/post/PoolNavigator";
import { PostViewer } from "./modules/post/PostViewer";
import { TitleCustomizer } from "./modules/post/TitleCustomizer";
import { BlacklistEnhancer } from "./modules/search/BlacklistEnhancer";
import { InfiniteScroll } from "./modules/search/InfiniteScroll";
import { InstantSearch } from "./modules/search/InstantSearch";
import { MassDownloader } from "./modules/search/MassDownloader";
import { PostSuggester } from "./modules/search/PostSuggester";
import { ThumbnailEnhancer } from "./modules/search/ThumbnailsEnhancer";
import { CommentSubscriptions } from "./modules/subscriptions/CommentSubscriptions";
import { ForumSubscriptions } from "./modules/subscriptions/ForumSubscriptions";
import { PoolSubscriptions } from "./modules/subscriptions/PoolSubscriptions";
import { SubscriptionManager } from "./modules/subscriptions/SubscriptionManager";
import { TagSubscriptions } from "./modules/subscriptions/TagSubscriptions";


const loadOrder = [
    FormattingManager,
    HeaderCustomizer,
    ThemeCustomizer,

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
    PostSuggester,
    Miscellaneous,

    TinyAlias,
    WikiEnhancer,

    PoolDownloader,

    SubscriptionManager,
    SettingsController,
];

const subscriptions = [
    PoolSubscriptions,
    ForumSubscriptions,
    TagSubscriptions,
    CommentSubscriptions,
];

DomUtilities.createStructure().then(() => {

    // This code is pretty fragile. It's also what makes the rest of the project work.
    // It is dependent on the previous step, which runs when the document fully loads
    // If that changes, this will need to be wrapped in `$(() => { ... });`

    // Subscriptions have to be registered before the SubscriptionManager
    ModuleController.register(subscriptions);
    SubscriptionManager.register(subscriptions);

    // Register the rest of the modules
    ModuleController.register(loadOrder);
});
