/* Type definitions for the Danbooru Javascript methods */

import { XM } from "./XM";

export class Danbooru {

    private static modules = XM.getWindow()["Danbooru"];

    public static Blacklist: DanbooruBlacklist = {
        apply(): void {
            if (Danbooru.modules === undefined) {
                // TODO injector function
            } else Danbooru.modules["Blacklist"].apply();
        },

        initialize_anonymous_blacklist(): void {
            if (Danbooru.modules === undefined) {
                // TODO injector function
            } else Danbooru.modules["Blacklist"].initialize_anonymous_blacklist();
        },

        initialize_all(): void {
            if (Danbooru.modules === undefined) {
                // TODO injector function
            } else Danbooru.modules["Blacklist"].initialize_all();
        },

        initialize_disable_all_blacklists(): void {
            if (Danbooru.modules === undefined) {
                // TODO injector function
            } else Danbooru.modules["Blacklist"].initialize_disable_all_blacklists();
        },

        stub_vanilla_functions(): void {
            if (Danbooru.modules === undefined) {
                // TODO injector function
            } else {
                Danbooru.modules["Blacklist"].apply = (): void => { return; };
                Danbooru.modules["Blacklist"].initialize_disable_all_blacklists = (): void => { return; };
                Danbooru.modules["Blacklist"].initialize_all = (): void => { return; };
            }
        },
    }

    public static Post: DanbooruPost = {
        vote(postid: number, scoreDifference: number, preventUnvote?: boolean): void {
            if (Danbooru.modules === undefined) {
                // TODO injector function
            } else Danbooru.modules["Post"].vote(postid, scoreDifference, preventUnvote);
        }
    };

    public static Note: DanbooruNote = {
        Box: {
            scale_all(): void {
                if (Danbooru.modules === undefined) {
                    // TODO injector function
                } else Danbooru.modules["Note"]["Box"].scale_all();
            }
        },

        TranslationMode: {
            isActive(): boolean {
                if (Danbooru.modules === undefined) {
                    // TODO injector function
                    return false;
                } else return Danbooru.modules["Note"]["TranslationMode"].active;
            },

            setActive(state: boolean): void {
                if (Danbooru.modules === undefined) {
                    // TODO injector function
                } else Danbooru.modules["Note"]["TranslationMode"].active = state;
            },

            toggle(e: Event): void {
                if (Danbooru.modules === undefined) {
                    // TODO injector function
                } else Danbooru.modules["Note"]["TranslationMode"].toggle(e);
            },
        }
    };

    public static Utility: DanbooruUtility = {

        disableShortcuts(state?: boolean): boolean {
            if (Danbooru.modules === undefined) {
                // TODO injector function
                return false;
            } else {
                if (state !== undefined) Danbooru.modules["Utility"].disableShortcuts = state;
                return Danbooru.modules["Utility"].disableShortcuts;
            }
        },

    };

    public static notice(input: string): void {
        if (Danbooru.modules === undefined) {
            // TODO injector function
        } else Danbooru.modules.notice(input);
    }

    public static error(input: string): void {
        if (Danbooru.modules === undefined) {
            // TODO injector function
        } else Danbooru.modules.error(input);
    }
}

interface DanbooruBlacklist {
    apply(): void;
    initialize_anonymous_blacklist(): void;
    initialize_all(): void;
    initialize_disable_all_blacklists(): void;

    stub_vanilla_functions(): void;
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
    isActive(): boolean;
    setActive(state: boolean): void;
    toggle(e: Event): void;
}

interface DanbooruUtility {
    disableShortcuts(state?: boolean): boolean;
}
