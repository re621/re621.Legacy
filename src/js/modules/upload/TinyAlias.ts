import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { ApiTag } from "../../components/api/responses/ApiTag";
import { Modal } from "../../components/structure/Modal";

declare var Danbooru;

export class TinyAlias extends RE6Module {

    private static instance: TinyAlias;

    private $textarea: JQuery<HTMLElement>;
    private $container: JQuery<HTMLElement>;

    private $infoText: JQuery<HTMLElement>;

    private tagAlreadyChecked: boolean;
    private aliasData;

    private constructor() {
        super(PageDefintion.upload);
    }

    /**
     * Returns a singleton instance of the SettingsController
     * @returns ThemeCustomizer instance
     */
    public static getInstance() {
        if (this.instance === undefined) {
            this.instance = new TinyAlias();
            this.instance.create();
        }
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            enabled: true,
            data: {}
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();

        this.buildDOM();
    }

    public destroy() {
        if (!this.isInitialized()) return;
        super.destroy();
        this.$container.find("input").unbind();
        this.$container.find("div.tiny-alias-container").remove();
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
        $sortButton.click(() => {
            const currentText = this.prepareInput(this.$textarea.val());
            let tags = currentText.split(" ");
            tags = [...new Set(tags)];
            tags.sort();
            this.$textarea.val(tags.join(" "));
        });

        // Settings Page
        let $aliasList = $("<div>").addClass("alias-list");

        $("<div>").html("<h3>New Alias</h3>").appendTo($aliasList);
        let $newAliasForm = this.buildAliasForm($aliasList, "", "", "alias-form-new");
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
            let $name = $newAliasForm.find("input[type='text']");
            let $data = $newAliasForm.find("textarea");

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

        this.aliasData = this.fetchSettings("data");
        if (this.aliasData[tag]) {
            this.tagAlreadyChecked = true;
            this.$infoText.html("Found alias: " + tag);
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
        };

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

    private makeAliasEntry($aliasList: JQuery<HTMLElement>, name: string, data: string, id: string) {
        let $aliasForm = this.buildAliasForm($aliasList, name, data, "alias-form-" + id);
        $aliasForm.appendTo($aliasList);
        $aliasForm.submit((event) => {
            event.preventDefault();
            let $name = $aliasForm.find("input[type='text']");
            let $data = $aliasForm.find("textarea");

            console.log("pushing " + $name.val() + " with " + $data.val());
            console.log(this.aliasData[$name.val() + ""]);

            console.log("updating");

            this.aliasData[$name.val() + ""] = $data.val() + "";
            this.pushSettings("data", this.aliasData);
        });
        $aliasForm.find("button[type='button']").click((event) => {
            event.preventDefault();
            let $name = $aliasForm.find("input[type='text']");
            this.aliasData[$name.val() + ""] = undefined;
            this.pushSettings("data", this.aliasData);
            $aliasForm.remove();
        });
    }

    private buildAliasForm($aliasList: JQuery<HTMLElement>, name: string, data: string, id: string) {
        let $aliasForm = $("<form>")
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
