/**
 * ===== Injected Functions =====
 * Functions that cannot be called from the content script.
 * Must be called from XM.Chrome.execInjectorRequest()
 */

// Global object exposed by e621's own scripts
declare const E621;

/** Function index */
const fnDanbooru = {
  "Autocomplete": {
    "initialize_all": (): void => { E621.Autocomplete.initialize_all(); },
  },
  "PostResizer": {
    "resizeTo": (size: "next" | string): void => { E621.PostResizer.resizeTo(size); },
  },
  "PostCache": {
    // Elements cannot be passed to the injector, so the proxy thumbnail is looked up by its post ID
    "register": (postID: string): void => {
      E621.PostCache.register($(`article.thumbnail[data-re621-proxy][data-id="${parseInt(postID)}"]`), true);
    },
  },
  "Notice": {
    "notice": (input: string, permanent: boolean): void => { E621.Toast.notice(input, permanent); },
    "error": (input: string): void => { E621.Toast.alert(input); },
  },
};

const fn = { "Danbooru": fnDanbooru };

async function handleInjectorMessage (data): Promise<void> {
  const request = data.detail;

  if (fn[request.component] === undefined
        || fn[request.component][request.module] === undefined
        || fn[request.component][request.module][request.method] === undefined) {
    document.dispatchEvent(new CustomEvent(
      "re621.chrome.message.response-" + request.eventID, {
        detail: {
          eventID: request.eventID,
          data: "RE6 Injector - Invalid Request",
        },
      },
    ));
    return;
  }

  document.dispatchEvent(new CustomEvent(
    "re621.chrome.message.response-" + request.eventID, {
      detail: {
        eventID: request.eventID,
        data: await fn[request.component][request.module][request.method](...request.args),
      },
    },
  ));
}

document.addEventListener("re621.chrome.message", handleInjectorMessage);
