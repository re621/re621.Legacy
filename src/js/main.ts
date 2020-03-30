/**
 * RE:621 - e621 Reimagined
 * Script root. Better keep this place tidy.
 */

// Load Modules
// - requied
import { StructureUtilities } from "./modules/general/StructureUtilities";
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
// - upload
import { TinyAlias } from "./modules/upload/TinyAlias";

// - subscribers
import { SubscriptionManager } from "./modules/subscriptions/SubscriptionManager";
import { ForumSubscriptions } from "./modules/subscriptions/ForumSubscriptions";
import { PoolSubscriptions } from "./modules/subscriptions/PoolSubscriptions";
import { TagSubscriptions } from "./modules/subscriptions/TagSubscriptions";
// - settings
import { SettingsController } from "./modules/general/SettingsController";
import { Subscription } from "./modules/subscriptions/Subscription";

const loadOrder = [
    FormattingManager,
    HeaderCustomizer,
    ThemeCustomizer,
    Miscellaneous,
    SubscriptionManager,
    ThemeCustomizer,

    DownloadCustomizer,
    ImageScaler,
    PoolNavigator,
    PostViewer,
    TitleCustomizer,

    BlacklistEnhancer,
    InfiniteScroll,
    InstantSearch,

    TinyAlias,

    SettingsController
];

const subscriptions = [
    PoolSubscriptions,
    ForumSubscriptions,
    TagSubscriptions
];

subscriptions.forEach((module) => {
    const instance = module.getInstance() as Subscription;
    if (instance.canInitialize()) {
        SubscriptionManager.registerSubscriber(instance);
    }
});

StructureUtilities.createDOM();

loadOrder.forEach((module) => {
    ModuleController.register(module);
});
