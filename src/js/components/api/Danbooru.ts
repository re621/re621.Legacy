/* Type definitions for the Danbooru Javascript methods */

import { TM } from "./TM";

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
        return TM.getWindow()["Danbooru"][name];
    }

    public static init(): void {
        this.Blacklist = this.getValue("Blacklist");
        this.Post = this.getValue("Post");
        this.Note = this.getValue("Note");
        this.Utility = this.getValue("Utility");
    }
}

interface DanbooruBlacklist {
    apply(): void;
    initialize_anonymous_blacklist(): void;
    initialize_all(): void;
    initialize_disable_all_blacklists(): void;
}

interface DanbooruPost {
    vote(postid: number, scoreDifference: number, preventUnvote?: boolean): void;
}

interface DanbooruNote {
    Box: DanbooruNoteBox;
    TranslationMode: DanbooruNoteMode;
}

interface DanbooruNoteBox {
    scale_all(): void;
}

interface DanbooruNoteMode {
    active: boolean;
    toggle(e: Event): void;
}

interface DanbooruUtility {
    disableShortcuts: boolean;
}
