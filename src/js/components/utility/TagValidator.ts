
const generateMetatagRegex = (metatags: string[]) => new RegExp(`^(${metatags.join("|")}):(.+)$`, "i");

export class TagValidator {

  private static metatags = ["user", "approver", "commenter", "comm", "noter", "noteupdater", "artcomm?", "pool", "ordpool", "fav", "favoritedby", "md5", "rating", "note", "locked", "width", "height", "mpixels", "ratio", "score", "favcount", "filesize", "source", "id", "date", "age", "order", "limit", "status", "tagcount", "parent", "child", "pixiv_id", "pixiv", "search", "upvote", "downvote", "voted", "filetype", "flagger", "type", "appealer", "disapproval", "set", "randseed", "description", "change", "user_id", "delreason", "deletedby", "votedup", "voteddown", "duration"];

  private static metatagsRegex = generateMetatagRegex(TagValidator.metatags);

  // These are metatags that may not occur multiple times in a query.
  private static soloMetatags = ["order", "limit", "randseed"];

  private static soloMetatagsRegex = generateMetatagRegex(TagValidator.soloMetatags);

  private static categories = ["general", "species", "character", "copyright", "artist", "contributor", "invalid", "lore", "meta"];

  private static categoriesRegex = new RegExp(`^(${TagValidator.categories.join("|")}):(.+)$`, "i");

  private static groupBoundariesRegex = /^([~-]?\(|\))$/;

  private static validation = [
    { regex: /\*/, text: "Tags cannot contain asterisks ('*')" },
    { regex: /,/, text: "Tags cannot contain commas (',')" },
    { regex: /#/, text: "Tags cannot contain octothorpes ('#')" },
    { regex: /\$/, text: "Tags cannot contain peso signs ('$')" },
    { regex: /%/, text: "Tags cannot contain percent signs ('%')" },
    { regex: /\\/, text: "Tags cannot contain back slashes ('\\')" },
    { regex: /[_\-~]{2}/, text: "Tags cannot contain consecutive underscores, hyphens or tildes" },
    { regex: /[\x00-\x1F]/, text: "Tags cannot contain non-printable characters" },
    { regex: /^([-~+:_`(){}\[\]\/])/, text: "Tags cannot begin with %MATCHNAME% ('%MATCH%')" },
    { regex: /([_])$/, text: "Tags cannot end with %MATCHNAME% ('%MATCH%')" },
    { regex: /&/, text: "Tags containing ampersands ('&') should be avoided" },
    { regex: TagValidator.metatagsRegex, text: "Tags cannot begin with '%MATCH%:'" },
    { regex: TagValidator.categoriesRegex, text: "Tags cannot begin with '%MATCH%:'" },
  ];

  private static charnames = {
    "-": "a dash",
    "~": "a tilde",
    "+": "a plus sign",
    ":": "a colon",
    "_": "an underscore",
    "`": "a backtick",
    "(": "a bracket",
    ")": "a bracket",
    "{": "a brace",
    "}": "a brace",
    "[": "a square bracket",
    "]": "a square bracket",
    "/": "a slash",
  };

  /**
   * Returns true if the tag is valid, false otherwise
   * @param tag Tag to validate
   */
  public static run (tag: string): boolean {
    return TagValidator.runVerbose(tag).length == 0;
  }

  /**
   * Checks the tags for validity, and returns a list of errors
   * @param tag Tag to validate
   */
  public static runVerbose (tag: string): string[] {

    const errors = [];

    if (tag.length == 0) return;

    if ([...tag].some(char => char.charCodeAt(0) > 127))
      errors.push("Tags can only contain ASCII characters");

    if (/[ \n\r\t]+/.test(tag))
      errors.push("Tags cannot contain spaces, tabs, or newlines");

    for (const check of TagValidator.validation) {
      const match = tag.match(check.regex);
      if (!match) continue;
      errors.push(check.text.replace("%MATCHNAME%", TagValidator.charnames[match[1]]).replace("%MATCH%", match[1]));
    }

    return errors;
  }

  public static isGroupBoundary (tag: string): boolean {
    return TagValidator.groupBoundariesRegex.test(tag);
  }

  public static isNegated (tag: string): boolean {
    return tag.startsWith("-");
  }

  public static isEithered (tag: string): boolean {
    return tag.startsWith("~");
  }

  public static isSoloMetatag (tag: string): boolean {
    return TagValidator.metatagsRegex.test(tag);
  }
}
