/* Type definitions for the Danbooru Javascript methods */

import { XM } from "./XM";

export class Danbooru {

    private static getModules(): any { return XM.Window["Danbooru"]; }
    private static hasModules(): boolean { return XM.Window["Danbooru"] !== undefined; }

    public static Autocomplete = {
        initialize_all(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Autocomplete"].initialize_all();
            else XM.Chrome.execInjectorRequest("Danbooru", "Autocomplete", "initialize_all");
        }
    }

    public static Blacklist = {
        apply(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Blacklist"].apply();
            else XM.Chrome.execInjectorRequest("Danbooru", "Blacklist", "apply");

        },

        initialize_anonymous_blacklist(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Blacklist"].initialize_anonymous_blacklist();
            else XM.Chrome.execInjectorRequest("Danbooru", "Blacklist", "initialize_anonymous_blacklist");

        },

        initialize_all(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Blacklist"].initialize_all();
            else XM.Chrome.execInjectorRequest("Danbooru", "Blacklist", "initialize_all");

        },

        initialize_disable_all_blacklists(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Blacklist"].initialize_disable_all_blacklists();
            else XM.Chrome.execInjectorRequest("Danbooru", "Blacklist", "initialize_disable_all_blacklists");

        },

        stub_vanilla_functions(): void {
            if (Danbooru.hasModules()) {
                Danbooru.getModules()["Blacklist"].apply = (): void => { return; };
                Danbooru.getModules()["Blacklist"].initialize_disable_all_blacklists = (): void => { return; };
                Danbooru.getModules()["Blacklist"].initialize_all = (): void => { return; };
            } else XM.Chrome.execInjectorRequest("Danbooru", "Blacklist", "stub_vanilla_functions");
        },
    }

    public static DText = {
        initialize_formatting_buttons(element: HTMLElement): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["DText"].initialize_formatting_buttons(element);
            else XM.Chrome.execInjectorRequest("Danbooru", "DText", "initializeFormattingButtons", [element]);
        },
        override_formatting(fn: (content: string, input: JQuery<HTMLInputElement>) => void): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["DText"].process_formatting = fn;
            else XM.Chrome.execInjectorRequest("Danbooru", "DText", "overrideFormatting", [fn]);
        },
    };

    public static Post = {
        vote(post_id: number, scoreDifference: number, preventUnvote?: boolean): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].vote(post_id, scoreDifference, preventUnvote);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "vote", [post_id, scoreDifference, preventUnvote]);
        },
        initialize_all(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].initialize_all();
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "update");
        },
        update(post_id: number, params: any): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].update(post_id, params);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "update", [post_id, params]);
        },
        delete_with_reason(post_id: number, reason: string, reload_after_delete: boolean): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].delete_with_reason(post_id, reason, reload_after_delete);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "delete_with_reason", [post_id, reason, reload_after_delete]);
        },
        undelete(post_id: number): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].undelete(post_id);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "undelete", [post_id]);
        },
        approve(post_id: number, should_reload = false): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].approve(post_id, should_reload);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "approve", [post_id, should_reload]);
        },
        disapprove(post_id: number, reason: string, should_reload = false): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].disapprove(post_id, reason, should_reload);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "disapprove", [post_id, reason, should_reload]);
        },
        unapprove(post_id: number): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].unapprove(post_id);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "unapprove", [post_id]);
        },
        resize_cycle_mode(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].resize_cycle_mode();
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "resize_cycle_mode");
        },
        resize_to(size: string): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].resize_to(size);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "resize_to", [size]);
        },
        resize_to_internal(size: string): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].resize_to_internal(size);
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "resize_to_internal", [size]);
        },
        resize_notes(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Post"].resize_notes();
            else XM.Chrome.execInjectorRequest("Danbooru", "Post", "resize_notes");
        }
    };

    public static PostModeMenu = {
        change(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["PostModeMenu"].change();
            else XM.Chrome.execInjectorRequest("Danbooru", "PostModeMenu", "change");
        },
        click(e: Event | any): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["PostModeMenu"].click(e);
            else XM.Chrome.execInjectorRequest("Danbooru", "PostModeMenu", "click", [e]);
        },
        change_tag_script(script: number): void {
            if (Danbooru.hasModules()) {
                const event = new CustomEvent("re621.dummy-event");
                event["key"] = script;
                Danbooru.getModules()["PostModeMenu"].change_tag_script(event);
            } else XM.Chrome.execInjectorRequest("Danbooru", "PostModeMenu", "click", [script]);
        },
    };

    public static Note = {
        Box: {
            scale_all(): void {
                if (Danbooru.hasModules()) Danbooru.getModules()["Note"]["Box"].scale_all();
                else XM.Chrome.execInjectorRequest("Danbooru", "Note.Box", "scale_all");

            }
        },

        TranslationMode: {
            active(state?: boolean): Promise<boolean> {
                if (Danbooru.hasModules()) {
                    if (state !== undefined) Danbooru.getModules()["Note"]["TranslationMode"].active = state;
                    return Promise.resolve(Danbooru.getModules()["Note"]["TranslationMode"].active);
                } else return XM.Chrome.execInjectorRequest("Danbooru", "Note.TranslationMode", "active", [state]);

            },

            toggle(): void {
                if (Danbooru.hasModules()) Danbooru.getModules()["Note"]["TranslationMode"].toggle(new CustomEvent("re621.dummy-event"));
                else XM.Chrome.execInjectorRequest("Danbooru", "Note.TranslationMode", "toggle");

            },
        }
    };

    public static Thumbnails = {

        initialize(): void {
            if (Danbooru.hasModules()) Danbooru.getModules()["Thumbnails"].initialize();
            else XM.Chrome.execInjectorRequest("Danbooru", "Thumbnails", "initialize");
        }

    }

    public static Shortcuts = {

        set disabled(value: boolean) {
            if (Danbooru.hasModules()) Danbooru.getModules()["Shortcuts"].disabled = (value == true);
            else XM.Chrome.execInjectorRequest("Danbooru", "Shortcuts", "setDisabled", [(value == true)]);
        }

    }

    public static E621 = {

        addDeferredPosts(posts: []): void {
            if (Danbooru.hasModules()) {
                XM.Window["___deferred_posts"] = XM.Window["___deferred_posts"] || {}
                XM.Window["___deferred_posts"] = $.extend(XM.Window["___deferred_posts"], posts);
            } else XM.Chrome.execInjectorRequest("Danbooru", "E621", "addDeferredPosts", [posts]);
        }

    }

    public static notice(input: string, permanent?: boolean): void {
        if (Danbooru.hasModules())
            Danbooru.getModules()["notice"](input, permanent);
        else XM.Chrome.execInjectorRequest("Danbooru", "Notice", "notice", [input, permanent]);
    }

    public static error(input: string): void {
        if (Danbooru.hasModules())
            Danbooru.getModules()["error"](input);
        else XM.Chrome.execInjectorRequest("Danbooru", "Notice", "error", [input]);
    }
}
