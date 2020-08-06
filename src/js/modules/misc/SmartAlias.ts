import { E621 } from "../../components/api/E621";
import { APITag } from "../../components/api/responses/APITag";
import { APITagAlias } from "../../components/api/responses/APITagAlias";
import { AvoidPosting } from "../../components/cache/AvoidPosting";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";

export class SmartAlias extends RE6Module {

    // Maximum recursion depth for aliases that contain other aliases
    private static ITERATIONS_LIMIT = 10;

    // Elements to which smart alias instances are to be attached
    private static inputSelector = [
        "#post_tags",
        "#post_tag_string",
        "#post_characters",
        "#post_sexes",
        "#post_bodyTypes",
        "#post_themes",
    ];

    public constructor() {
        // Uses TinyAlias settings for compatibility
        super([PageDefintion.upload, PageDefintion.post, PageDefintion.search], true, "TinyAlias");
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            data: {},
        };
    }

    public destroy(): void {
        if (!this.isInitialized()) return;
        super.destroy();
        for (const inputElement of $("textarea#post_tags, textarea#post_tag_string").get()) {
            $(inputElement)
                .off("focus.re621.smart-alias")
                .off("focusout.re621.smart-alias");
        }
        $("smart-alias").remove();
    }

    public create(): void {
        super.create();

        // Fix for the post editing form glitch
        // Just destroy and rebuild the module, or things get complicated
        $("#post-edit-link").one("click", () => {
            this.destroy();
            setTimeout(() => {
                this.create();
            }, 100);
        });

        // Initializes SmartAlias for all appropriate inputs
        for (const inputElement of $(SmartAlias.inputSelector.join(", ")).get()) {
            const $textarea = $(inputElement);
            const $container = $("<smart-alias>")
                .attr("state", "ready")
                .data("xval", SmartAlias.getInputString($textarea))
                .insertAfter($textarea);

            // Okay, this is incomprehensibly dumb
            // But there is no way to catch e621's autocomplte working without this
            let inputFocusInterval: number;         // Checks if the input has changed
            $textarea.on("focus", () => {

                let inputChangeTimeout: number;     // Checks if the user has stopped typing

                inputFocusInterval = setInterval(() => {

                    // Fast check to see if input changed
                    if ($container.data("xval") === SmartAlias.getInputString($textarea)) return;
                    $container.data("xval", SmartAlias.getInputString($textarea))

                    // User is typing
                    clearTimeout(inputChangeTimeout);

                    inputChangeTimeout = window.setTimeout(() => {
                        this.handleTagInput($textarea, $container);
                    }, 1000);
                }, 500);

            }).on("focusout", () => {
                clearInterval(inputFocusInterval);
                if ($container.data("xval") === SmartAlias.getInputString($textarea)) return;
                $container.data("xval", SmartAlias.getInputString($textarea))
                this.handleTagInput($textarea, $container);
            });

            // First call, in case the input area is not blank
            // i.e. on post page, or in editing mode
            this.handleTagInput($textarea, $container);
        }
    }

    /**
     * Parses the textare input specified in the parameter and returns a list of space-separated tags
     * @param input Textarea to parse
     */
    private static getInputString(input: JQuery<HTMLElement>): string {
        return input.val().toString().trim()
            .replace(/\r?\n|\r/g, " ")      // strip newlines
            .replace(/(?:\s){2,}/g, " ");    // strip multiple spaces
    }

    /**
     * Parses the textare input specified in the parameter and returns an array of tags
     * @param input Textarea to parse, or a space-separated sting of tags
     */
    private static getInputTags(input: string): string[];
    private static getInputTags(input: JQuery<HTMLElement>): string[];
    private static getInputTags(input: string | JQuery<HTMLElement>): string[] {
        return (typeof input === "string" ? input : SmartAlias.getInputString(input))
            .split(" ")
            .filter((el) => { return el != null && el != ""; });
    }

    private async handleTagInput($textarea: JQuery<HTMLElement>, $container: JQuery<HTMLElement>): Promise<void> {
        if ($container.attr("state") !== "ready") return;
        $container.attr("state", "loading");

        // Prepare the necessary tools
        if (AvoidPosting.isUpdateRequired()) await AvoidPosting.update();

        // Get the tags from the textarea
        let newTags = SmartAlias.getInputTags($textarea);       // tags currently in the textarea
        const oldTags = $container.data("tags") || newTags;     // tags in the textarea on the previous run
        let tagDiff = getTagDiff(newTags, oldTags);             // tags that have been added since
        $container.data("tags", newTags);

        Debug.log("dif", tagDiff);

        // Skip the rest if the textarea is empty
        if (newTags.length == 0) {
            $container.html("");
            $container.attr("state", "ready");
            return;
        }


        // Step 1
        // Replace all aliases with their contents
        const aliasData = this.fetchSettings<AliasData>("data");
        if (Object.keys(aliasData).length > 0) {
            $textarea.val((index, currentValue) => {

                // Run the the process as many times as needed until no more changes can be made
                // This should resolve an issue with nested aliases
                let changes = 0,
                    iterations = 0;
                do {
                    changes = 0;
                    for (const [alias, data] of Object.entries(this.fetchSettings<AliasData>("data"))) {
                        currentValue = currentValue.replace(
                            new RegExp("(^| )(" + alias + ")( |\n|$)", "gi"),
                            (match, prefix, input, suffix) => {
                                changes++;
                                return prefix + data + suffix;
                            }
                        );
                    }
                    iterations++;
                } while (changes != 0 && iterations < SmartAlias.ITERATIONS_LIMIT);

                return currentValue;
            });

            // Regenerate the tag list
            newTags = SmartAlias.getInputTags($textarea)
            tagDiff = getTagDiff(newTags, oldTags);
            $container.data({
                "tags": newTags,
                "xval": SmartAlias.getInputString($textarea),
            });
            Debug.log("dif", tagDiff);
        }


        // Step 2
        // Create the structure for absent tags
        const tagsList: Set<string> = new Set();
        for (const tagName of tagDiff) {
            tagsList.add(tagName);

            $("<smart-tag>")
                .attr({
                    "name": tagName,
                    "symbol": "loading",
                    "status": "",
                    "text": "",
                })
                .html(`<a href="/wiki_pages/show_or_new?title=${tagName}">${tagName}</a>`)
                .appendTo($container);
        }


        // Step 3
        // Rebuild the structure to follow the same order as the tags in texarea
        const $temp = $("<div>");
        for (const tagName of newTags)
            findTagElement($container, tagName).first().appendTo($temp);
        $container.html("");
        $temp.children().appendTo($container);


        // Step 4
        // Replace aliased tag names with their consequent versions
        const invalidTags: Set<string> = new Set();     // tags aliased to `invalid_tag`
        for (const batch of Util.chunkArray(tagsList, 40)) {
            for (const result of await E621.TagAliases.get<APITagAlias>({ "search[antecedent_name]": batch.join("+"), limit: 1000 }, 500)) {

                // Don't apply pending or inactive aliases
                if (result.status !== "active") continue;

                const currentName = result.antecedent_name,
                    trueName = result.consequent_name;

                // Replace the original name in the list
                tagsList.delete(currentName);

                // Don't replace tags aliased to `invalid_tag`
                if (trueName == "invalid_tag") {
                    invalidTags.add(currentName);
                    continue;
                }

                // Replace the existing tag with the parent one in the SmartAlias window
                findTagElement($container, currentName)
                    .attr({ "name": trueName })
                    .html(`<a href="/wiki_pages/show_or_new?title=${trueName}">${trueName}</a>`);

                // Replace the existing tag with the parent one in the textbox
                const regex = new RegExp("(^| )(" + currentName + ")( |\n|$)", "gi");
                $textarea.val((index, currentValue) => {
                    return currentValue.replace(regex, "$1" + trueName + "$3");
                });

            }
        }

        // Regenerate the tag list, again
        newTags = SmartAlias.getInputTags($textarea)
        $container.data({
            "tags": newTags,
            "xval": SmartAlias.getInputString($textarea),
        });


        // Step 5
        // Verify that the remaining tags are valid by querring the API and delete the ones that are found from the list
        for (const batch of Util.chunkArray(tagsList, 100)) {
            for (const result of await E621.Tags.get<APITag>({ "search[name]": batch.join(","), limit: 100 }, 500)) {
                findTagElement($container, result.name)
                    .attr({
                        "status": "success",
                        "text": result.post_count,
                    });
                tagsList.delete(result.name);
            }
        }


        // Step 6
        // Tags that were not removed from the list must be invalid
        for (const tagName of [...tagsList, ...invalidTags]) {
            findTagElement($container, tagName)
                .attr({
                    "status": "error",
                    "text": "invalid tag",
                });
        }


        // Step 7
        // Check for duplicates
        for (const tagName of new Set(newTags)) {
            const lookup = findTagElement($container, tagName);
            if (AvoidPosting.has(tagName)) lookup
                .html(`<a href="/wiki_pages/show_or_new?title=${tagName}">${tagName}</a> avoid posting`)
                .attr("symbol", "dnp");
            else if (lookup.length > 1) lookup
                .html(`<a href="/wiki_pages/show_or_new?title=${tagName}">${tagName}</a> duplicate tag`)
                .attr("symbol", "duplicate");
            else lookup
                .html(`<a href="/wiki_pages/show_or_new?title=${tagName}">${tagName}</a> ${lookup.attr("text")}`)
                .attr("symbol", lookup.attr("status"));
        }


        // Finish and clean up
        $container.attr("state", "ready");


        /** Finds a smart tag by its name attribute */
        function findTagElement($container: JQuery<HTMLElement>, name: string): JQuery<HTMLElement> {
            return $container.find(`smart-tag[name="${name}"]`);
        }

        /** Returns a list of tags that have been added since last update */
        function getTagDiff(newTags: string[], oldTags: string[]): string[] {
            // This must be some kind of witchcraft.
            // I don't understand any of this. None.
            return [...newTags.reduce((acc, v) => acc.set(v, (acc.get(v) || 0) - 1),
                oldTags.reduce((acc, v) => acc.set(v, (acc.get(v) || 0) + 1), new Map())
            )].reduce((acc, [v, count]) => acc.concat(Array(Math.abs(count)).fill(v)), []);
        }

    }

}

export interface AliasData {
    [name: string]: string;
}
