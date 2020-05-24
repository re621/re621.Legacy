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
            flags: [
                { name: "NCHARS", color: "#fff", tags: "-solo -duo -group -zero_pictured" },
                { name: "SEXES", color: "#fff", tags: "-zero_pictured -male -female -herm -maleherm -andromorph -gynomorph -intersex -ambiguous_gender" },
            ]
        };
    }

    public create(): void {

        if (Page.matches(PageDefintion.post)) this.createPostPage();

    }

    protected createPostPage(): void {
        // Parse the post for active flags
        const flagData = this.fetchSettings<FlagDefinition[]>("flags"),
            tagData = Post.getViewingPost().getTagArray(),
            activeFlags: string[] = [];

        for (const flag of flagData) {
            if (CustomFlagger.tagsMatchFilter(tagData, flag.tags.split(" ")))
                activeFlags.push(`<span class="custom-flag-title" style="background-color: ${flag.color}">${flag.name}</span> ${flag.tags}`);
        }

        // Display the flags if any are active
        if (activeFlags.length == 0) return;

        const flagContainer = $("<div>")
            .insertAfter("div.input#tags-container");

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

    private static tagsMatchFilter(tags: string[], filter: string[]): boolean {
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

export interface FlagDefinition {
    name: string;
    color: string;
    tags: string;
}
