export enum TagTypes {
    Artist = "artist",
    Character = "character",
    Copyright = "copyright",
    Species = "species",
    General = "general",
    Meta = "meta",
    Lore = "lore"
}

export class Tag {

    private static nonArtistTags = ["unknown_artist", "unknown_artist_signature",
        "unknown_colorist", "anonymous_artist", "avoid_posting",
        "conditional_dnp", "sound_warning", "epilepsy_warning"];

    /**
     * This function just checks if the string is contained in nonArtistTags
     * A non-artist would be avoid_posting for example
     * Does NOT take into consideration the tag type
     * In this functions eyes a general tag will also be an artist tag
     */
    public static isArtist(tag: string): boolean {
        return Tag.nonArtistTags.indexOf(tag) === -1;
    }

    /**
     * Converts a single search input (i.e test_input or *_fur) into a regex that can be used on a string of tags
     * First it escapes all characters from the input which have special meaning in a regex, like + or ?, except for *
     * '*' has a special meaning when searching and acts as a wildcard character
     * To put this into the regex it gets replaced with [\S]* which matches zero or more non-whitespace characters
     * This ways if you have a space separated string of tags this function will tell you wether or not the filter matches
     * @param string 
     */
    public static escapeSearchToRegex(string: string): RegExp {
        return new RegExp(string.replace(/[-\/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, "[\\S]\*\?"));
    }
}
