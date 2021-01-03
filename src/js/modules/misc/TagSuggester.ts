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
            enabled: false,
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
                "file": output.attr("data-file") == "true",
            }

            // Year
            if (data.year && data.year > 0 && !data.file)
                suggestions[data.year] = "Might not be accurate. Based on the file's last modified date.";

            // Ratio
            if (data.width && data.height && data.width > 1) {
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
        for (const [key, matches] of Object.entries(TagSuggestions)) {
            if (tags.has(key) || Object.keys(suggestions).includes(key)) continue;
            if (tagsMatchRegex(matches, tags))
                suggestions[key] = "Existing tags: " + formatMatchRegex(matches);
        }

        for (const [tag, description] of Object.entries(suggestions))
            addSuggestion(tag, description + "");

        container.attr({
            "ready": "true",
            "count": container.children().length,
        });

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
                    "href": "/wiki_pages/show_or_new?title=" + encodeURIComponent(tagName),
                    "target": "_blank",
                })
                .html("?")
                .appendTo(wrapper);

            $("<a>")
                .attr("href", "javascript://")
                .on("click", (event) => {
                    event.preventDefault();
                    tagOutput.val((index: number, value: string) => {
                        return value
                            + ((value.length == 0 || value.endsWith(" ")) ? "" : " ")
                            + tagName
                            + " ";
                    });
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
        function tagsMatchRegex(suggestion: Suggestion, tags: Set<string>): boolean {

            let matchHas = true;
            if (suggestion.has) {
                if (!Array.isArray(suggestion.has)) suggestion.has = [suggestion.has];
                if (!suggestion.matchCount) suggestion.matchCount = suggestion.has.length;

                const regexHas = new Set(suggestion.has);
                for (const regex of regexHas) {
                    for (const tag of tags) {
                        if (!regex.test(tag)) continue;
                        regexHas.delete(regex);
                        break;
                    }
                }

                matchHas = regexHas.size <= (suggestion.has.length - suggestion.matchCount);
            }

            let matchNot = true;
            if (suggestion.not) {
                if (!Array.isArray(suggestion.not)) suggestion.not = [suggestion.not];

                const regexNot = new Set(suggestion.not);
                for (const regex of regexNot) {
                    for (const tag of tags) {
                        if (!regex.test(tag)) continue;
                        matchNot = false;
                        break;
                    }
                    if (!matchNot) break;
                }
            }

            return matchHas && matchNot;
        }

        /**
         * Formats the regular expressions into human-readable format
         * @param matches Regular expressions to format
         */
        function formatMatchRegex(suggestion: Suggestion): string {

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
                return resultsHas.join(", ") + ", but not " + resultsNot.join(", ");
            else if (resultsHas.length > 0)
                return resultsHas.join(", ");
            else if (resultsNot.length > 0)
                return "not " + resultsNot.join(", ");
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

    private static getImageRatio(width: number | string, height: number | string): string {
        if (typeof width == "string") width = parseInt(width);
        if (typeof height == "string") height = parseInt(height);
        if (!width || !height) return null;

        const ratio = width / height;
        for (const [name, value] of Object.entries(ImageRatio))
            if (value == ratio) return name;
        return null;
    }
}

enum ImageRatio {
    "1:1" = 1,              // Icons / Avatars
    "1:4" = 1 / 4,
    "9:32" = 9 / 32,
    "1:2" = 1 / 2,
    "9:21" = 9 / 21,
    "9:17" = 9 / 17,        // NOT META
    "9:16" = 9 / 16,
    "4:7" = 4 / 7,          // NOT META
    "10:16" = 10 / 16,
    "9:14" = 9 / 14,
    "2:3" = 2 / 3,          // Common Phone Ratio
    "3:4" = 3 / 4,
    "4:5" = 4 / 5,
    "5:6" = 5 / 6,
    "6:5" = 6 / 5,          // NOT META
    "5:4" = 5 / 4,          // Common Desktop Ratio
    "4:3" = 4 / 3,          // Common Desktop Ratio
    "3:2" = 3 / 2,          // Common Desktop Ratio
    "14:9" = 14 / 9,        // 4:3 / 16:9 compromise
    "16:10" = 16 / 10,      // Common Desktop Ratio
    "7:4" = 7 / 4,
    "16:9" = 16 / 9,        // Common Desktop Ratio
    "17:9" = 17 / 9,        // NOT META
    "256:135" = 256 / 135,  // Digital Cinema 4k
    "2:1" = 2,              // VR Resolution
    "21:9" = 21 / 9,        // Ultrawide
    "32:9" = 32 / 9,        // Samsung Ultrawide
    "4:1" = 4,              // Twitter Header Image
}

const TagSuggestions: SuggestionSet = {

    // Groups
    "multiple_images": { has: [/^solo$/, /^duo$/, /^group$/], matchCount: 2, not: /^multiple_scenes$/ },
    "multiple_scenes": { has: [/^solo$/, /^duo$/, /^group$/], matchCount: 2, not: /^multiple_images$/ },

    // Situation
    "rear_view": { has: /^looking_back$/ },

    // Penetration
    "male_penetrating": { has: /^male_penetrating_.+$/ },
    "female_penetrating": { has: /^female_penetrating_.+$/ },
    "andromorph_penetrating": { has: /^andromorph_penetrating_.+$/ },
    "gynomorph_penetrating": { has: /^gynomorph_penetrating_.+$/ },
    "herm_penetrating": { has: /^herm_penetrating_.+$/ },
    "maleherm_penetrating": { has: /^maleherm_penetrating_.+$/ },

    "male_penetrated": { has: /^.+_penetrating_male$/ },
    "female_penetrated": { has: /^.+_penetrating_female$/ },
    "andromorph_penetrated": { has: /^.+_penetrating_andromorph$/ },
    "gynomorph_penetrated": { has: /^.+_penetrating_gynomorph$/ },
    "herm_penetrated": { has: /^.+_penetrating_herm$/ },
    "maleherm_penetrated": { has: /^.+_penetrating_maleherm$/ },

    // Activities
    "sex": { has: /^(.+_penetrating_.+|.+_penetration)$/ },
    "rape": { has: /^forced$/ },
    "pregnant_sex": { has: [/^pregnant$/, /^sex$/] },
    "penis": { has: /(handjob|fellatio|penile)/ },
    "pussy": { has: /vaginal/ },

    // Anatomy
    "butt": { has: /^presenting_hindquarters$/ },
    "non-mammal_breasts": { has: [/^breasts$/, /^(reptile|lizard|marine|avian|arthropod)$/] },
    "knot": { has: /^canine_penis$/ },
    "sheath": { has: /^canine_penis$/ },
    "erection": { has: /penis/, not: /^flaccid$/ },
    "flaccid": { has: /penis/, not: /^erection$/ },

    "muscular_anthro": { has: [/^muscular/, /^anthro$/] },
    "muscular_feral": { has: [/^muscular/, /^feral$/] },
    "muscular_humanoid": { has: [/^muscular/, /^humanoid$/] },
    "muscular_human": { has: [/^muscular/, /^human$/] },
    "muscular_taur": { has: [/^muscular/, /^taur$/] },

    "muscular_male": { has: [/^muscular/, /^male$/] },
    "muscular_female": { has: [/^muscular/, /^female$/] },
    "muscular_andromorph": { has: [/^muscular/, /^andromorph$/] },
    "muscular_gynomorph": { has: [/^muscular/, /^gynomorph$/] },
    "muscular_herm": { has: [/^muscular/, /^herm$/] },
    "muscular_maleherm": { has: [/^muscular/, /^maleherm$/] },

    "overweight_anthro": { has: [/^overweight/, /^anthro$/] },
    "overweight_feral": { has: [/^overweight/, /^feral$/] },
    "overweight_humanoid": { has: [/^overweight/, /^humanoid$/] },
    "overweight_human": { has: [/^overweight/, /^human$/] },
    "overweight_taur": { has: [/^overweight/, /^taur$/] },

    "overweight_male": { has: [/^overweight/, /^male$/] },
    "overweight_female": { has: [/^overweight/, /^female$/] },
    "overweight_andromorph": { has: [/^overweight/, /^andromorph$/] },
    "overweight_gynomorph": { has: [/^overweight/, /^gynomorph$/] },
    "overweight_herm": { has: [/^overweight/, /^herm$/] },
    "overweight_maleherm": { has: [/^overweight/, /^maleherm$/] },

    // Body Parts
    "biped": { has: /^anthro$/, not: /^(uniped|triped)$/ },
    "quadruped": { has: /^feral$/, not: /^(hexapod)$/ },

}

type SuggestionSet = {
    [prop: string]: Suggestion;
};

type Suggestion = {
    has?: SuggestionParam;
    not?: SuggestionParam;
    matchCount?: number;
}

type SuggestionParam = RegExp | RegExp[];
