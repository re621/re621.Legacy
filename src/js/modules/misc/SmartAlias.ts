import { E621 } from "../../components/api/E621";
import { APITag } from "../../components/api/responses/APITag";
import { AvoidPosting } from "../../components/cache/AvoidPosting";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

export class SmartAlias extends RE6Module {

    private $textarea: JQuery<HTMLElement>;
    private $container: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefintion.upload, PageDefintion.post, PageDefintion.search]);
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
        this.$textarea
            .off("focus.re621.smart-alias")
            .off("focusout.re621.smart-alias");
        this.$container.remove();
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

        // This assumes that there is only one tag input per page
        // If there are more... well, this whole things needs to be rewritten
        this.$textarea = $("textarea#post_tags, textarea#post_tag_string").first();
        this.$container = $("<smart-alias>").insertAfter(this.$textarea);

        // Okay, this is incomprehensibly dumb
        // But there is no way to catch e621's autocomplte working without this
        let inputFocusInterval: number;     // Checks if the input has changed
        let inputChangeTimeout: number;     // Checks if the user has stopped typing
        this.$textarea.on("focus", () => {
            let inputValue = this.getInputValue();
            inputFocusInterval = setInterval(() => {

                // Input value has changed
                if (this.getInputValue() === inputValue) return;
                inputValue = this.getInputValue();

                // Input value is not blank
                if (inputValue === "") {
                    // TODO Handle blank textarea
                    clearTimeout(inputChangeTimeout)
                    return;
                }

                // User has stopped typing
                if (inputChangeTimeout) clearTimeout(inputChangeTimeout);
                inputChangeTimeout = window.setTimeout(() => {
                    // TODO Handle input values
                    this.handleTagInput();
                }, 500);
            }, 500);

        }).on("focusout", () => { clearInterval(inputFocusInterval); });

    }

    private getInputValue(): string {
        return this.$textarea.val().toString().trim();
    }

    private async handleTagInput(): Promise<void> {
        // TODO Make sure only one instance of this function runs at one time

        // Prepare the necessary tools
        if (AvoidPosting.isUpdateRequired()) await AvoidPosting.update();
        this.$container.html("");

        // Step 1
        // Create the structure and filter out tags that fail DNP immediately
        const tagsList: Set<string> = new Set();
        for (const tagName of this.getInputValue().split(" ")) {
            const dnp = AvoidPosting.has(tagName);
            if (!dnp) tagsList.add(tagName);

            const duplicate = find(tagName);
            duplicate
                .html(getTagContent(tagName, dnp, (duplicate.length !== 0)))
                .attr("state", "duplicate");
            if (duplicate.length !== 0) tagsList.delete(tagName);

            $("<smart-tag>")
                .attr({
                    "name": tagName,
                    "state": dnp ? "dnp" : ((duplicate.length !== 0) ? "duplicate" : "loading"),
                })
                .html(getTagContent(tagName, dnp, (duplicate.length !== 0)))
                .appendTo(this.$container);
        }

        // Step 2
        // Verify that the remaining tags are valid by querring the API and delete the ones that are found from the list
        for (const batch of Util.chunkArray(Array.from(tagsList), 100)) {
            for (const result of await E621.Tags.get<APITag>({ "search[name]": batch.join(","), limit: 100 }, 500)) {
                find(result.name)
                    .attr("state", "success")
                    .append(` ${result.post_count}`);
                tagsList.delete(result.name);
            }
        }

        // Step 3
        // Tags that were not removed from the list must be invalid
        for (const invalidTag of tagsList) {
            find(invalidTag)
                .attr("state", "error")
                .append(` invalid tag`);
        }

        /** Finds a smart tag by its name attribute */
        function find(name: string): JQuery<HTMLElement> {
            return $(`smart-tag[name=${name}]`);
        }

        function getTagContent(tagName: string, dnp: boolean, duplicate: boolean): string {
            let result = `<a href="/wiki_pages/show_or_new?title=${tagName}">${tagName}</a>`;
            if (dnp) result += ` avoid posting`;
            else if (duplicate) result += ` duplicate tag`;
            return result;
        }

    }

}
