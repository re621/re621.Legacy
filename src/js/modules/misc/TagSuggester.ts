import { TagSuggestion, TagSuggestionsList } from "../../components/cache/TagSuggestions";
import { PageDefinition } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

export class TagSuggester extends RE6Module {

    private container: JQuery<HTMLElement>;

    // Element selectors that TagSuggester should track
    private static inputSelectors = new Set([
        "#post_characters",     // artist
        "#post_sexes",          // characters
        "#post_bodyTypes",      // body types
        "#post_themes",         // themes
        "#post_tags",           // other tags
    ]);

    private static buttonTagExceptions = {
        "Hermaphrodite": "herm",
        "Male-Herm": "maleherm",
        "Ambiguous": "ambiguous_gender",
        "Explicit": "rating:e",
        "Questionable": "rating:q",
        "Safe": "rating:s",
    };

    // Actual input elements
    private tagInput: JQuery<HTMLElement>[] = [];

    // Element to which suggester pushes tags
    private tagOutput: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefinition.upload], true);
    }

    public getDefaultSettings(): Settings {
        return {
            enabled: true,
        }
    }

    public create(): void {
        super.create();

        // Mark up the toggle buttons (if there are any)
        for (const element of $("button.toggle-button").get()) {
            const $element = $(element);
            const text = $element.text().trim();
            if (TagSuggester.buttonTagExceptions[text])
                $element.attr("data-tag", TagSuggester.buttonTagExceptions[text]);
            else $element.attr("data-tag", text.toLowerCase().replace(/ /, "_"));
        }

        // Create the element structure
        this.tagOutput = $("#post_tags");
        this.container = $("<tag-suggester>")
            .attr("ready", "true")
            .on("recount", () => { this.container.attr("count", this.container.children().length); })
            .appendTo(this.tagOutput.parent());

        // Fix the secret switch breaking the module
        $(".the_secret_switch").one("click", () => { this.reload(); });

        // Initialize the listeners
        this.tagInput = [];
        for (const selector of TagSuggester.inputSelectors) {
            const input = $(selector);
            if (input.length == 0) continue;

            this.tagInput.push(input);

            // Update the suggestions on user tag input
            let typingTimeout: number;
            input.on("input.tagsuggester", () => {

                // handleTagInput triggers an input event to properly fill in the data bindings
                // this ensures that it will not result in an infinite loop
                if (input.data("vue-event-alt") === "true") {
                    input.data("vue-event-alt", "false");
                    return;
                }

                // If the data is currently processing, but the user keeps typing,
                // check every second to make sure the last input is caught
                window.clearInterval(typingTimeout);
                typingTimeout = window.setInterval(() => {
                    if (this.container.attr("ready") !== "true") return;

                    window.clearInterval(typingTimeout);
                    this.update();
                }, 1000);
            });
        }

        // Listen to toggle button clicks
        $("button.toggle-button").on("click.tagsuggester", () => {
            this.update();
        });

        // Listen for updates from other modules
        TagSuggester.on("update.main", () => { this.update(); })
        this.update();
    }

    public destroy(): void {
        super.destroy();

        if (this.container) this.container.remove();
        for (const input of this.tagInput)
            input.off("input.tagsuggester");
        this.tagInput = [];
        $("button.toggle-button").off("click.tagsuggester");
    }

    /**
     * Destroys and re-creates the entire module as a method of reloading it.  
     * It's stupid, but it's the easiest and hassle-free method of resetting some things.
     */
    public async reload(): Promise<void> {
        this.destroy();
        if (!this.fetchSettings("enabled")) return;
        return new Promise((resolve) => {
            setTimeout(() => {
                this.create();
                resolve();
            }, 100);
        })
    }

    private update(): void {
        const tagOutput = this.tagOutput;
        const container = this.container
            .html("")
            .attr("ready", "false");

        const tags = new Set(Util.getTags(this.tagInput)),
            suggestions = {};

        for (const element of $("button.toggle-button.active").get())
            tags.add($(element).data("tag"));

        // Data derived from the file
        const output = $("#preview-sidebar div.upload_preview_dims").first();
        if (output.length) {

            const data = {
                "year": parseInt(output.attr("data-year")) || -1,
                "width": parseInt(output.attr("data-width")) || -1,
                "height": parseInt(output.attr("data-height")) || -1,
                "size": parseInt(output.attr("data-size")) || -1,
                "type": output.attr("data-type") || "unk",
                "file": output.attr("data-file") == "true",
            }

            if (data.type !== "unk") tags.add("type:" + data.type);

            // Year
            if (data.year && data.year > 0 && !data.file)
                suggestions[data.year] = "Might not be accurate. Based on the file's last modified date.";

            // Ratio
            if (data.width && data.height && data.width > 1 && data.type !== "swf") {
                const ratio = TagSuggester.getImageRatio(data.width, data.height);
                if (ratio) suggestions[ratio] = "Aspect ratio based on the image's dimensions";

                // 4k
                if (matchDimensions(data.width, data.height, [[3840, 2160], [4096, 2160]]))
                    suggestions["4k"] = "Image dimensions fit the 4K resolution";
            }

            // Filesize
            if (data.size && data.size > 31457280)
                suggestions["huge_filesize"] = "Filesize exceeds 30MB";
        }

        // Derived from the added tags
        for (const [key, matches] of Object.entries(TagSuggestionsList)) {
            const keyset = key.split("|");
            if (tagAlreadyPresent(tags, Object.keys(suggestions), keyset)) continue;
            if (tagsMatchRegex(matches, tags)) {
                for (const keyEntry of keyset)
                    suggestions[keyEntry] = "Existing tags: " + formatMatchRegex(matches);
            }
        }

        for (const [tag, description] of Object.entries(suggestions))
            addSuggestion(tag, description + "");

        container
            .attr("ready", "true")
            .trigger("recount");

        /** Checks if the specieid key set is already present in the tags or in suggestions */
        function tagAlreadyPresent(tags: Set<string>, suggestions: string[], keyset: string[]): boolean {
            for (const key of keyset)
                if (tags.has(key) || suggestions.includes(key)) return true;
            return false;
        }

        /**
         * Adds a new suggestion to the list
         * @param tagName Name of the tag to suggest
         */
        function addSuggestion(tagName: string, hover?: string): void {
            if (tags.has(tagName + "")) return;

            const wrapper = $("<tag-entry>")
                .attr("title", hover)
                .appendTo(container);

            $("<a>")
                .attr({
                    href: "/wiki_pages/show_or_new?title=" + encodeURIComponent(tagName),
                    target: "_blank",
                    rel: "noopener noreferrer",
                })
                .html("?")
                .appendTo(wrapper);

            $("<a>")
                .attr("href", "javascript://")
                .on("click", (event) => {
                    event.preventDefault();

                    // Add the tag to the list
                    tagOutput.val((index: number, value: string) => {
                        return value
                            + ((value.length == 0 || value.endsWith(" ")) ? "" : " ")
                            + tagName
                            + " ";
                    });

                    // Remove the suggestion
                    $(event.currentTarget).parent("tag-entry").remove();
                    container.trigger("recount");

                    // Trigger SmartAlias update
                    Util.Events.triggerVueEvent(tagOutput, "input", "vue-event-alt");
                })
                .html(tagName)
                .appendTo(wrapper);
        }

        /**
         * Returns true if the provided tags match *all* of the specified regular expressions
         * @param matches Regular expressions to test against
         * @param tags Tags to check
         */
        function tagsMatchRegex(suggestion: TagSuggestion, tags: Set<string>): boolean {

            let matchHas = true;
            if (suggestion.has) {
                if (!Array.isArray(suggestion.has)) suggestion.has = [suggestion.has];
                if (!suggestion.matchCount) suggestion.matchCount = suggestion.has.length;

                const regexHas = new Set(suggestion.has);
                for (const regex of regexHas) {
                    if (typeof regex == "string") {
                        if (!tags.has(regex)) continue;
                        regexHas.delete(regex);
                    } else {
                        for (const tag of tags) {
                            if (!regex.test(tag)) continue;
                            regexHas.delete(regex);
                            break;
                        }
                    }
                }

                matchHas = regexHas.size <= (suggestion.has.length - suggestion.matchCount);
            }

            let matchNot = true;
            if (suggestion.not) {
                if (!Array.isArray(suggestion.not)) suggestion.not = [suggestion.not];

                const regexNot = new Set(suggestion.not);
                for (const regex of regexNot) {
                    if (typeof regex == "string") {
                        if (!tags.has(regex)) continue;
                        matchNot = false;
                    } else {
                        for (const tag of tags) {
                            if (!regex.test(tag)) continue;
                            matchNot = false;
                            break;
                        }
                        if (!matchNot) break;
                    }
                }
            }

            return matchHas && matchNot;
        }

        /**
         * Formats the regular expressions into human-readable format
         * @param matches Regular expressions to format
         */
        function formatMatchRegex(suggestion: TagSuggestion): string {

            const resultsHas = [];
            if (suggestion.has) {
                if (!Array.isArray(suggestion.has)) suggestion.has = [suggestion.has];
                for (const match of suggestion.has)
                    resultsHas.push(
                        (match + "")
                            .replace(/\/\^|\$\//g, "")
                            .replace(/^\/|\/$/g, "")
                            .replace(/^\((.*)\)$/g, "$1")
                            .replace(/\.\+/g, "*")
                            .replace(/\|/g, " / ")
                    );
            }

            const resultsNot = [];
            if (suggestion.not) {
                if (!Array.isArray(suggestion.not)) suggestion.not = [suggestion.not];
                for (const match of suggestion.not)
                    resultsNot.push(
                        (match + "")
                            .replace(/\/\^|\$\//g, "")
                            .replace(/^\/|\/$/g, "")
                            .replace(/^\((.*)\)$/g, "$1")
                            .replace(/\.\+/g, "*")
                            .replace(/\|/g, " / ")
                    );
            }

            if (resultsHas.length > 0 && resultsNot.length > 0)
                return Util.prettyPrintArray(resultsHas) + ", but not " + Util.prettyPrintArray(resultsNot, "or");
            else if (resultsHas.length > 0)
                return Util.prettyPrintArray(resultsHas);
            else if (resultsNot.length > 0)
                return "not " + Util.prettyPrintArray(resultsNot, "or");
            return "???";
        }

        function matchDimensions(width: number, height: number, matches: [number, number][]): boolean {
            for (const [matchWidth, matchHeight] of matches) {
                if ((width == matchWidth && height == matchHeight) || (width == matchHeight && height == matchWidth))
                    return true;
            }
            return false;
        }

    }

    /**
     * Returns the image ratio based on the image width and height
     * @param width Image width
     * @param height Image height
     * @returns Image ratio if applicable, undefined if none applies, and null if an error occurs
     */
    private static getImageRatio(width: number | string, height: number | string): string {
        if (typeof width == "string") width = parseInt(width);
        if (typeof height == "string") height = parseInt(height);
        if (!width || !height) return null;

        return ImageRatios[(width / height).toFixed(6)];
    }
}

const ImageRatios = {
    "1.000000": "1:1",          // Icons / Avatars
    "0.250000": "1:4",          // 
    "0.281250": "9:32",         // 
    "0.500000": "1:2",          // 
    "0.428571": "9:21",         // 
    "0.529412": "9:17",         // NOT META
    "0.562500": "9:16",         // 
    "0.571429": "4:7",          // NOT META
    "0.600000": "3:5",          // 
    "0.625000": "10:16",        // 
    "0.642857": "9:14",         // 
    "0.666667": "2:3",          // Common Phone Ratio
    "0.750000": "3:4",          // 
    "0.800000": "4:5",          // 
    "0.833333": "5:6",          // 
    "1.200000": "6:5",          // NOT META
    "1.250000": "5:4",          // Common Desktop Ratio
    "1.333333": "4:3",          // Common Desktop Ratio
    "1.500000": "3:2",          // Common Desktop Ratio
    "1.555556": "14:9",         // 4:3 / 16:9 compromise
    "1.600000": "16:10",        // Common Desktop Ratio
    "1.666667": "5:3",          // 
    "1.750000": "7:4",          // 
    "1.777778": "16:9",         // Common Desktop Ratio
    "1.888889": "17:9",         // NOT META
    "1.896296": "256:135",      // Digital Cinema 4k
    "2.000000": "2:1",          // VR Resolution
    "2.333333": "21:9",         // Ultrawide
    "3.555556": "32:9",         // Samsung Ultrawide
    "4.000000": "4:1",          // Twitter Header Image
}
