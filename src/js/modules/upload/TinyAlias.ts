import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { ApiTag } from "../../components/api/responses/ApiTag";

declare var Danbooru;

export class TinyAlias extends RE6Module {

    private static instance: TinyAlias;

    private $textarea: JQuery<HTMLElement>;
    private $container: JQuery<HTMLElement>;

    private $infoText: JQuery<HTMLElement>;

    private tagAlreadyChecked: boolean;

    private constructor() {
        super(PageDefintion.upload);
        if (!this.eval()) {
            this.reserveHotkeys();
            return;
        }

        this.buildDOM();
    }

    /**
     * Returns a singleton instance of the SettingsController
     * @returns ThemeCustomizer instance
     */
    public static getInstance() {
        if (this.instance === undefined) this.instance = new TinyAlias();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            data: [],
        };
    }

    /** Creates the document structure for the module */
    private buildDOM() {
        this.$textarea = $("textarea#post_tags");
        this.$container = this.$textarea.parent();

        // Building the structure
        let $toolbar = $("<div>")
            .addClass("tiny-alias-container")
            .appendTo(this.$container);

        let $input = $("<input>")
            .attr({ type: "text", required: "", pattern: ".+", })
            .appendTo($toolbar);
        let $insertButton = $("<button>")
            .html("Insert")
            .appendTo($toolbar);

        this.$infoText = $("<div>").appendTo($toolbar);
        let $settingsButton = $("<button>").html("TinyAlias").appendTo($toolbar);
        let $sortButton = $("<button>").html("Sort").appendTo($toolbar);

        // Adding Functionality
        this.tagAlreadyChecked = false;
        let timer: number;
        $input.on("input", () => {
            this.tagAlreadyChecked = false;
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

        $settingsButton.on("click", () => {
            // openSettingsTab("enhancePostUploader")
        });

        $sortButton.click(() => {
            const currentText = this.prepareInput(this.$textarea.val());
            let tags = currentText.split(" ");
            tags = [...new Set(tags)];
            tags.sort();
            this.$textarea.val(tags.join(" "));
        });
    }

    /** Handles the process of tag insertion */
    private handleInsertButton($input: JQuery<HTMLElement>) {
        if (!this.insertAlias($input.val().toString())) {
            this.insertTag($input.val().toString());
        }
        $input.val("");
        this.$infoText.html(" ");
    }

    /** Handles the tag checking */
    private async handleCheckButton($input: JQuery<HTMLElement>) {
        let tag = this.prepareTag($input.val().toString());
        if (this.tagAlreadyAdded(tag)) {
            this.$infoText.html("Tag has already been added");
            return;
        }

        this.$infoText.html(`<i class="fas fa-spinner fa-spin"></i>`);

        const tagInfo = await this.getTagInfo(tag);
        if (tagInfo.invalid) {
            this.$infoText.html("Invalid tagname");
            return;
        }

        this.tagAlreadyChecked = true;
        this.$infoText.html(tagInfo.count + " posts");
        if (tagInfo.is_alias) {
            this.$infoText.append(": " + tag + " is alias of " + tagInfo.true_name);
            $input.val(tagInfo.true_name);
        }
    }

    /**
     * Normalizes input into a standard form
     * @param input Input to normalize
     */
    private prepareInput(input) {
        return input.trim().toLowerCase();
    }

    /**
     * Converts a human-readable tag name into a proper tag
     * @param input Tag to convert
     */
    private prepareTag(input: string) {
        return this.prepareInput(input).replace(/ /g, "_");
    }

    /**
     * Inserts the specified tag into the textarea
     * @param input Tag to insert
     */
    private insertTag(input: string) {
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
    private insertAlias(input: string) {
        const tinyAliases = this.fetchSettings("data");
        input = this.prepareTag(input);
        if (tinyAliases[input]) {
            this.$textarea.val((i, text) => {
                if (text.endsWith(" ") || text.length === 0) return text + tinyAliases[input];
                else return text + " " + tinyAliases[input];
            });
            return true;
        }
        return false
    }

    /**
     * Checks if the provided tag is already in the textarea
     * @param input Tag to look for
     * @returns True if the tag exists, false otherwise
     */
    private tagAlreadyAdded(input: string) {
        input = this.prepareTag(input);
        return this.$textarea.val().toString().includes(input);
    }

    /**
     * Searches the API for the tag data
     * @param tag Tag to look up
     */
    private async getTagInfo(tag: string) {
        tag = encodeURIComponent(tag);
        const result = {
            count: 0,
            invalid: false,
            is_alias: false,
            true_name: undefined
        }

        let jsonData: ApiTag = await Api.getJson("/tags/" + tag + ".json");
        if (jsonData === null) {
            result.invalid = true;
            return result;
        } else if (jsonData.post_count !== 0) {
            result.count = jsonData.post_count;
            return result;
        }

        this.$infoText.html("Checking alias...");
        let aliasJson: ApiTag = await Api.getJson("/tag_aliases.json?search[antecedent_name]=" + tag);
        if (aliasJson[0] === undefined) return result;

        result.is_alias = true;
        const trueTagName = aliasJson[0].consequent_name;

        jsonData = await Api.getJson("/tags/" + encodeURIComponent(trueTagName) + ".json");
        result.count = jsonData.post_count;
        result.true_name = trueTagName;
        return result;
    }

}
