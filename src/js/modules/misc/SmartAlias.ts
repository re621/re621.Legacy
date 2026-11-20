import { E621 } from "../../components/api/E621";
import { APITag, TagCategory } from "../../components/api/responses/APITag";
import { APITagAlias } from "../../components/api/responses/APITagAlias";
import { APITagPreview } from "../../components/api/responses/APITagPreview";
import AvoidPosting from "../../components/cache/AvoidPosting";
import RelationsCache from "../../components/cache/RelationsCache";
import { TagCache } from "../../components/cache/TagCache";
import { Page, PageDefinition } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Icons } from "../../components/utility/Icons";
import { TagValidator } from "../../components/utility/TagValidator";
import { Util } from "../../components/utility/Util";

export class SmartAlias extends RE6Module {

  // Maximum recursion depth for aliases that contain other aliases
  private static ITERATIONS_LIMIT = 10;

  // Elements to which smart alias instances are to be attached
  private static inputSelector = new Set([
    "#post_tag_string",     // editing form tags
    "#re621_qedit_tags",    // re621's version

    // Upload page inputs
    "#post_artist",
    "#post_character",
    "#post_species",
    "#post_themes",
    "#post_content",
    "#post_tags",
  ]);

  private inputElements: JQuery<HTMLElement>[] = [];

  private previewHandlers: Array<{ $textarea: JQuery<HTMLElement>; $container: JQuery<HTMLElement>; mode: boolean }> = [];

  private postFormObserver: MutationObserver | null = null;

  private searchTypingTimeout: number | null = null;

  private static aliasCache: AliasDefinition[];

  private static aliasCacheLength: number;

  private static tagData: TagData = {};           // stores tag data for the session - count, valid, dnp, etc

  private static tagAliases: TagAlias = {};       // stores e621's alias pairs to avoid repeated lookups

  public constructor () {
    super([PageDefinition.upload, PageDefinition.post, PageDefinition.search, PageDefinition.favorites], true);
  }

  protected getDefaultSettings (): Settings {
    return {
      enabled: true,

      autoLoad: true,
      tagOrder: TagOrder.Default,

      quickTagsForm: true,
      editTagsForm: true,
      searchForm: true,

      uploadCharactersForm: true,
      uploadSexesForm: true,
      uploadBodyTypesForm: true,
      uploadThemesForm: true,
      uploadTagsForm: true,

      replaceAliasedTags: true,
      resolveImplications: true,

      replaceLastTag: false,
      fixCommonTypos: false,
      asciiWarning: true,
      minPostsWarning: 20,
      compactOutput: false,

      minCachedTags: 1000,

      data: "",
    };
  }

  /**
   * Destroys and re-creates the entire module as a method of reloading it.
   * It's stupid, but it's the easiest and hassle-free method of resetting some things.
   */
  public async reload (): Promise<void> {
    this.destroy();
    if (!this.fetchSettings("enabled")) return;
    return new Promise((resolve) => {
      setTimeout(() => {
        this.create();
        resolve();
      }, 100);
    });
  }

  public destroy (): void {
    if (!this.isInitialized()) return;
    super.destroy();

    if (this.postFormObserver) {
      this.postFormObserver.disconnect();
      this.postFormObserver = null;
    }

    if (this.searchTypingTimeout !== null) {
      clearTimeout(this.searchTypingTimeout);
      this.searchTypingTimeout = null;
    }

    for (const inputElement of $("#post_tags, #post_tag_string").get()) {
      $(inputElement)
        .off("focus.re621.smart-alias")
        .off("focusout.re621.smart-alias");
    }
    $("smart-alias").remove();
    $("smart-tag-counter").remove();
    $("button.smart-alias-validate").remove();
    $(document)
      .off("input.re621.smart-alias", "#tags")
      .off("click.smartalias", "article.post-preview")
      .off("click.smartalias", "#post-edit-link, #side-edit-link");

    this.previewHandlers = [];

    for (const element of this.inputElements)
      element
        .off("input.smartalias re621:input.smartalias blur.smartalias blur.smartalias.spacefix")
        .removeData("re621:smartalias");
    this.inputElements = [];

    $(document)
      .off("re621:input.smartalias", "#post_tag_string, #re621_qedit_tags")
      .off("input.smartalias", "#post_tag_string, #re621_qedit_tags");
  }

