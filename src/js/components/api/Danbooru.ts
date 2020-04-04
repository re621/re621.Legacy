/* Type definitions for the Danbooru Javascript methods */

export interface Danbooru {
    notice(input: string): void;
    error(input: string): void;
    Blacklist: DanbooruBlacklist;
    Post: DanbooruPost;
    Note: DanbooruNote;
    Utility: DanbooruUtility;
}

interface DanbooruBlacklist {
    apply(): void;
    initialize_anonymous_blacklist(): void;
    initialize_all(): void;
}

interface DanbooruPost {
    vote(postid: number, scoreDifference: number): void;
}

interface DanbooruNote {
    Box: DanbooruNoteBox;
    TranslationMode: DanbooruNoteMode;
}

interface DanbooruNoteBox {
    scale_all(): void;
}

interface DanbooruNoteMode {
    toggle(e: Event): void;
}

interface DanbooruUtility {
    disableShortcuts: boolean;
}
