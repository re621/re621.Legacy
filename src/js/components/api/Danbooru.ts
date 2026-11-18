/* Type definitions for the e621 Javascript methods */

import { XM } from "./XM";

/**
 * Wrapper for the global object exposed by e621's own scripts.
 * It used to be called `Danbooru`; that name is now only an alias for `E621`.
 */
export class Danbooru {

  private static getModules (): any { return XM.Window["E621"] || XM.Window["Danbooru"]; }

  private static hasModules (): boolean { return Danbooru.getModules() !== undefined; }

  public static Autocomplete = {
    initialize_all (): void {
      if (Danbooru.hasModules()) Danbooru.getModules()["Autocomplete"].initialize_all();
      else XM.Chrome.execInjectorRequest("Danbooru", "Autocomplete", "initialize_all");
    },
  };

  public static PostResizer = {
    resizeTo (size: "next" | string): void {
      if (Danbooru.hasModules()) Danbooru.getModules()["PostResizer"].resizeTo(size);
      else XM.Chrome.execInjectorRequest("Danbooru", "PostResizer", "resizeTo", [size]);
    },
  };

  public static PostModeMenu = {

    /**
     * Notifies the site that the selected mode has changed.
     * The site listens to the native event, which jQuery's `trigger` does not dispatch.
     */
    change (): void {
      const select = document.getElementById("mode-box-mode");
      if (select) select.dispatchEvent(new Event("change", { bubbles: true }));
    },

  };

  public static PostCache = {

    /**
     * Makes the site read (or re-read) the post data from the attributes of a thumbnail.
     * The site only tracks `article.thumbnail` elements with `data-id` and `data-rating`.
     * @param element Thumbnail element. Must already be attached to the page.
     */
    async register (element: HTMLElement): Promise<void> {
      if (Danbooru.hasModules()) {
        // Wrapped by the page's own jQuery, so that no sandboxed object is passed to the page
        Danbooru.getModules()["PostCache"].register(XM.Window["$"](element), true);
      } else await XM.Chrome.execInjectorRequest("Danbooru", "PostCache", "register", [element.dataset.id]);
    },

  };

  public static get Note () {
    if (!Danbooru.hasModules()) throw new Error("Danbooru.Note module is not available.");
    return Danbooru.getModules()["Note"];
  }

  public static notice (input: string, permanent?: boolean): void {
    if (Danbooru.hasModules())
      Danbooru.getModules()["Toast"].notice(input, permanent);
    else XM.Chrome.execInjectorRequest("Danbooru", "Notice", "notice", [input, permanent]);
  }

  public static error (input: string): void {
    if (Danbooru.hasModules())
      Danbooru.getModules()["Toast"].alert(input);
    else XM.Chrome.execInjectorRequest("Danbooru", "Notice", "error", [input]);
  }
}