  public create (): void {
    super.create();

    if (this.fetchSettings("searchForm") && Page.matches([PageDefinition.search, PageDefinition.post, PageDefinition.favorites])) {
      this.handleSearchForm();
    }

    // Abort the whole thing if the quick tags form is disabled in settings
    if (!this.fetchSettings("quickTagsForm") && Page.matches([PageDefinition.search, PageDefinition.favorites]))
      return;

    // Abort execution on the post page if it's disabled anyways
    if (!this.fetchSettings("editTagsForm") && Page.matches(PageDefinition.post))
      return;

    // Toggle the data-attribute necessary for the compact form
    this.setCompactOutput(this.fetchSettings("compactOutput"));

    // Establish the data caches
    if (typeof SmartAlias.aliasCache == "undefined") {
      const cacheData = this.fetchSettings<string>("data");
      SmartAlias.aliasCache = SmartAlias.getAliasData(cacheData);
      SmartAlias.aliasCacheLength = cacheData.length;
    }

    // Detect enabled inputs
    const inputs = new Set(Array.from(SmartAlias.inputSelector));
    const enabledInputs = this.fetchSettings(["uploadCharactersForm", "uploadSexesForm", "uploadBodyTypesForm", "uploadThemesForm", "uploadTagsForm"]);
    if (!enabledInputs.uploadCharactersForm) inputs.delete("#post_characters");
    if (!enabledInputs.uploadSexesForm) inputs.delete("#post_sexes");
    if (!enabledInputs.uploadBodyTypesForm) inputs.delete("#post_bodyTypes");
    if (!enabledInputs.uploadThemesForm) inputs.delete("#post_themes");
    if (!enabledInputs.uploadTagsForm) inputs.delete("#post_tags");

    this.inputElements = [];
    this.previewHandlers = [];
    const mode = this.fetchSettings<boolean>("autoLoad");
    const isPostPage = Page.matches(PageDefinition.post);

    for (const inputElement of $([...inputs].join(", ")).get()) {
      const $el = $(inputElement);
      // Defer hidden #post_tag_string on post pages until the edit UI opens
      if (isPostPage && $el.is("#post_tag_string") && !$el.is(":visible")) {
        continue;
      }
      this.initializeInput($el, mode);
    }

    if (isPostPage && inputs.has("#post_tag_string")) {
      this.deferPostEditInput(mode);
    }

    // Edit textareas can be created dynamically by e621 or BetterSearch.
    const onDynamicInput = (event: JQuery.TriggeredEvent): void => {
      const $target = $(event.currentTarget);
      const alreadyInitialized = Boolean($target.data("re621:smartalias"));
      this.initializeInput($target, mode);
      if (!alreadyInitialized) {
        $target.trigger(event.type);
      }
    };

    $(document).on("re621:input.smartalias", "#post_tag_string, #re621_qedit_tags", onDynamicInput);
    $(document).on("input.smartalias", "#post_tag_string, #re621_qedit_tags", onDynamicInput);
  }

