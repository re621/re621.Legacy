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

import { SettingsController } from "./modules/SettingsController";

SettingsController.registerModule(
    BlacklistToggler.getInstance(),
    HeaderCustomizer.getInstance(),
    Miscellaneous.getInstance(),
    ThemeCustomizer.getInstance(),
    TitleCustomizer.getInstance(),
);

FormattingHelper.init();
