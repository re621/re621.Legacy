import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { ApiTag } from "../../components/api/responses/ApiTag";
import { Modal } from "../../components/structure/Modal";
import { AvoidPosting } from "../../components/data/AvoidPosting";
import { ApiWikiPage } from "../../components/api/responses/ApiWikiPage";

export class TinyAlias extends RE6Module {

    private $textarea: JQuery<HTMLElement>;
    private $container: JQuery<HTMLElement>;

    private $infoText: JQuery<HTMLElement>;
    private $infoLoad: JQuery<HTMLElement>;

    private tagAlreadyChecked: boolean;
    private aliasData;

    public constructor() {
        super([PageDefintion.upload, PageDefintion.post]);
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
        if (!this.canInitialize()) return;
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
            .appendTo(this.$container);

        const $input = $("<input>")
            .attr({ type: "text", required: "", pattern: ".+", })
            .attr("id", "tiny-alias-taginput")
            .appendTo($toolbar);
        const $insertButton = $("<button>")
            .html("Insert")
            .attr("type", "button")
            .appendTo($toolbar);

        const $infoTextBox = $("<div>").appendTo($toolbar);
        this.$infoText = $("<div>").addClass("info-text").appendTo($infoTextBox);
        this.$infoLoad = $("<div>").addClass("info-load").html(`<i class="fas fa-spinner fa-spin"></i>`).appendTo($infoTextBox);
        const $settingsButton = $("<button>").attr("type", "button").html("TinyAlias").appendTo($toolbar);
        const $sortButton = $("<button>").attr("type", "button").html("Sort").appendTo($toolbar);
        // Adding Functionality
        this.tagAlreadyChecked = false;
        let timer: number;
        $input.on("input", () => {
            this.tagAlreadyChecked = false;
            if ($input.val() === "") {
                this.$infoText.html("");
                return;
            }

            if (timer) clearTimeout(timer);
            timer = window.setTimeout(() => {
                this.handleCheckButton($input);
            }, 500);
        });

        // Insert tag
        $input.bind("keyup", "return", () => {
            if (!this.tagAlreadyChecked) return;
            this.handleInsertButton($input);
        });

        $insertButton.on("click", () => {
            if (!this.tagAlreadyChecked) return;
            this.handleInsertButton($input);
        });

        // Sort textarea
        $sortButton.on("click", () => {
            const currentText = this.prepareInput(this.$textarea.val());
            let tags = currentText.split(" ").map(e => e.trim());
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
            console.log(index, name);
            this.makeAliasEntry($aliasList, name, this.aliasData[name], index + "");
        }

        $newAliasForm.submit((event) => {
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
            this.pushSettings("data", this.aliasData);
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
            this.$infoText.html("Tag has already been added");
            return;
        }

        this.aliasData = this.fetchSettings("data");
        if (this.aliasData[tag]) {
            this.tagAlreadyChecked = true;
            this.$infoText.html("Found alias: " + tag);
            return;
        }

        const tagInfo = await this.getTagInfo(tag);
        if (tagInfo.isInvalid) {
            this.$infoText.html("Invalid tagname");
            return;
        }

        this.tagAlreadyChecked = true;

        if (tagInfo.isAliased) {
            this.$infoText.append(" (~" + tagInfo.realName + ")");
            $input.val(tagInfo.realName);
        }

        if (tagInfo.wikiPageId) {
            this.$infoText.append(` <a href="/wiki_pages/${tagInfo.wikiPageId}">wiki</a>`);
        }

        if (tagInfo.isDNP) {
            this.$infoText.append(`: ` + tag + ` is on <a href="/wiki_pages/85">DNP</a> list`);
        }

        this.$infoLoad.removeClass("visible");
        return;
    }

    /**
     * Normalizes input into a standard form
     * @param input Input to normalize
     */
    private prepareInput(input): string {
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
        console.log("looking up <" + input + ">");
        const aliasList = this.fetchSettings("data");
        input = this.prepareTag(input);

        if (aliasList[input]) {
            console.log("found " + aliasList[input]);
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
        return this.$textarea.val().toString().includes(input);
    }

    /**
     * Searches the API for the tag data
     * @param tag Tag to look up
     */
    private async getTagInfo(tag: string): Promise<TagResult> {
        this.$infoLoad.addClass("visible");
        tag = encodeURIComponent(tag);
        const result: TagResult = {
            count: 0,
            isInvalid: false,
            isAliased: false,
            isDNP: false,
            realName: undefined,
            wikiPageId: undefined
        };

        // First data query
        let jsonData: ApiTag = await Api.getJson("/tags/" + tag + ".json", 500);
        if (jsonData === null) {
            result.isInvalid = true;
            return result;
        }

        result.count = jsonData.post_count;
        result.realName = jsonData.name;
        this.$infoText.html(result.count + " posts");

        // Checking for aliases
        const aliasJson: ApiTag = await Api.getJson("/tag_aliases.json?search[antecedent_name]=" + tag, 500);
        if (aliasJson[0] !== undefined) {
            result.isAliased = true;
            const trueTagName = aliasJson[0].consequent_name;

            // Getting alias data
            jsonData = await Api.getJson("/tags/" + encodeURIComponent(trueTagName) + ".json", 500);
            result.count = jsonData.post_count;
            result.realName = trueTagName;
        }

        // Checking for DNP implications
        if (AvoidPosting.contains(tag) || (result.isAliased && AvoidPosting.contains(result.realName))) {
            result.isDNP = true;
        }

        const wikiPage: ApiWikiPage = (await Api.getJson(`/wiki_pages.json?search[title]=${encodeURIComponent(result.realName)}`, 500))[0];
        if (wikiPage !== undefined && wikiPage.title === result.realName) {
            result.wikiPageId = wikiPage.id;
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
        $aliasForm.submit((event) => {
            event.preventDefault();
            const $name = $aliasForm.find("input[type='text']");
            const $data = $aliasForm.find("textarea");

            console.log("pushing " + $name.val() + " with " + $data.val());
            console.log(this.aliasData[$name.val() + ""]);

            console.log("updating");

            this.aliasData[$name.val() + ""] = $data.val() + "";
            this.pushSettings("data", this.aliasData);
        });
        $aliasForm.find("button[type='button']").click((event) => {
            event.preventDefault();
            const $name = $aliasForm.find("input[type='text']");
            this.aliasData[$name.val() + ""] = undefined;
            this.pushSettings("data", this.aliasData);
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

}

interface TagResult {
    count: number;
    isInvalid: boolean;
    isAliased: boolean;
    realName: string;
    isDNP: boolean;
    wikiPageId: number;
}