  private deferPostEditInput (mode: boolean): void {
    const tryInit = (): boolean => {
      const $postTags = $("#post_tag_string").first();
      if ($postTags.length && ($postTags.is(":visible") || $postTags.closest("#edit_post, .edit_post, form[action*='/posts/']").is(":visible"))) {
        this.initializeInput($postTags, mode);
        return true;
      }
      return false;
    };

    if (tryInit()) return;

    $(document).on("click.smartalias", "#post-edit-link, #side-edit-link", () => {
      window.setTimeout(() => {
        if (tryInit() && this.postFormObserver) {
          this.postFormObserver.disconnect();
          this.postFormObserver = null;
        }
      }, 0);
    });

    if (typeof MutationObserver !== "undefined" && document.body) {
      this.postFormObserver = new MutationObserver(() => {
        if (tryInit() && this.postFormObserver) {
          this.postFormObserver.disconnect();
          this.postFormObserver = null;
        }
      });
      this.postFormObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "hidden"],
      });
    }
  }

  private initializeInput ($textarea: JQuery<HTMLElement>, mode: boolean): void {
    if ($textarea.data("re621:smartalias")) return;
    $textarea.data("re621:smartalias", true);

    this.inputElements.push($textarea);
    const $container = $("<smart-alias>")
      .attr("ready", "true")
      .addClass("disabled")
      .insertAfter($textarea);
    const $counter = $("<smart-tag-counter>")
      .text(SmartAlias.countTagInput($textarea) + "")
      .insertAfter($textarea);

    if (mode) this.manageAutoLoad($textarea, $container);
    else this.manageManualLoad($textarea, $container);

    if (Page.matches([PageDefinition.search, PageDefinition.favorites])) {
      this.previewHandlers.push({ $textarea, $container, mode });
      if (this.previewHandlers.length === 1) {
        $(document).on("click.smartalias", "article.post-preview", () => {
          for (const entry of this.previewHandlers) {
            if (entry.mode) this.handleTagInput(entry.$textarea, entry.$container, false);
            else entry.$container.html("");
          }
        });
      }
    }

    let updateTimeout: number;
    $textarea.on("input.smartalias re621:input.smartalias", () => {
      if (updateTimeout) return;
      updateTimeout = window.setTimeout(() => { updateTimeout = 0; }, 500);
      $counter.html(SmartAlias.countTagInput($textarea) + "");
    });
  }

  /**
   * Parses the textarea input specified in the parameter and returns a list of space-separated tags
   * @param input Textarea to parse
   */
  private static getInputString (input: JQuery<HTMLElement>): string {
    return (input.val() ?? "").toString().trim()
      .toLowerCase()
      .replace(/\r?\n|\r/g, " ")      // strip newlines
      .replace(/(?:\s){2,}/g, " ");    // strip multiple spaces
  }

  /**
   * Parses the string input specified in the parameter and returns an array of tags
   * @param input Space-separated sting of tags
   */
  private static parseTagString (input: string): ParsedTag[] {
    const result = [];
    for (const tag of input.split(/ |\n|\r/).filter(el => el != null && el != ""))
      result.push(ParsedTag.fromString(tag));
    return result;
  }

  /**
   * Parses the textarea input specified in the parameter and returns an array of tags
   * @param input Textarea to parse
   */
  private static parseTagInput (input: JQuery<HTMLElement>): ParsedTag[] {
    return this.parseTagString(SmartAlias.getInputString(input));
  }

  private static countTagInput (input: JQuery<HTMLElement>): number {
    return SmartAlias.getInputString(input).split(/ |\n|\r/).length;
  }

  private manageAutoLoad ($textarea: JQuery<HTMLElement>, $container: JQuery<HTMLElement>): void {

    // Wait for the user to stop typing before processing
    let typingTimeout: number;
    $textarea
      .on("input.smartalias blur.smartalias", () => {

        // handleTagInput triggers an input event to properly fill in the data bindings
        // this ensures that it will not result in an infinite loop
        if ($textarea.data("vue-event") === "true") {
          $textarea.data("vue-event", "false");
          return;
        }

        // If the data is currently processing, but the user keeps typing,
        // check every second to make sure the last input is caught
        window.clearInterval(typingTimeout);
        typingTimeout = window.setInterval(() => {
          if ($container.attr("ready") !== "true") return;

          window.clearInterval(typingTimeout);
          this.handleTagInput($textarea, $container);
        }, 1000);
      })
      .on("blur.smartalias.spacefix", () => {
        $textarea.val((index, value) => {
          return (value.endsWith(" ") || value.length == 0) ? value : (value + " ");
        });
      });

    // Skip the waiting and go straight to parsing
    $textarea.on("re621:input.smartalias", () => {
      this.handleTagInput($textarea, $container);
    });

    // First call, in case the input area is not blank
    // i.e. on post page, or in editing mode
    this.handleTagInput($textarea, $container, false);
  }

  private manageManualLoad ($textarea: JQuery<HTMLElement>, $container: JQuery<HTMLElement>): void {

    $("<button>")
      .html("Validate")
      .addClass("smart-alias-validate")
      .insertBefore($container)
      .on("click", (event) => {
        event.preventDefault();
        this.handleTagInput($textarea, $container, false);
      });

  }

  /**
   * Process the tag string in the textarea, and display appropriate data in the container
   * @param $textarea Textarea to process
   * @param $container Display container
   * @param scrollToBottom If true, the container's viewport will scroll to the very bottom once processed
   */
  private async handleTagInput ($textarea: JQuery<HTMLElement>, $container: JQuery<HTMLElement>, scrollToBottom = true): Promise<void> {
    if ($container.attr("ready") !== "true") return;
    $container.attr("ready", "false");

    // Fix typos
    // TODO Replace this with better error handling
    if (this.fetchSettings<boolean>("fixCommonTypos")) {
      $textarea.val((index, currentValue) => {
        return (currentValue.toLowerCase());
      });
    }

    // Pass on the original tags, if necessary
    const originalTags = $textarea.data("originalTags");
    if (originalTags) {
      $container.attr("has-original", "true");
      $container.data("originalTags", originalTags);
    } else $container.removeAttr("has-original");

    // Get the tags from the textarea
    const inputString = SmartAlias.getInputString($textarea);
    const tags: ParsedTag[] = SmartAlias.parseTagString(inputString);
    const impliedTags: Set<string> = new Set();

    // Skip the rest if the textarea is empty
    if (tags.length == 0) {
      $container.html("");
      $container.attr("ready", "true");
      return;
    }

    // Step 1
    // Replace custom aliases with their contents
    // This is probably overcomplicated to all hell
    await this.loadAliasCache();

    if (SmartAlias.aliasCache.length > 0) {
      $textarea.val((index, text) => {
        return this.replaceInputAliases(text);
      });

      // Regenerate the tags to account for replacements
      triggerUpdateEvent($textarea);
    }

    $container.attr("ready", "true");

    /**
     * Fix for Vue data-attribute binding
     * This needs to be executed every time the textarea value gets changed
     * @param $textarea Textarea input
     */
    function triggerUpdateEvent ($textarea: JQuery<HTMLElement>): void {
      Util.Events.triggerVueEvent($textarea, "input", "vue-event");
    }
  }

  /** Loads the alias cache from the settings */
  private async loadAliasCache (): Promise<void> {
    const aliasCacheRaw = await this.fetchSettings<string>("data", true);
    if (aliasCacheRaw.length !== SmartAlias.aliasCacheLength) {
      SmartAlias.aliasCache = SmartAlias.getAliasData(aliasCacheRaw);
      SmartAlias.aliasCacheLength = aliasCacheRaw.length;
    }
  }

  /**
   * Processes the raw text value of the custom alias field and converts it into machine-readable format.
   * TODO Optimize this as much as possible
   * @param rawData Raw plaintext data
   */
  public static getAliasData (rawData: string): AliasDefinition[] {
    const data = rawData.split("\n").reverse();
    const result: AliasDefinition[] = [];

    const aliasList = new Set<string>();

    for (const line of data) {
      const parts = line
        .split("#")[0]
        .trim()
        .split("->");

      if (parts.length !== 2) continue;

      const def: AliasDefinition = {
        lookup: new Set(),
        output: formatOutput(parts[1]),
      };

      // This should prevent multiple aliases from being called by the same lookup
      // Only the last one in the file would be counted.
      // If an alias has no lookups, it is discarded
      for (const part of formatLookup(parts[0])) {
        if (aliasList.has(part)) continue;
        aliasList.add(part);
        def.lookup.add(part);
      }

      if (def.lookup.size == 0) continue;

      result.push(def);
    }

    return result;

    function formatLookup (input: string): Set<string> {
      return new Set(
        input
          .split(" ")
          .filter((e) => e != ""),
      );
    }

    function formatOutput (input: string): string {
      return input
        .trim()
        .replace(/\s{2,}/g, " ");
    }
  }

  /**
   * Dynamically creates a regex that should find individual in the textarea
   * @param input Input, as a single string, an array, or a set
   */
  private getTagRegex (input: string | string[] | Set<string>): RegExp {
    if (typeof input == "string") input = [input];
    else input = [...input];

    for (let i = 0; i < input.length; i++)
      input[i] = input[i]
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, "(\\S*)");
    return new RegExp("((?:^|\n| )-?(?:(?:artist|contributor|character|copyright|species):)?)(" + input.join("|") + ")( |\n|$)", "gi");
  }

  /**
   * Replaces the custom aliases with their consequent values.
   * Note that an alias cache must be built beforehand via `loadAliasCache()`
   * @param text Text to parse
   */
  private replaceInputAliases (text: string): string {

    // Run the the process as many times as needed until no more changes can be made
    // This should take care of nested aliases while preventing infinite recursion
    let changes = 0,
      iterations = 0;
    do {
      changes = 0;
      for (const aliasDef of SmartAlias.aliasCache) {

        text = text.replace(
          this.getTagRegex(aliasDef.lookup),
          (...args) => {  // match, prefix, body, suffix1, suffix2, etc
            changes++;

            // Replace the wildcards in the output with values
            // Starts at fourth position to skip match, prefix, and alias body
            // Ends 2 positions before the end to skip number of hits and full string
            let output = aliasDef.output;
            for (let i = 3; i < args.length - 3; i++)
              output = output.replace(new RegExp("\\$" + (i - 2), "gi"), args[i]);

            // Prevent duplicate tags from being added by aliases
            const result = new Set<string>();
            for (const part of output.split(" ")) {
              if (this.getTagRegex(part).test(text)) continue;
              result.add(part);
            }

            if (result.size == 0) return " ";
            return args[1] + [...result].join(" ") + args[args.length - 3];
          },
        );

      }
      iterations++;
    } while (changes != 0 && iterations < SmartAlias.ITERATIONS_LIMIT);

    return text;
  }

  /** Handles alias replacement in the search form */
  private handleSearchForm (): void {
    $(document).on("input.re621.smart-alias", "#tags", () => {
      if (this.searchTypingTimeout !== null) {
        clearTimeout(this.searchTypingTimeout);
      }
      this.searchTypingTimeout = window.setTimeout(async () => {
        this.searchTypingTimeout = null;
        await this.loadAliasCache();
        const input = $("#tags");
        if (input.length == 0) return;
        input.val((index, text) => {
          return this.replaceInputAliases(text);
        });
      }, 500);
    });
  }

  /**
   * Toggles the compact form styles
   * @param state True for compact, false for expanded
   */
  public setCompactOutput (state = false): void {
    $("#page").attr("data-smartalias-compact", state + "");
  }

}

