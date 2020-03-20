/**
 * RE:621 - e621 Reimagined
 * Script root. Better keep this place tidy.
 */

// Create DOM required for the rest of the modules
import { StructureUtilities } from "./modules/StructureUtilities";
StructureUtilities.createDOM();

// Load Modules
import { HeaderCustomizer } from "./modules/HeaderCustomizer";
import { ThemeCustomizer } from "./modules/ThemeCustomizer";
import { BlacklistToggler } from "./modules/BlacklistToggler";
import { FormattingHelper } from "./modules/FormattingHelper";
import { TitleCustomizer } from "./modules/TitleCustomizer";
import { Miscellaneous } from "./modules/Miscellaneous";
import { InstantSearch } from "./modules/InstantSearch";

import { SettingsController } from "./modules/SettingsController";

// Modules with self-contained settings
HeaderCustomizer.getInstance();
ThemeCustomizer.getInstance();
FormattingHelper.init();

// Modules without settings
BlacklistToggler.getInstance();
TitleCustomizer.getInstance();
InstantSearch.getInstance();

// Modules configured by the SettingsController
SettingsController.registerModule(
    Miscellaneous.getInstance(),
);

SettingsController.getInstance().init();
