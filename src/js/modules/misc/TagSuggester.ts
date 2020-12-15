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

        TagSuggester.on("update.main", () => { this.update(); })
        this.update();

        let typingTimeout: number;
        this.textarea.on("input", () => {

            // handleTagInput triggers an input event to properly fill in the data bindings
            // this ensures that it will not result in an infinite loop
            if (this.textarea.data("vue-event-alt") === "true") {
                this.textarea.data("vue-event-alt", "false");
                console.log("vue event");
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
        console.log("Updating Tag Suggestions");

        const textarea = this.textarea;
        const container = this.container
            .html("")
            .attr("ready", "false");

        const tags = new Set(Util.getTags(this.textarea));

        // Data derived from the file
        const output = $("#preview-sidebar div.upload_preview_dims").first();
        if (output.length) {

            // Year
            if (output.data("year"))
                addSuggestion(output.data("year"));

            // Ratio
            if (output.data("width") && output.data("height")) {
                const ratio = TagSuggester.getImageRatio(output.data("height") / output.data("width"));
                if (ratio) addSuggestion(ratio);
            }

            // Filesize
            if (output.data("size") && output.data("size") > 31457280)
                addSuggestion("huge_filesize");
        }

        container.attr({
            "ready": "true",
            "count": container.children().length,
        });

        /**
         * Adds a new suggestion to the list
         * @param tagName Name of the tag to suggest
         */
        function addSuggestion(tagName: string): void {
            if (tags.has(tagName + "")) return;

            const wrapper = $("<tag-entry>").appendTo(container);

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
                    triggerUpdateEvent();
                    // TagSuggester.trigger("update");
                })
                .html(tagName)
                .appendTo(wrapper);
        }


        /**
         * Fix for Vue data-attribute binding  
         * This needs to be executed every time the textarea value gets changed
         */
        function triggerUpdateEvent(): void {
            const e = document.createEvent('HTMLEvents');
            e.initEvent("input", true, true);
            textarea.data("vue-event-alt", "true")
            textarea[0].dispatchEvent(e);
        }
    }

    private static getImageRatio(ratio: number): string {
        ratio = parseFloat(ratio.toFixed(2));
        for (const [name, value] of Object.entries(ImageRatio))
            if (value == ratio) return name;
        return null;
    }
}

enum ImageRatio {
    "1:1" = 1,          // Icons / Avatars
    "1:4" = 0.25,
    "9:32" = 0.28,
    "1:2" = 0.5,
    "9:21" = 0.43,
    "9:17" = 0.53,      // NOT META
    "9:16" = 0.56,
    "4:7" = 0.57,       // NOT META
    "10:16" = 0.63,
    "9:14" = 0.64,
    "2:3" = 0.67,       // Common Phone Ratio
    "3:4" = 0.75,
    "4:5" = 0.8,
    "5:6" = 0.83,
    "6:5" = 1.2,        // NOT META
    "5:4" = 1.25,       // Common Desktop Ratio
    "4:3" = 1.33,       // Common Desktop Ratio
    "3:2" = 1.5,        // Common Desktop Ratio
    "14:9" = 1.56,      // 4:3 / 16:9 compromise
    "16:10" = 1.6,      // Common Desktop Ratio
    "7:4" = 1.75,
    "16:9" = 1.78,      // Common Desktop Ratio
    "17:9" = 1.89,      // NOT META
    "256:135" = 1.9,    // Digital Cinema 4k
    "2:1" = 2,          // VR Resolution
    "21:9" = 2.33,      // Ultrawide
    "32:9" = 3.55,      // Samsung Ultrawide
    "4:1" = 4,          // Twitter Header Image
}
