/**
 * ===== Injected Functions =====
 * Functions that cannot be called from the content script.  
 * Must be called from XM.Chrome.execInjectorRequest()
 */

declare const Danbooru;

/** Function index */
const fnDanbooru = {
    "Blacklist": {
        "apply": (): void => { Danbooru.Blacklist.apply(); },
        "initialize_anonymous_blacklist": (): void => { Danbooru.Blacklist.initialize_anonymous_blacklist(); },
        "initialize_all": (): void => { Danbooru.Blacklist.initialize_all(); },
        "initialize_disable_all_blacklists": (): void => { Danbooru.Blacklist.initialize_disable_all_blacklists(); },
        "stub_vanilla_functions": (): void => {
            Danbooru.Blacklist.apply = (): void => { return; };
            Danbooru.Blacklist.initialize_disable_all_blacklists = (): void => { return; };
            Danbooru.Blacklist.initialize_all = (): void => { return; };
        },
    },
    "Post": {
        "vote": (postid, scoreDifference, preventUnvote): void => { Danbooru.Post.vote(postid, scoreDifference, preventUnvote); },
    },
    "PostModeMenu": {
        "change": (): void => { Danbooru.PostModeMenu.change(); }
    },
    "Note.Box": {
        "scale_all": (): void => { Danbooru.Note.Box.scale_all(); },
    },
    "Note.TranslationMode": {
        "active": (state: boolean): boolean => {
            if (state !== undefined) Danbooru.Note.TranslationMode.active = state;
            return Danbooru.Note.TranslationMode.active;
        },
        "toggle": (): void => { Danbooru.Note.TranslationMode.toggle(new CustomEvent("re621.dummy-event")); },
    },
    "Thumbnails": {
        "initialize": (): void => { Danbooru.Thumbnails.initialize(); },
    },
    "Utility": {
        "disableShortcuts": (state): void => {
            if (state !== undefined) Danbooru.Utility.disableShortcuts = state;
            return Danbooru.Utility.disableShortcuts;
        },
    },
    "E621": {
        "addDeferredPosts": (posts): void => {
            window["___deferred_posts"] = window["___deferred_posts"] || {}
            window["___deferred_posts"] = $.extend(window["___deferred_posts"], posts);
        },
    },
    "Notice": {
        "notice": (input: string): void => { Danbooru.notice(input); },
        "error": (input: string): void => { Danbooru.error(input); },
    },
};

const fn = { "Danbooru": fnDanbooru };

async function handleInjectorMessage(data): Promise<void> {
    const request = data.detail;

    if (fn[request.component] === undefined ||
        fn[request.component][request.module] === undefined ||
        fn[request.component][request.module][request.method] === undefined) {
        document.dispatchEvent(new CustomEvent(
            "re621.chrome.message.response-" + request.eventID, {
            detail: {
                eventID: request.eventID,
                data: "RE6 Injector - Invalid Request",
            }
        }
        ));
        return;
    }

    document.dispatchEvent(new CustomEvent(
        "re621.chrome.message.response-" + request.eventID, {
        detail: {
            eventID: request.eventID,
            data: await fn[request.component][request.module][request.method](...request.args),
        }
    }
    ));
}

document.addEventListener("re621.chrome.message", handleInjectorMessage);
