import { E621 } from "../../components/api/E621";
import { APITag } from "../../components/api/responses/APITag";
import { APITagAlias } from "../../components/api/responses/APITagAlias";
import { AvoidPosting } from "../../components/cache/AvoidPosting";
import { Page, PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
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

    private static tagData: TagData;            // stores tag data for the session - count, valid, dnp, etc
    private static tagAliases: TagAlias;        // stores e621's alias pairs to avoid repeated lookups

    public constructor() {
        super([PageDefintion.upload, PageDefintion.post, PageDefintion.search, PageDefintion.favorites], true);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            quickTagsForm: true,
            replaceAliasedTags: true,

            data: "",
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

        // Abort the whole thing if the quick tags form is disabled in settings
        if (!this.fetchSettings("quickTagsForm") && Page.matches([PageDefintion.search, PageDefintion.favorites]))
            return;

        SmartAlias.tagData = {};
        SmartAlias.tagAliases = {};

        // Fix for the post editing form glitch
        // Just destroy and rebuild the module, or things get complicated
        // TODO Is this necessary?
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
                .attr("ready", "true")
                .insertAfter($textarea);

            // Wait for the user to stop typing before processing
            let typingTimeout: number;
            $textarea.on("input", () => {

                // handleTagInput triggers an input event to properly fill in the data bindings
                // this ensures that it will not result in an infinite loop
                if ($textarea.data("vue-event") === "true") {
                    $textarea.data("vue-event", "false");
                    return;
                }

                // If the data is currently processing, but the user keeps typing,
                // check every second to make sure the last input is caught
                window.clearInterval(typingTimeout);
                typingTimeout = window.setInterval(() => {
                    if ($container.attr("ready") !== "true") return;

                    window.clearInterval(typingTimeout);
                    this.handleTagInput($textarea, $container);
                }, 1000);
            });

            // On search pages, in the editing mode, reload container when the user clicks on a thumbnail
            // Otherwise, the old tags get left behind. Thanks to tag data caching, this should be pretty quick
            if (Page.matches([PageDefintion.search, PageDefintion.favorites])) {
                $("article.post-preview").on("click.danbooru", () => {
                    this.handleTagInput($textarea, $container, false);
                });
            }

            // First call, in case the input area is not blank
            // i.e. on post page, or in editing mode
            this.handleTagInput($textarea, $container, false);
        }
    }

    /**
     * Parses the textare input specified in the parameter and returns a list of space-separated tags
     * @param input Textarea to parse
     */
    private static getInputString(input: JQuery<HTMLElement>): string {
        return input.val().toString().trim()
            .toLowerCase()
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

    /**
     * Process the tag string in the textarea, and display appropriate data in the container
     * @param $textarea Textarea to process
     * @param $container Display container
     * @param scrollToBottom If true, the container's viewport will scroll to the very bottom once processed
     */
    private async handleTagInput($textarea: JQuery<HTMLElement>, $container: JQuery<HTMLElement>, scrollToBottom = true): Promise<void> {
        if ($container.attr("ready") !== "true") return;
        $container.attr("ready", "false");

        // Prepare the necessary tools
        if (AvoidPosting.isUpdateRequired()) await AvoidPosting.update();

        // Get the tags from the textarea
        const inputString = SmartAlias.getInputString($textarea);
        let tags = SmartAlias.getInputTags(inputString);

        // Skip the rest if the textarea is empty
        if (tags.length == 0) {
            $container.html("");
            $container.attr("ready", "true");
            return;
        }


        // Step 1
        // Replace custom aliases with their contents
        // This is probably overcomplicated to all hell
        // TODO Don't reload alias data from the file every time, cache it instead
        const aliasData = SmartAlias.getAliasData(this.fetchSettings<string>("data"));
        if (aliasData.length > 0) {
            $textarea.val((index, currentValue) => {

                // Run the the process as many times as needed until no more changes can be made
                // This should take care of nested aliases while preventing infinite recursion
                let changes = 0,
                    iterations = 0;
                do {
                    changes = 0;
                    for (const aliasDef of aliasData) {

                        console.log("/" + getTagRegex(aliasDef.lookup) + "/");
                        currentValue = currentValue.replace(
                            getTagRegex(aliasDef.lookup),
                            (...args) => {  // match, prefix, body, suffix1, suffix2, etc
                                console.log(args);
                                changes++;
                                let output = aliasDef.output;
                                for (let i = 3; i < args.length - 3; i++) {
                                    output = output.replace(/\$1/g, args[i]);
                                }
                                console.log(args[1], output, args[args.length - 3], args[1] + output + args[args.length - 3]);
                                return args[1] + output + args[args.length - 3];
                            }
                        );

                    }
                    iterations++;
                } while (changes != 0 && iterations < SmartAlias.ITERATIONS_LIMIT);

                return currentValue;
            });

            // Regenerate the tags to account for replacements
            triggerUpdateEvent($textarea);
            tags = SmartAlias.getInputTags($textarea);
        }


        // Step 2
        // Create a list of tags that need to be looked up in the API
        const lookup: Set<string> = new Set();
        for (const tagName of tags) {
            if (typeof SmartAlias.tagData[tagName] == "undefined")
                lookup.add(tagName);
        }

        // Redraw the container to indicate loading
        redrawContainerContents($container, tags, lookup);


        // Step 3
        // Check the lookup tags for aliases
        const invalidTags: Set<string> = new Set(),
            ambiguousTags: Set<string> = new Set();
        for (const batch of Util.chunkArray([...lookup].filter((value) => SmartAlias.tagAliases[value] == undefined), 40)) {
            for (const result of await E621.TagAliases.get<APITagAlias>({ "search[antecedent_name]": batch.join("+"), limit: 1000 }, 500)) {

                // Don't apply pending or inactive aliases
                if (result.status !== "active") continue;

                const currentName = result.antecedent_name,
                    trueName = result.consequent_name;

                // Don't replace tags aliased to `invalid_tag`
                if (trueName == "invalid_tag" || trueName == "invalid_color") {
                    invalidTags.add(currentName);
                    continue;
                }

                // Account for ambiguous tags
                if (trueName.endsWith("_(disambiguation)")) {
                    ambiguousTags.add(currentName);
                    // TODO make record of tags that implicate an ambiguous tag, and display them
                    continue;
                }

                // Don't look up tags that have been found already
                lookup.delete(currentName);
                if (SmartAlias.tagData[trueName] == undefined)
                    lookup.add(trueName);

                // Mark down the alias name to be replaced
                SmartAlias.tagAliases[currentName] = trueName;

            }
        }


        // Step 4
        // Replace all known e6 aliases with their consequent versions to avoid unnecessary API calls
        if (this.fetchSettings("replaceAliasedTags")) {
            $textarea.val((index, currentValue) => {
                for (const [antecedent, consequent] of Object.entries(SmartAlias.tagAliases)) {
                    currentValue = currentValue.replace(
                        getTagRegex(antecedent),
                        "$1" + consequent + "$3"
                    );
                }

                return currentValue;
            });

            // Regenerate the tags to account for replacements
            triggerUpdateEvent($textarea);
            tags = SmartAlias.getInputTags($textarea);
        }


        // Step 5
        // Look up the tags through the API to make sure they exist
        // Those that do not get removed from the list must be invalid
        if (lookup.size > 0) {

            for (const batch of Util.chunkArray(lookup, 100)) {
                for (const result of await E621.Tags.get<APITag>({ "search[name]": batch.join(","), "search[hide_empty]": false, limit: 100 }, 500)) {
                    SmartAlias.tagData[result.name] = {
                        count: result.post_count,
                        category: result.category,
                        ambiguous: ambiguousTags.has(result.name),
                        invalid: invalidTags.has(result.name),
                        dnp: AvoidPosting.has(result.name),
                    };
                    lookup.delete(result.name);
                }
            }

            for (const tagName of lookup) {
                SmartAlias.tagData[tagName] = {
                    count: -1,
                    category: -1,
                    ambiguous: false,
                    invalid: true,
                    dnp: AvoidPosting.has(tagName),
                };
            }

        }


        // Step 6
        // Redraw the tag data output container
        console.log("data", SmartAlias.tagData);
        redrawContainerContents($container, tags);


        // Step 7
        // Finish and clean up
        if (scrollToBottom)
            $container.scrollTop($container[0].scrollHeight - $container[0].clientHeight);
        $container.attr("ready", "true");


        /**
         * Fix for Vue data-attribute binding  
         * This needs to be executed every time the textare value gets changed
         * @param $textarea Textarea input
         */
        function triggerUpdateEvent($textarea: JQuery<HTMLElement>): void {
            const e = document.createEvent('HTMLEvents');
            e.initEvent("input", true, true);
            $textarea.data("vue-event", "true");
            $textarea[0].dispatchEvent(e);
        }

        /**
         * Dynamically creates a regex that should find individual in the textarea
         * @param input Input, as a single string, an array, or a set
         */
        function getTagRegex(input: string | string[] | Set<string>): RegExp {
            input = [...input];
            for (let i = 0; i < input.length; i++)
                input[i] = input[i]
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/, "(\\S*)");
            return new RegExp("(^| )(" + input.join("|") + ")( |\n|$)", "gi");
        }

        /**
         * Clears and redraws the information display container
         * @param $container Container to refresh
         * @param tags Tags to display
         * @param loading Tags to mark as loading
         */
        function redrawContainerContents($container: JQuery<HTMLElement>, tags: string[], loading = new Set<string>()): void {
            $container.html("");
            for (const tagName of tags) {

                const data = SmartAlias.tagData[tagName];
                const isLoading = loading.has(tagName);

                // console.log("triggering on " + tagName, data);

                // Tags that are currently loading will not have the necessary data.
                // For all other tags, lacking data means that an error has occurred
                if (data == undefined && !isLoading) continue;

                let symbol: string,         // font-awesome icon in front of the line
                    color: string,          // color of the non-link text
                    text: string;           // text after the link
                let displayName = tagName;  // text to be displayed in the link

                if (isLoading) {
                    symbol = "loading";
                    color = "success";
                    text = "";
                } else if (data.dnp) {
                    symbol = "error";
                    color = "error";
                    text = "avoid posting";
                } else if (Util.getArrayIndexes(tags, tagName).length > 1) {
                    symbol = "info";
                    color = "info";
                    text = "duplicate";
                } else if (data.invalid) {
                    symbol = "error";
                    color = "error";
                    text = "invalid";
                } else if (data.ambiguous || tagName.endsWith("_(disambiguation)")) {
                    symbol = "info";
                    color = "warning";
                    text = "ambiguous";
                    displayName = tagName.replace("_(disambiguation)", "");
                } else if (data.count == 0 || data.count < 20) {
                    symbol = "error";
                    color = "warning";
                    text = data.count + "";
                } else {
                    symbol = "success";
                    color = "success";
                    text = data.count + "";
                }

                // Insert zero-width spaces for better linebreaking
                displayName = displayName.replace(/_/g, "_&#8203;");

                $("<smart-tag>")
                    .addClass(isLoading ? "" : "category-" + data.category)
                    .attr({
                        "name": tagName,
                        "symbol": symbol,
                        "color": color,
                    })
                    .html(`<a href="/wiki_pages/show_or_new?title=${tagName}" target="_blank">${displayName}</a> ${text}`)
                    .appendTo($container);
            }
        }

    }

    /**
     * Processses the raw text value of the custom alias field and converts it into machine-readable format.  
     * TODO Optimize this as much as possible
     * @param rawData Raw plaintext data
     */
    public static getAliasData(rawData: string): AliasDefinition[] {
        const data = rawData.split("\n");
        const result: AliasDefinition[] = [];

        for (const line of data) {
            const parts = line
                .split("#")[0]
                .trim()
                .split("->");

            if (parts.length !== 2) continue;

            result.push({
                lookup: getParts(parts[0]),
                output: parts[1].trim(),
            });
        }

        return result;

        function getParts(input: string): Set<string> {
            return new Set(input.split(" ").filter((e) => e != ""));
        }
    }

}

interface AliasDefinition {
    lookup: Set<string>;
    output: string;
}

interface TagData {
    [name: string]: Tag;
}

interface Tag {
    count: number;
    category: number;

    invalid: boolean;
    ambiguous: boolean;
    dnp: boolean;
}

interface TagAlias {
    [name: string]: string;
}
