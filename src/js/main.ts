/**
 * RE:621 - e621 Reimagined
 * Script root. Better keep this place tidy.
 */

// Create DOM required for the rest of the modules
import { StructureUtilities } from "./modules/StructureUtilities";
StructureUtilities.createDOM();

// Load Settings
import { SettingsController } from "./modules/SettingsController";
SettingsController.getInstance();

// Load Modules
import { HeaderCustomizer } from "./modules/HeaderCustomizer";
import { ThemeCustomizer } from "./modules/ThemeCustomizer";
import { BlacklistToggler } from "./modules/BlacklistToggler";
import { FormattingHelper } from "./modules/FormattingHelper";
import { TitleCustomizer } from "./modules/TitleCustomizer";
import { MiscFunctionality } from "./modules/MiscFunctionality";
import { InstantSearch } from "./modules/InstantSearch";

HeaderCustomizer.getInstance();
ThemeCustomizer.getInstance();
BlacklistToggler.getInstance();
TitleCustomizer.getInstance();
MiscFunctionality.getInstance();
InstantSearch.getInstance();

FormattingHelper.init();
