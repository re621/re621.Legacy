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
     * A nonartist would be avoid_posting for example
     * Does NOT take into consideration the tag type
     * In this functions eyes a general tag will also be an artist tag
     */
    public static isArist(tag: string) {
        return Tag.nonArtistTags.indexOf(tag) === -1;
    }
}
