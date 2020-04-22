// Passing the window object as a workaround for unsafeWindow
const event = new CustomEvent(
    "re621.util.inject", {
        detail: {
            key: "asdf",
            winObj: {
                type: typeof window["Danbooru"],
                win: window["Danbooru"],
            }
        },
        bubbles: true,
        cancelable: true
    }
);

document.dispatchEvent(event);
