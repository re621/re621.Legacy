import { XM } from "../api/XM";
import { Debug } from "./Debug";

export class Patcher {

    public static version: number;

    /**
     * Runs patch-ups on the settings to preserve backwards compatibility.  
     * All patches MUST be documented and versioned.
     */
    public static async run(): Promise<void> {

        let counter = 0;

        Patcher.version = await XM.Storage.getValue("re621.patchVersion", 0);

        switch (Patcher.version) {

            // Patch 1 - Version 1.3.5
            // The subscription modules were renamed to make the overall structure more clear.
            // Cache was removed from the module settings to prevent event listeners from being triggered needlessly.
            case 0: {
                for (const type of ["Comment", "Forum", "Pool", "Tag"]) {
                    const entry = await XM.Storage.getValue("re621." + type + "Subscriptions", undefined);
                    if (entry === undefined) continue;
                    if (entry["cache"] !== undefined) {
                        await XM.Storage.setValue("re621." + type + "Tracker.cache", entry["cache"]);
                        delete entry["cache"];
                        counter++;
                    }
                    await XM.Storage.setValue("re621." + type + "Tracker", entry);
                    await XM.Storage.deleteValue("re621." + type + "Subscriptions");
                    counter++;
                }
                Patcher.version = 1;
            }

            // Patch 2 - Version 1.3.7
            // The "Miscellaneous" module was split apart into several more specialized modules
            case 1: {
                const miscSettings = await XM.Storage.getValue("re621.Miscellaneous", {}),
                    searchUtilities = await XM.Storage.getValue("re621.SearchUtilities", {});

                for (const property of ["improveTagCount", "shortenTagNames", "collapseCategories", "hotkeyFocusSearch", "hotkeyRandomPost"]) {
                    if (miscSettings.hasOwnProperty(property)) {
                        searchUtilities[property] = miscSettings[property];
                        delete miscSettings[property];
                        counter++;
                    }
                }

                for (const property of ["removeSearchQueryString", "categoryData"]) {
                    if (miscSettings.hasOwnProperty(property)) {
                        delete miscSettings[property];
                        counter++;
                    }
                }

                await XM.Storage.setValue("re621.Miscellaneous", miscSettings);
                await XM.Storage.setValue("re621.SearchUtilities", searchUtilities);

                Patcher.version = 2;
            }

            // Patch 3 - Version 1.3.12
            // Rework of existing sync code meant the removal of existing variables
            case 2: {
                if (await XM.Storage.getValue("re621.report", undefined) !== undefined) {
                    await XM.Storage.deleteValue("re621.report");
                    counter++;
                }

                Patcher.version = 3;
            }

            // Patch 4 - Version 1.3.15
            // Favorites and DNP cache local storage variable names were changed
            case 3: {
                window.localStorage.removeItem("re621.favorites");
                window.localStorage.removeItem("re621.dnp.cache");
                counter += 2;

                Patcher.version = 4;
            }

            // Patch 5 - Version 1.3.19
            // TinyAlias was replaced with SmartAlias, migrating the settings
            case 4: {
                const taConf = await XM.Storage.getValue("re621.TinyAlias", undefined)
                if (taConf !== undefined && taConf.data !== undefined) {
                    // Convert the data into a newline-separated string
                    let output = "";
                    for (const [key, value] of Object.entries(taConf.data)) {
                        output += `${key} -> ${value}\n`;
                        counter++;
                    }

                    // Append the imported data to SmartAlias configuraiton
                    const saConf = await XM.Storage.getValue("re621.SmartAlias", { data: "" });
                    saConf.data = saConf.data +
                        (saConf.data == "" ? "" : "\n\n") +
                        "# Imported from TinyAlias\n" +
                        output;
                    await XM.Storage.setValue("re621.SmartAlias", saConf);

                    // Clean up the TinyAlias config
                    await XM.Storage.deleteValue("re621.TinyAlias");
                }

                Patcher.version = 5;
            }

            // Patch 6 - Version 1.4.0
            // ThumbnailEnhancer and InfiniteScroll were merged together into BetterSearch
            // A lot of settings names were changed to less ambiguous ones
            // Favorites cache was retired and removed
            case 5: {
                const thumbEnhancer = await XM.Storage.getValue("re621.ThumbnailEnhancer", undefined),
                    infiniteScroll = await XM.Storage.getValue("re621.InfiniteScroll", undefined),
                    betterSearch = await XM.Storage.getValue("re621.BetterSearch", {});
                if (thumbEnhancer) {
                    betterSearch["imageLoadMethod"] = thumbEnhancer["upscale"];
                    betterSearch["autoPlayGIFs"] = thumbEnhancer["autoPlayGIFs"];
                    betterSearch["hoverTags"] = thumbEnhancer["preserveHoverText"];
                    betterSearch["zoomMode"] = thumbEnhancer["zoom"];

                    betterSearch["imageSizeChange"] = thumbEnhancer["crop"];
                    betterSearch["imageWidth"] = thumbEnhancer["cropSize"].replace(/px/g, "");
                    betterSearch["imageRatioChange"] = !thumbEnhancer["cropPreserveRatio"];
                    betterSearch["imageRatio"] = thumbEnhancer["cropRatio"];

                    betterSearch["ribbonsFlag"] = thumbEnhancer["ribbons"];
                    betterSearch["ribbonsRel"] = thumbEnhancer["relRibbons"];
                    betterSearch["buttonsVote"] = thumbEnhancer["vote"];
                    betterSearch["buttonsFav"] = thumbEnhancer["fav"];

                    counter += 12;

                    await XM.Storage.setValue("re621.BetterSearch", betterSearch);
                    await XM.Storage.deleteValue("re621.ThumbnailEnhancer");
                }

                if (infiniteScroll) {
                    betterSearch["infiniteScroll"] = infiniteScroll["enabled"];
                    betterSearch["loadPrevPages"] = infiniteScroll["keepHistory"];

                    counter += 2;

                    await XM.Storage.setValue("re621.BetterSearch", betterSearch);
                    await XM.Storage.deleteValue("re621.InfiniteScroll");
                }

                window.localStorage.removeItem("re621.favcache.data");
                window.localStorage.removeItem("re621.favcache.invalid");
                window.localStorage.removeItem("re621.favcache.update");

                counter += 3;

                Patcher.version = 6;
            }
        }

        Debug.log(`Patcher: ${counter} records changed`)
        await XM.Storage.setValue("re621.patchVersion", Patcher.version);
    }

}
