import { Page, PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

export class CustomFlagger extends RE6Module {

    public constructor() {
        super([PageDefintion.search, PageDefintion.post]);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            flags: `NCHARS: -solo -duo -group -zero_pictured\nSEXES: -zero_pictured -male -female -herm -maleherm -andromorph -gynomorph -intersex -ambiguous_gender`,
        };
    }

    public create(): void {

        if (Page.matches(PageDefintion.post)) this.createPostPage();

    }

    protected createPostPage(): void {
        // Parse the post for active flags
        const flagData = this.parseFlagsString(),
            tagData = Post.getViewingPost().getTagArray(),
            activeFlags: string[] = [];

        flagData.forEach((filter, key) => {
            if (this.tagsMatchFilter(tagData, filter))
                activeFlags.push(`<span class="custom-flag-title">${key}</span> ${filter.join(" ")}`);
        });

        // Display the flags if any are active
        if (activeFlags.length == 0) return;

        const flagContainer = $("<div>")
            .prependTo("form.formatting-helper#form");

        $("<b>")
            .html("Flags")
            .addClass("display-block")
            .appendTo(flagContainer);

        activeFlags.forEach((entry) => {
            $("<div>")
                .addClass("custom-flag")
                .html(entry)
                .appendTo(flagContainer);
        });
    }

    private parseFlagsString(): Map<string, string[]> {
        const result = new Map<string, string[]>();
        const flags = this.fetchSettings("flags").split("\n")

        for (let entry of flags) {
            entry = entry.trim();
            if (entry.length == 0) continue;

            const entryData = entry.split(":");
            if (entryData.length != 2) continue;

            result.set(entryData[0], entryData[1].trim().split(" "));
        }

        return result;
    }

    private tagsMatchFilter(tags: string[], filter: string[]): boolean {
        for (const entry of filter) {
            if (entry.startsWith("-")) {         // negation
                if (tags.includes(entry.substr(1))) return false;
            } else if (entry.startsWith("~")) {  // optional
                // TODO Implement optional tag handling
                if (!tags.includes(entry.substr(1))) return false;
            } else {                            // generic
                if (!tags.includes(entry)) return false;
            }
        }

        return true;
    }

}
