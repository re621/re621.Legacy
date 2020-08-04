import { E621 } from "../../components/api/E621";
import { APITag } from "../../components/api/responses/APITag";
import { APITagAlias } from "../../components/api/responses/APITagAlias";
import { AvoidPosting } from "../../components/cache/AvoidPosting";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Debug } from "../../components/utility/Debug";
import { Util } from "../../components/utility/Util";

export class SmartAlias extends RE6Module {

    // Elements to which smart alias instances are to be attached
    private static inputSelector = [
        "#post_tags",
        "#post_tag_string",
        "#post_characters",
        "#post_sexes",
        "#post_bodyTypes",
        "#post_themes",
    ];

    // Prevents multiple form executions
    private processingInput = false;

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

        // This assumes that there is only one tag input per page
        // If there are more... well, this whole things needs to be rewritten
        for (const inputElement of $(SmartAlias.inputSelector.join(", ")).get()) {
            const $textarea = $(inputElement);
            const $container = $("<smart-alias>").insertAfter($textarea);

            // Okay, this is incomprehensibly dumb
            // But there is no way to catch e621's autocomplte working without this
            let inputFocusInterval: number;         // Checks if the input has changed
            $textarea.on("focus", () => {
                console.log("focus in");

                let inputChangeTimeout: number;     // Checks if the user has stopped typing
                let inputValue = getInputValue();   // Input value on the previous iteration

                inputFocusInterval = setInterval(() => {

                    // Input value has not changed
                    if (getInputValue() === inputValue) return;
                    inputValue = getInputValue();

                    // Input value is blank
                    if (inputValue === "") {
                        $container.html("");
                        clearTimeout(inputChangeTimeout)
                        return;
                    }

                    // User is typing
                    if (inputChangeTimeout) clearTimeout(inputChangeTimeout);

                    inputChangeTimeout = window.setTimeout(() => {
                        console.log("user stopped typing");
                        this.handleTagInput($textarea, $container);
                    }, 500);
                }, 500);

            }).on("focusout", () => {
                console.log("focus out");
                clearInterval(inputFocusInterval);
            });

            // First call, in case the input area is not blank
            // i.e. on post page, or in editing mode
            this.handleTagInput($textarea, $container);

            function getInputValue(): string {
                return $textarea.val().toString().trim();
            }
        }
    }

    private async handleTagInput($textarea: JQuery<HTMLElement>, $container: JQuery<HTMLElement>): Promise<void> {
        if (this.processingInput) return;
        this.processingInput = true;

        // Prepare the necessary tools
        if (AvoidPosting.isUpdateRequired()) await AvoidPosting.update();
        $container.html("");

        Debug.log(getTagList($textarea));

        // Step 1
        // Create the structure and filter out tags that fail DNP immediately
        const tagsList: Set<string> = new Set();
        for (const tagName of getTagList($textarea)) {
            const dnp = AvoidPosting.has(tagName);
            if (!dnp) tagsList.add(tagName);

            const duplicate = findTagElement($container, tagName);
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
                .appendTo($container);
        }

        // Step 2
        // Replace aliased tag names with their consequent versions
        for (const batch of Util.chunkArray(tagsList, 40)) {
            for (const result of await E621.TagAliases.get<APITagAlias>({ "search[antecedent_name]": batch.join("+"), limit: 1000 }, 500)) {

                const currentName = result.antecedent_name,
                    trueName = result.consequent_name;

                // Replace the original name in the list
                tagsList.delete(currentName);

                const entries = findTagElement($container, currentName);
                const dnp = AvoidPosting.has(trueName);
                if (!dnp && entries.length == 1) tagsList.add(trueName);

                entries
                    .attr({
                        "name": trueName,
                        "state": dnp ? "dnp" : ((entries.length > 1) ? "duplicate" : "loading"),
                    })
                    .html(getTagContent(trueName, dnp, (entries.length > 1)));

                $textarea.val((index, currentValue) => {
                    return currentValue.replace(new RegExp("(^| )(" + currentName + ")( |$)", "gi"), "$1" + trueName + "$3");
                });
            }
        }

        // Step 3
        // Verify that the remaining tags are valid by querring the API and delete the ones that are found from the list
        for (const batch of Util.chunkArray(tagsList, 100)) {
            for (const result of await E621.Tags.get<APITag>({ "search[name]": batch.join(","), limit: 100 }, 500)) {
                findTagElement($container, result.name)
                    .attr("state", "success")
                    .append(` ${result.post_count}`);
                tagsList.delete(result.name);
            }
        }

        // Step 4
        // Tags that were not removed from the list must be invalid
        for (const invalidTag of tagsList) {
            findTagElement($container, invalidTag)
                .attr("state", "error")
                .append(` invalid tag`);
        }

        // Finish and clean up
        this.processingInput = false;

        /** Returns an array of tags in the textarea */
        function getTagList($textarea: JQuery<HTMLElement>): string[] {
            return $textarea
                .val().toString().trim()
                .replace(/\r?\n|\r/g, "")
                .split(" ")
                .filter((el) => { return el != null && el != ""; });
        }

        /** Finds a smart tag by its name attribute */
        function findTagElement($container: JQuery<HTMLElement>, name: string): JQuery<HTMLElement> {
            return $container.find(`smart-tag[name="${name}"]`);
        }

        /** Creates the inner html of a tag element */
        function getTagContent(tagName: string, dnp: boolean, duplicate: boolean): string {
            let result = `<a href="/wiki_pages/show_or_new?title=${tagName}">${tagName}</a>`;
            if (dnp) result += ` avoid posting`;
            else if (duplicate) result += ` duplicate tag`;
            return result;
        }

    }

}
