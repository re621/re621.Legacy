import { PageDefinition } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

export class TagSuggester extends RE6Module {

    private container: JQuery<HTMLElement>;
    private textarea: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefinition.upload], true);
    }

    public create(): void {
        super.create();

        this.textarea = $("#post_tags");
        this.container = $("<tag-suggester>")
            .attr("ready", "true")
            .appendTo(this.textarea.parent());

        // Listen for updates from other modules
        TagSuggester.on("update.main", () => { this.update(); })
        this.update();

        // Update the suggestions on user tag input
        let typingTimeout: number;
        this.textarea.on("input", () => {

            // handleTagInput triggers an input event to properly fill in the data bindings
            // this ensures that it will not result in an infinite loop
            if (this.textarea.data("vue-event-alt") === "true") {
                this.textarea.data("vue-event-alt", "false");
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

    private update(): void {
        const textarea = this.textarea;
        const container = this.container
            .html("")
            .attr("ready", "false");

        const tags = new Set(Util.getTags(this.textarea)),
            suggestions = {};

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
            if (data.year && data.year > 0)
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
            let matchCount = 0;
            for (const entry of tags)
                if (testMatches(matches, entry)) matchCount++;
            if (matchCount == matches.length)
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
                    textarea.val((index, value) => {
                        return value
                            + ((value.length == 0 || value.endsWith(" ")) ? "" : " ")
                            + tagName
                            + " ";
                    });
                    Util.Events.triggerVueEvent(textarea, "input", "vue-event-alt");
                })
                .html(tagName)
                .appendTo(wrapper);
        }

        function testMatches(matches: RegExp | RegExp[], entry: string): boolean {
            if (!Array.isArray(matches)) matches = [matches];
            for (const match of matches)
                if (match.test(entry)) return true;
            return false;
        }

        function formatMatchRegex(matches: RegExp | RegExp[]): string {
            if (!Array.isArray(matches)) matches = [matches];

            const results = [];
            for (const match of matches)
                results.push(
                    (match + "")
                        .replace(/\/\^|\$\//g, "")
                        .replace(/^\((.*)\)$/g, "$1")
                        .replace(/\.\+/g, "*")
                        .replace(/\|/g, " / ")
                );
            return results.join(" AND ");
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

const TagSuggestions = {

    "sex": [/^(.+_penetrating_.+|.+_penetration)$/],


}
