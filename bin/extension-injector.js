/**
 * ===== Injected Functions =====
 * Functions that cannot be called from the content script.  
 * Must be called from XM.Chrome.execInjectorRequest()
 */

/** Function index */
const fn_Danbooru = {
    "Blacklist": {
        "apply": () => { Danbooru.Blacklist.apply(); },
        "initialize_anonymous_blacklist": () => { Danbooru.Blacklist.initialize_anonymous_blacklist(); },
        "initialize_all": () => { Danbooru.Blacklist.initialize_all(); },
        "initialize_disable_all_blacklists": () => { Danbooru.Blacklist.initialize_disable_all_blacklists(); },
        "stub_vanilla_functions": () => {
            Danbooru.Blacklist.apply = () => { return; };
            Danbooru.Blacklist.initialize_disable_all_blacklists = () => { return; };
            Danbooru.Blacklist.initialize_all = () => { return; };
        },
    },
    "Post": {
        "vote": (postid, scoreDifference, preventUnvote) => { Danbooru.Post.vote(postid, scoreDifference, preventUnvote); },
    },
    "Note.Box": {
        "scale_all": () => { Danbooru.Note.Box.scale_all(); },
    },
    "Note.TranslationMode": {
        "active": (state) => {
            if (state !== undefined) Danbooru.Note.TranslationMode.active = state;
            return Danbooru.Note.TranslationMode.active;
        },
        "toggle": () => { Danbooru.Note.TranslationMode.toggle(new CustomEvent("re621.dummy-event")); },
    },
    "Utility": {
        "disableShortcuts": (state) => {
            if (state !== undefined) Danbooru.Utility.disableShortcuts = state;
            return Danbooru.Utility.disableShortcuts;
        },
    },
    "Notice": {
        "notice": (input) => { Danbooru.notice(input); },
        "error": (input) => { Danbooru.error(input); },
    },
};

const fn = { "Danbooru": fn_Danbooru }

async function handleMessage(data) {
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

document.addEventListener("re621.chrome.message", handleMessage);
