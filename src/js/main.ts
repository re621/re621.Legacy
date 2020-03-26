/**
 * RE:621 - e621 Reimagined
 * Script root. Better keep this place tidy.
 */

// Create DOM required for the rest of the modules
import { StructureUtilities } from "./modules/general/StructureUtilities";
StructureUtilities.createDOM();

// Load Modules
// - general
import { FormattingHelper } from "./modules/general/FormattingHelper";
import { HeaderCustomizer } from "./modules/general/HeaderCustomizer";
import { Miscellaneous } from "./modules/general/Miscellaneous";
import { ThemeCustomizer } from "./modules/general/ThemeCustomizer";
// - post
import { DownloadCustomizer } from "./modules/post/DownloadCustomizer";
import { ImageScaler } from "./modules/post/ImageScaler";
import { PostViewer } from "./modules/post/PostViewer";
import { TitleCustomizer } from "./modules/post/TitleCustomizer";
// - search
import { BlacklistEnhancer } from "./modules/search/BlacklistEnhancer"
import { InstantSearch } from "./modules/search/InstantSearch";
import { InfiniteScroll } from "./modules/search/InfiniteScroll";
// - settings
import { SettingsController } from "./modules/general/SettingsController";
import { PoolNavigator } from "./modules/post/PoolNavigator";
import { TinyAlias } from "./modules/upload/TinyAlias";

// Modules with self-contained settings
HeaderCustomizer.getInstance();
ThemeCustomizer.getInstance();
FormattingHelper.init();

// Modules without settings
BlacklistEnhancer.getInstance();
InstantSearch.getInstance();
InfiniteScroll.getInstance();
TinyAlias.getInstance();

// Modules configured by the SettingsController
SettingsController.registerModule(
    DownloadCustomizer.getInstance(),
    ImageScaler.getInstance(),
    TitleCustomizer.getInstance(),
    Miscellaneous.getInstance(),
    PoolNavigator.getInstance(),
    PostViewer.getInstance(),
);

SettingsController.getInstance().init();
