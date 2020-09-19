import { ImageZoomMode } from "../../modules/search/HoverZoom";
import { XM } from "../api/XM";
import { Debug } from "./Debug";
import { ErrorHandler } from "./ErrorHandler";

export class Patcher {

    public static version: number;

    /**
     * Runs patch-ups on the settings to preserve backwards compatibility.  
     * All patches MUST be documented and versioned.
     */
    public static async patchConfig(): Promise<void> {

        let counter = 0;

        Patcher.version = await XM.Storage.getValue("re621.patchVersion", 0);

        try {
            switch (Patcher.version) {

                case 0: counter += await this.patch1();
                case 1: counter += await this.patch2();
                case 2: counter += await this.patch3();
                case 3: counter += await this.patch4();
                case 4: counter += await this.patch5();
                case 5: counter += await this.patch6();
                case 6:
                case 7: counter += await this.patch8();
                case 8: counter += await this.patch9();
            }
        } catch (error) { ErrorHandler.error("Patcher", error.stack, "patch " + Patcher.version); }

        Debug.log(`Patcher: ${counter} records changed`)
        await XM.Storage.setValue("re621.patchVersion", Patcher.version);
    }

    // Patch 1 - Version 1.3.5
    // The subscription modules were renamed to make the overall structure more clear.
    // Cache was removed from the module settings to prevent event listeners from being triggered needlessly.
    private static async patch1(): Promise<number> {
        let counter = 0;

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

        return counter;
    }

    // Patch 2 - Version 1.3.7
    // The "Miscellaneous" module was split apart into several more specialized modules
    private static async patch2(): Promise<number> {
        let counter = 0;

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

        return counter;
    }

    // Patch 3 - Version 1.3.12
    // Rework of existing sync code meant the removal of existing variables
    private static async patch3(): Promise<number> {
        let counter = 0;

        if (await XM.Storage.getValue("re621.report", undefined) !== undefined) {
            await XM.Storage.deleteValue("re621.report");
            counter++;
        }

        Patcher.version = 3;

        return counter;
    }

    // Patch 4 - Version 1.3.15
    // Favorites and DNP cache local storage variable names were changed
    private static async patch4(): Promise<number> {
        let counter = 0;

        window.localStorage.removeItem("re621.favorites");
        window.localStorage.removeItem("re621.dnp.cache");
        counter += 2;

        Patcher.version = 4;

        return counter;
    }

    // Patch 5 - Version 1.3.19
    // TinyAlias was replaced with SmartAlias, migrating the settings
    private static async patch5(): Promise<number> {
        let counter = 0;

        const taConf = await XM.Storage.getValue("re621.TinyAlias", undefined)
        if (taConf !== undefined && taConf.data !== undefined) {
            // Convert the data into a newline-separated string
            let output = "";
            for (const [key, value] of Object.entries(taConf.data)) {
                output += `${key} -> ${value}\n`;
                counter++;
            }

            // Append the imported data to SmartAlias configuration
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

        return counter;
    }

    // Patch 6 - Version 1.4.0
    // ThumbnailEnhancer and InfiniteScroll were merged together into BetterSearch
    // A lot of settings names were changed to less ambiguous ones
    // Favorites cache was retired and removed
    private static async patch6(): Promise<number> {
        let counter = 0;

        const thumbEnhancer = await XM.Storage.getValue("re621.ThumbnailEnhancer", undefined),
            infiniteScroll = await XM.Storage.getValue("re621.InfiniteScroll", undefined),
            betterSearch = await XM.Storage.getValue("re621.BetterSearch", {});
        if (thumbEnhancer) {
            betterSearch["imageLoadMethod"] = thumbEnhancer["upscale"];
            betterSearch["autoPlayGIFs"] = thumbEnhancer["autoPlayGIFs"];
            betterSearch["hoverTags"] = thumbEnhancer["preserveHoverText"];

            if (thumbEnhancer["zoom"] == "onshift") betterSearch["zoomMode"] = ImageZoomMode.OnShift;
            else if (thumbEnhancer["zoom"] == "true") betterSearch["zoomMode"] = ImageZoomMode.Hover;
            else betterSearch["zoomMode"] = ImageZoomMode.Disabled;

            betterSearch["imageSizeChange"] = thumbEnhancer["crop"];
            betterSearch["imageWidth"] = (thumbEnhancer["cropSize"] || "150").replace(/px/g, "");
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

        return counter;
    }

    // Patch 7 - 1.4.3
    // Synchronization server died, and the sync features with it

    // Patch 8: 1.4.5
    // Version checker has been rewritten, rendering old sync-based data void
    // Functionally identical to patch 7
    private static async patch8(): Promise<number> {
        let counter = 0;

        await XM.Storage.deleteValue("re621.sync");
        counter++;
        Patcher.version = 8;

        return counter;
    }

    // Patch 9: 1.4.8
    // HoverZoom was moved into a separate module
    private static async patch9(): Promise<number> {
        let counter = 0;

        const betterSearch = await XM.Storage.getValue("re621.BetterSearch", {});
        const hoverZoom = await XM.Storage.getValue("re621.HoverZoom", {});
        if (betterSearch["zoomMode"] !== undefined) {
            hoverZoom["mode"] = betterSearch["zoomMode"];
            delete betterSearch["zoomMode"];
            counter++;
        }
        if (betterSearch["zoomTags"] !== undefined) {
            hoverZoom["tags"] = betterSearch["zoomTags"];
            delete betterSearch["zoomTags"];
            counter++;
        }
        for (const deletedEntry of ["zoomFull", "zoomScale", "zoomContextual"]) {
            delete betterSearch[deletedEntry];
            counter++;
        }
        await XM.Storage.setValue("re621.BetterSearch", betterSearch);
        await XM.Storage.setValue("re621.HoverZoom", hoverZoom);
        Patcher.version = 9;

        return counter;
    }

}
