/* Type definitions for the Danbooru Javascript methods */

import { XM } from "./XM";

export class Danbooru {

    private static _cachedModules: any;
    private static get Modules(): any {
        if (!this._cachedModules) {
            this._cachedModules = XM.Window["Danbooru"];
            if (!this._cachedModules) this._cachedModules = {};
        }
        return this._cachedModules;
    }

    private static _cachedModuleCount: number;
    private static get hasModules(): boolean {
        if (typeof this._cachedModuleCount == "undefined")
            this._cachedModuleCount = Object.keys(this.Modules).length;
        return this._cachedModuleCount > 0;
    }

    public static Autocomplete = {
        initialize_all(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Autocomplete.initialize_all();
        }
    }

    public static Blacklist = {
        apply(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Blacklist.apply();

        },

        initialize_anonymous_blacklist(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Blacklist.initialize_anonymous_blacklist();

        },

        initialize_all(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Blacklist.initialize_all();

        },

        initialize_disable_all_blacklists(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Blacklist.initialize_disable_all_blacklists();

        },

        stub_vanilla_functions(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Blacklist.apply = (): void => { return; };
            Danbooru.Modules.Blacklist.initialize_disable_all_blacklists = (): void => { return; };
            Danbooru.Modules.Blacklist.initialize_all = (): void => { return; };
        },

        postShow(post: JQuery<HTMLElement>) {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Blacklist.postShow(post);
        },

        postHide(post: JQuery<HTMLElement>) {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Blacklist.postHide(post);
        },
    }

    public static DText = {
        initialize_formatting_buttons(element: HTMLElement): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.DText.initialize_formatting_buttons(element);
        },
        override_formatting(fn: (content: string, input: JQuery<HTMLInputElement>) => void): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.DText.process_formatting = fn;
        },
    };

    public static Post = {
        vote(post_id: number, scoreDifference: number, preventUnvote?: boolean): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.vote(post_id, scoreDifference, preventUnvote);
        },
        initialize_all(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.initialize_all();
        },
        update(post_id: number, params: any): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.update(post_id, params);
        },
        delete_with_reason(post_id: number, reason: string, reload_after_delete: boolean): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.delete_with_reason(post_id, reason, reload_after_delete);
        },
        undelete(post_id: number): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.undelete(post_id);
        },
        approve(post_id: number, should_reload = false): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.approve(post_id, should_reload);
        },
        disapprove(post_id: number, reason: string, should_reload = false): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.disapprove(post_id, reason, should_reload);
        },
        unapprove(post_id: number): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.unapprove(post_id);
        },
        resize_cycle_mode(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.resize_cycle_mode();
        },
        resize_to(size: string): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.resize_to(size);
        },
        resize_to_internal(size: string): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.resize_to_internal(size);
        },
        resize_notes(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Post.resize_notes();
        }
    };

    public static PostModeMenu = {
        change(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.PostModeMenu.change();
        },
        click(e: Event | any): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.PostModeMenu.click(e);
        },
        change_tag_script(script: number): void {
            if (!Danbooru.hasModules) return;
            const event = new CustomEvent("re621.dummy-event");
            event["key"] = script;
            Danbooru.Modules.PostModeMenu.change_tag_script(event);
        },
    };

    public static Note = {
        Box: {
            scale_all(): void {
                if (!Danbooru.hasModules) return;
                Danbooru.Modules.Note.Box.scale_all();

            }
        },

        TranslationMode: {
            active(state?: boolean): Promise<boolean> {
                if (!Danbooru.hasModules) return;
                if (state !== undefined) Danbooru.Modules.Note.TranslationMode.active = state;
                return Promise.resolve(Danbooru.Modules.Note.TranslationMode.active);

            },

            toggle(): void {
                if (!Danbooru.hasModules) return;
                Danbooru.Modules.Note.TranslationMode.toggle(new CustomEvent("re621.dummy-event"));

            },
        }
    };

    public static Thumbnails = {

        initialize(): void {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Thumbnails.initialize();
        }

    }

    public static Shortcuts = {

        set disabled(value: boolean) {
            if (!Danbooru.hasModules) return;
            Danbooru.Modules.Shortcuts.disabled = value;
        }

    }

    public static E621 = {

        addDeferredPosts(posts: []): void {
            XM.Window["___deferred_posts"] = XM.Window["___deferred_posts"] || {}
            XM.Window["___deferred_posts"] = $.extend(XM.Window["___deferred_posts"], posts);
        }

    }

    public static notice(input: string, permanent?: boolean): void {
        Danbooru.Modules.notice(input, permanent);
    }

    public static error(input: string): void {
        Danbooru.Modules.error(input);
    }
}

export type DTextButton = {
    icon: string;
    title: string;
    content: string;
}