interface AliasDefinition {
  lookup: Set<string>;
  output: string;
}

interface TagData {
  [name: string]: Tag;
}

interface Tag {
  count: number;
  category: TagCategory;

  invalid: boolean;
  ambiguous: boolean;
  dnp: boolean;
  errors: string[];

  cached: boolean;
}

interface TagAlias {
  [name: string]: string;
}

enum TagOrder {
  Default = "default",
  Alphabetical = "alphabetical",
  Grouped = "grouped",
}

namespace TagOrder {

  export function fromString (input: string): TagOrder {
    for (const value of Object.values(TagOrder))
      if (value == input) return value;
    return TagOrder.Default;
  }

}

export type ParsedTag = {
  name: string;
  negated: boolean;
  prefix: string;
  malformed?: boolean;
};

namespace ParsedTag {
  export function fromString (rawTag: string): ParsedTag {
    const result: ParsedTag = {
      name: null,
      negated: false,
      prefix: null,
    };

    if (rawTag.startsWith("-")) {
      result.negated = true;
      rawTag = rawTag.substr(1);
    }

    const match = rawTag.match(/(artist|contributor|character|copyright|species):/);
    if (match) {
      result.prefix = match[1];
      rawTag = rawTag.substr(match[0].length);
    }

    result.name = rawTag;

    if (result.name.length == 0)
      result.malformed = true;

    return result;
  }

  export function toString (tag: ParsedTag, skipNegation = false): string {
    return ((tag.negated && !skipNegation) ? "-" : "")
            + (tag.prefix ? (tag.prefix + ":") : "")
            + tag.name;
  }
}
