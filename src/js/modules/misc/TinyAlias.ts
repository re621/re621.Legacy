import { Danbooru } from "../../components/api/Danbooru";
import { E621 } from "../../components/api/E621";
import { APITag } from "../../components/api/responses/APITag";
import { APITagAlias } from "../../components/api/responses/APITagAlias";
import { APIWikiPage } from "../../components/api/responses/APIWikiPage";
import { AvoidPosting } from "../../components/data/AvoidPosting";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Modal } from "../../components/structure/Modal";

export class TinyAlias extends RE6Module {

    private $textarea: JQuery<HTMLElement>;
    private $container: JQuery<HTMLElement>;

    private $infoText: JQuery<HTMLElement>;

    private tagAlreadyChecked: boolean;
    private aliasData;

    public constructor() {
        super([PageDefintion.upload, PageDefintion.post, PageDefintion.search]);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            checkDNP: true,
            data: {}
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();
        this.buildDOM();
    }

    public destroy(): void {
        if (!this.isInitialized()) return;
        super.destroy();
        this.$container.find("input").unbind();
        this.$container.find("div.tiny-alias-container").remove();
    }

    /** Creates the document structure for the module */
    private buildDOM(): void {
        //rebuild the layout when clicking on the edit button
        //the event on that modifies the dom and removes the tinyalias container
        //simply add it back after a small duration
        $("#post-edit-link").one("click", () => {
            this.destroy();
            setTimeout(() => {
                this.create();
            }, 100);
        });
        this.$textarea = $("textarea#post_tags, textarea#post_tag_string");
        this.$container = this.$textarea.parent();

        // Building the structure
        const $toolbar = $("<div>")
            .addClass("tiny-alias-container")
            .insertAfter(this.$textarea);

        const $sortButton = $("<button>").attr("type", "button").html("Sort").appendTo($toolbar);
        this.$infoText = $("<div>").addClass("info-text").appendTo($toolbar);
        const $settingsButton = $("<button>").attr("type", "button").html("TinyAlias").appendTo($toolbar);

        const $insertButton = $("<button>")
            .html("Insert")
            .attr("type", "button")
            .appendTo($toolbar);
        const $input = $("<input>")
            .attr({ type: "text" })
            .attr("id", "tiny-alias-taginput")
            .attr("data-autocomplete", "tag")
            .addClass("ui-autocomplete-input")
            .appendTo($toolbar);

        Danbooru.Autocomplete.initialize_all();

        // Check button
        this.tagAlreadyChecked = false;
        let inputUpdateInterval: number;    // Checking input while it is in focus
        let changeTimeout: number;          // Waiting for the user to stop typing
        $input.on("focus", () => {
            let inputValue = getInputValue();
            inputUpdateInterval = setInterval(() => {
                // Input has changed
                if (getInputValue() === inputValue) return;
                inputValue = getInputValue();
                this.tagAlreadyChecked = false;

                // Input is not blank
                if (inputValue === "") {
                    this.$infoText.html("").removeAttr("data-state");
                    clearTimeout(changeTimeout)
                    return;
                }

                // User has stopped typing
                if (changeTimeout) clearTimeout(changeTimeout);
                changeTimeout = window.setTimeout(() => {
                    this.handleCheckButton($input);
                }, 500);
            }, 500);

            function getInputValue(): string {
                return $input.val().toString().trim();
            }
        }).on("focusout", () => { clearInterval(inputUpdateInterval); });

        // Insert tag
        $insertButton.on("click", () => {
            if (!this.tagAlreadyChecked) return;
            this.handleInsertButton($input);
        });

        // Sort textarea
        $sortButton.on("click", () => {
            let tags = this.getTextareaArray();
            tags = [...new Set(tags)];
            tags.sort();
            this.$textarea.val(tags.join(" "));
        });

        // Settings Page
        const $aliasList = $("<div>").addClass("alias-list");

        $("<div>").html("<h3>New Alias</h3>").appendTo($aliasList);
        const $newAliasForm = this.buildAliasForm($aliasList, "", "", "alias-form-new");
        $newAliasForm.css("margin-bottom", "1.5rem");
        $newAliasForm.find("button[type='button']").css("visibility", "hidden");
        $newAliasForm.find("button[type='submit']").html("Create");
        $newAliasForm.find("input[type='text']").removeAttr("disabled");

        this.aliasData = this.fetchSettings("data");
        if (this.aliasData.length > 0) {
            $("<div>").html("<h3>Existing Aliases</h3>").appendTo($aliasList);
        }

        for (const [index, name] of Object.keys(this.aliasData).entries()) {
            this.makeAliasEntry($aliasList, name, this.aliasData[name], index + "");
        }

        $newAliasForm.submit(async (event) => {
            event.preventDefault();
            const $name = $newAliasForm.find("input[type='text']");
            const $data = $newAliasForm.find("textarea");

            $name.removeClass("invalid");
            $data.removeClass("invalid");

            if ($name.val() === "" || this.aliasData[$name.val() + ""]) {
                $name.addClass("invalid");

                if ($data.val() === "") { $data.addClass("invalid"); }
                return;
            }
            if ($data.val() === "") {
                $data.addClass("invalid");
                return;
            }

            this.aliasData[$name.val() + ""] = $data.val() + "";
            await this.pushSettings("data", this.aliasData);
            this.makeAliasEntry($aliasList, $name.val() + "", $data.val() + "", this.aliasData.length + "");

            $name.val("");
            $data.val("");
        });

        new Modal({
            title: "Tiny Alias",
            triggers: [{ element: $settingsButton }],
            fixed: true,
            position: { at: "center", my: "center" },
            content: $aliasList,
        });
    }

