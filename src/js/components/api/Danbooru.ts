/* Type definitions for the Danbooru Javascript methods */

declare const unsafeWindow;

export class Danbooru {

    public static Blacklist: DanbooruBlacklist;
    public static Post: DanbooruPost;
    public static Note: DanbooruNote;
    public static Utility: DanbooruUtility;

    public static notice(input: string): void {
        return this.getValue("notice")(input);
    }
    public static error(input: string): void {
        return this.getValue("error")(input);
    };

    private static getValue(name: string): any {
        return unsafeWindow.Danbooru[name];
    }

    public static _init(): void {
        this.Blacklist = this.getValue("Blacklist");
        this.Post = this.getValue("Post");
        this.Note = this.getValue("Note");
        this.Utility = this.getValue("Utility");
    }
}

Danbooru._init() ;

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