    /** Handles the process of tag insertion */
    private handleInsertButton($input: JQuery<HTMLElement>): void {
        if (!this.insertAlias($input.val().toString())) {
            this.insertTag($input.val().toString());
        }
        $input.val("");
        this.$infoText.html(" ");
    }

    /** Handles the tag checking */
    private async handleCheckButton($input: JQuery<HTMLElement>): Promise<void> {
        const tag = this.prepareTag($input.val().toString());
        if (this.tagAlreadyAdded(tag)) {
            this.$infoText
                .html("Tag has already been added")
                .attr("data-state", "error");

            // Looking for the wiki page
            E621.Wiki.get<APIWikiPage>({ "search[title]": encodeURIComponent(tag) }, 500).then((data) => {
                const wikiPage = data[0];
                if (wikiPage !== undefined && wikiPage.title === tag)
                    this.$infoText.append(` <a href="/wiki_pages/${wikiPage.id}">wiki</a>`);
            });

            return;
        }

        this.aliasData = this.fetchSettings("data");
        if (this.aliasData[tag]) {
            this.tagAlreadyChecked = true;
            this.$infoText
                .html("Found alias: " + tag)
                .attr("data-state", "done");
            return;
        }

        this.$infoText.attr("data-state", "loading");
        const tagInfo = await this.getTagInfo(tag);
        if (tagInfo.isInvalid) {
            this.$infoText
                .html("Invalid tag name")
                .attr("data-state", "error");
            return;
        }

        this.$infoText.html(tagInfo.count + " posts");

        if (tagInfo.isAliased) {
            this.$infoText.append(" (~" + tagInfo.realName + ")");
            $input.val(tagInfo.realName);
        }

        // Checking for DNP implications
        if (await AvoidPosting.contains(tag) || (tagInfo.isAliased && await AvoidPosting.contains(tagInfo.realName))) {
            this.$infoText.append(`: ` + tag + ` is on <a href="/wiki_pages/85">DNP</a> list`);
        }

        // Tag should be validated beyond this point
        this.tagAlreadyChecked = true;

        // Looking for the wiki page
        this.$infoText.append(` <a href="/wiki_pages/show_or_new?title=${encodeURIComponent(tagInfo.realName)}">wiki</a>`);

        this.$infoText.attr("data-state", "done");
        return;
    }

    /**
     * Normalizes input into a standard form
     * @param input Input to normalize
     */
    private prepareInput(input: string): string {
        return input.trim().toLowerCase();
    }

    /**
     * Converts a human-readable tag name into a proper tag
     * @param input Tag to convert
     */
    private prepareTag(input: string): string {
        return this.prepareInput(input).replace(/ /g, "_");
    }

    /**
     * Inserts the specified tag into the textarea
     * @param input Tag to insert
     */
    private insertTag(input: string): void {
        input = this.prepareTag(input);
        this.$textarea.val((i, text) => {
            if (text.endsWith(" ") || text.length === 0) return text + input;
            else return text + " " + input;
        });
    }

    /**
     * Insert the aliases of the specified tag into the textarea
     * @param input Aliased input
     * @returns True if the input had aliases, false otherwise
     */
    private insertAlias(input: string): boolean {
        const aliasList = this.fetchSettings("data");
        input = this.prepareTag(input);

        if (aliasList[input]) {
            this.$textarea.val(function (i, text) {
                if (text.endsWith(" ") || text.length === 0) return text + aliasList[input];
                else return text + " " + aliasList[input];
            });
            return true;
        }
        return false;
    }

    /**
     * Checks if the provided tag is already in the textarea
     * @param input Tag to look for
     * @returns True if the tag exists, false otherwise
     */
    private tagAlreadyAdded(input: string): boolean {
        input = this.prepareTag(input);
        return this.getTextareaArray().includes(input);
    }

    /**
     * Searches the API for the tag data
     * @param tag Tag to look up
     */
    private async getTagInfo(tag: string): Promise<TagResult> {
        tag = encodeURIComponent(tag);
        const result: TagResult = {
            count: 0,
            isInvalid: false,
            isAliased: false,
            realName: undefined
        };

        // First data query
        let jsonData = await E621.Tags.find(tag).get<APITag>("", 500);
        if (jsonData.length == 0 || jsonData[0].name === "invalid_tag") {
            result.isInvalid = true;
            return result;
        }

        result.count = jsonData[0].post_count;
        result.realName = jsonData[0].name;

        // Checking for aliases
        const aliasJson = await E621.TagAliases.get<APITagAlias>({ "search[antecedent_name]": tag }, 500);
        if (aliasJson[0] !== undefined) {
            result.isAliased = true;
            result.realName = aliasJson[0].consequent_name;

            if (result.realName === "invalid_tag") {
                result.isInvalid = true;
                return result;
            }

            // Getting alias data
            jsonData = await E621.Tags.find(encodeURIComponent(result.realName)).get<APITag>("", 500);
            result.count = jsonData[0].post_count;
        }

        return result;
    }

    /**
     * Creates a new entry with an alias editing form
     * @param $aliasList Object to append the entry to
     * @param name Alias name
     * @param data Contents
     * @param id Unique ID
     */
    private makeAliasEntry($aliasList: JQuery<HTMLElement>, name: string, data: string, id: string): void {
        const $aliasForm = this.buildAliasForm($aliasList, name, data, "alias-form-" + id);
        $aliasForm.appendTo($aliasList);
        $aliasForm.submit(async (event) => {
            event.preventDefault();
            const $name = $aliasForm.find("input[type='text']");
            const $data = $aliasForm.find("textarea");

            this.aliasData[$name.val() + ""] = $data.val() + "";
            await this.pushSettings("data", this.aliasData);
        });
        $aliasForm.find("button[type='button']").click(async (event) => {
            event.preventDefault();
            const $name = $aliasForm.find("input[type='text']");
            this.aliasData[$name.val() + ""] = undefined;
            await this.pushSettings("data", this.aliasData);
            $aliasForm.remove();
        });
    }

    /**
     * Creates a form within an alias entry
     * @param $aliasList Object to append the entry to
     * @param name Alias name
     * @param data Contents
     * @param id Unique ID
     */
    private buildAliasForm($aliasList: JQuery<HTMLElement>, name: string, data: string, id: string): JQuery<HTMLElement> {
        const $aliasForm = $("<form>")
            .attr("id", id)
            .appendTo($aliasList);

        $("<input>")
            .attr({
                type: "text",
                name: "name",
                placeholder: "name",
                disabled: "",
            })
            .val(name)
            .appendTo($aliasForm);
        $("<textarea>")
            .attr({
                name: "data",
                placeholder: "tags",
            })
            .val(data)
            .appendTo($aliasForm);

        $("<button>").attr({ type: "button" }).html("Delete").appendTo($aliasForm);
        $("<button>").attr({ type: "submit" }).html("Update").appendTo($aliasForm);
        return $aliasForm;
    }

    /** Returns the textarea value as a string */
    private getTextareaString(): string {
        return this.$textarea.val().toString().toLowerCase().trim();
    }

    /** Returns the textarea value as an array */
    private getTextareaArray(): string[] {
        return this.getTextareaString().split(/[\s\n]+/).map(e => e.trim());
    }

}

interface TagResult {
    count: number;
    isInvalid: boolean;
    isAliased: boolean;
    realName: string;
}
