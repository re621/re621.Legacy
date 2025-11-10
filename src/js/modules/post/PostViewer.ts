import { Danbooru } from "../../components/api/Danbooru";
import { Page, PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post } from "../../components/post/Post";
import { PostActions } from "../../components/post/PostActions";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { ThemeCustomizer } from "../general/ThemeCustomizer";

/**
 * Add various symbols to the titlebar depending on the posts state
 */
export class PostViewer extends RE6Module {

  private post: Post;

  public constructor () {
    super([PageDefinition.post, PageDefinition.changes, PageDefinition.iqdb], true);

    const reqPage = PageDefinition.post;
    this.registerHotkeys(
      // { keys: "hotkeyUpvote", fnct: this.triggerUpvote, page: reqPage },
      // { keys: "hotkeyUpvoteNU", fnct: this.triggerUpvoteNU, page: reqPage },
      // { keys: "hotkeyDownvote", fnct: this.triggerDownvote, page: reqPage },
      // { keys: "hotkeyDownvoteNU", fnct: this.triggerDownvoteNU, page: reqPage },

      // { keys: "hotkeyFavorite", fnct: this.toggleFavorite, page: reqPage },
      // { keys: "hotkeyAddFavorite", fnct: this.addFavorite, page: reqPage },
      // { keys: "hotkeyRemoveFavorite", fnct: this.removeFavorite, page: reqPage },

      { keys: "hotkeyHideNotes", fnct: () => this.toggleNotes(), page: reqPage },
      { keys: "hotkeyNewNote", fnct: this.switchNewNote, page: reqPage },

      { keys: "hotkeyAddSet", fnct: this.openSetDialogue, page: reqPage },
      { keys: "hotkeyAddPool", fnct: this.openPoolDialogue, page: reqPage },

      { keys: "hotkeyToggleSetLatest", fnct: this.toggleSetLatest, page: reqPage },
      { keys: "hotkeyAddSetLatest", fnct: this.addSetLatest, page: reqPage },
      { keys: "hotkeyRemoveSetLatest", fnct: this.removeSetLatest, page: reqPage },

      { keys: "hotkeyAddSetCustom1", fnct: () => { this.addSetCustom("hotkeyAddSetCustom1_data"); }, page: reqPage },
      { keys: "hotkeyAddSetCustom2", fnct: () => { this.addSetCustom("hotkeyAddSetCustom2_data"); }, page: reqPage },
      { keys: "hotkeyAddSetCustom3", fnct: () => { this.addSetCustom("hotkeyAddSetCustom3_data"); }, page: reqPage },
      { keys: "hotkeyAddSetCustom4", fnct: () => { this.addSetCustom("hotkeyAddSetCustom4_data"); }, page: reqPage },
      { keys: "hotkeyAddSetCustom5", fnct: () => { this.addSetCustom("hotkeyAddSetCustom5_data"); }, page: reqPage },

      { keys: "hotkeyOpenHistory", fnct: this.openImageHistory },
      { keys: "hotkeyOpenArtist", fnct: this.openArtist, page: reqPage },
      { keys: "hotkeyOpenSource", fnct: this.openSource, page: reqPage },
      { keys: "hotkeyOpenParent", fnct: this.openParent, page: reqPage },
      { keys: "hotkeyToggleRel", fnct: this.toggleRelSection, page: reqPage },
      { keys: "hotkeyOpenIQDB", fnct: this.openIQDB },
      { keys: "hotkeyOpenAPI", fnct: this.openAPI },

      { keys: "hotkeyOpenSauceNAO", fnct: this.openSauceNAO },
      { keys: "hotkeyOpenGoogle", fnct: this.openGoogle },
      { keys: "hotkeyOpenYandex", fnct: this.openYandex },
      { keys: "hotkeyOpenDerpibooru", fnct: this.openDerpibooru },
      { keys: "hotkeyOpenFuzzySearch", fnct: this.openFuzzySearch },
      { keys: "hotkeyOpenInkbunny", fnct: this.openInkbunny },
    );
  }

  /**
   * Returns a set of default settings values
   * @returns Default settings
   */
  protected getDefaultSettings (): Settings {
    return {
      enabled: true,
      hotkeyUpvote: "w",          // vote up on the current post
      hotkeyUpvoteNU: "",         // vote up, don't unvote
      hotkeyDownvote: "s",        // vote down on the current post
      hotkeyDownvoteNU: "",       // vote down, don't unvote

      hotkeyFavorite: "f",        // toggle the favorite state of the post
      hotkeyAddFavorite: "",      // add current post to favorites
      hotkeyRemoveFavorite: "",   // remove current post from favorites

      hotkeyHideNotes: "o",       // toggle note visibility
      hotkeyNewNote: "p",         // add new note

      hotkeyAddSet: "",           // open the "add to set" dialogue
      hotkeyAddPool: "",          // open the "add to pool" dialogue

      hotkeyToggleSetLatest: "",  // toggles the current post's set
      hotkeyAddSetLatest: "",     // adds the current post to the last used set
      hotkeyRemoveSetLatest: "",  // removes the current post from the last used set

      hotkeyAddSetCustom1: "",
      hotkeyAddSetCustom1_data: "0",
      hotkeyAddSetCustom2: "",
      hotkeyAddSetCustom2_data: "0",
      hotkeyAddSetCustom3: "",
      hotkeyAddSetCustom3_data: "0",
      hotkeyAddSetCustom4: "",
      hotkeyAddSetCustom4_data: "0",
      hotkeyAddSetCustom5: "",
      hotkeyAddSetCustom5_data: "0",

      hotkeyOpenHistory: "",      // Opens the post history for the current image
      hotkeyOpenArtist: "",       // Opens the search page for the post's artist
      hotkeyOpenSource: "",       // Opens the first image source in a new tab
      hotkeyOpenParent: "",       // Opens the parent/child post, if there is one
      hotkeyToggleRel: "",        // Toggles the relationship section
      hotkeyOpenIQDB: "",         // Searches for similar posts
      hotkeyOpenAPI: "",          // Shows raw post data

      hotkeyOpenGoogle: "",       // Open Google Lens search
      hotkeyOpenSauceNAO: "",     // Open SauceNAO search
      hotkeyOpenDerpibooru: "",   // Open Derpibooru search
      hotkeyOpenYandex: "",       // Open Yandex search
      hotkeyOpenFuzzySearch: "",  // Open FuzzySearch
      hotkeyOpenInkbunny: "",     // Open Inkbunny md5 search

      upvoteOnFavorite: true,     // add an upvote when adding the post to favorites
      hideNotes: false,           // should the notes be hidden by default

      moveChildThumbs: false,     // Moves the parent/child post thumbnails to under the searchbar
      boldenTags: true,           // Restores the classic bold look on non-general tags
    };
  }

  /**
   * Creates the module's structure.
   * Should be run immediately after the constructor finishes.
   */
  public create (): void {
    super.create();

    if (!Page.matches(PageDefinition.post)) return;

    this.post = Post.getViewingPost();

    // Add a new note button
    const translateButton = $("#translate");
    translateButton.parents("#add-notes-list").hide();

    translateButton.insertBefore($(".ptbr-resize").first())
      .addClass("st-button kinetic")
      .html("+ Note");


    // Move child/parent indicator, leave others as is, like marked for deletion
    if (this.fetchSettings("moveChildThumbs"))
      $(".parent-children")
        .addClass("children-moved")
        .insertAfter($(".post-search"));

    // Add a "left" option for navbars
    if (Page.matches(PageDefinition.post)) {

      const navbarContainer = $("#nav-links-top");
      if (navbarContainer.length > 0) {
        navbarContainer.clone().insertAfter("#re621-search").attr("id", "nav-links-left");
        for (const el of $("#nav-links-left").find("li.post-nav").get()) {
          const navbar = $(el);
          const lower = $("<div>").addClass("nav-left-down").appendTo(navbar);

          navbar.find("div.post-nav-spacer").remove();
          navbar.find(".first, .prev, .next, .last").appendTo(lower);
        }
      }

      if (Util.LS.getItem("re621-theme-nav") == "left") {
        $("body").attr("re621-data-th-nav", "true");
        ThemeCustomizer.trigger("switch.navbar", "left");
      } else $("body").attr("re621-data-th-nav", "false");
    }

    // Bolden the tags
    this.toggleBoldenedTags(this.fetchSettings<boolean>("boldenTags"));

    // Listen to favorites button attribute change
    const favoriteButton = document.querySelector(".ptbr-favorite-button");

    const mutationObserver = new MutationObserver((mutations) => {
      if (!this.fetchSettings("upvoteOnFavorite") || $(".ptbr-vote[data-vote=1]")[0] || favoriteButton.getAttribute("favorited") != "true") return;
      $(".ptbr-vote-button[data-action=1]")[0].click();
    });

    mutationObserver.observe(favoriteButton, {
      attributes: true,
      attributeFilter: ["favorited"],
    });
  }

  /** Toggles the boldened look on sidebar tags */
  public toggleBoldenedTags (state = true): void {
    $("#tag-list").toggleClass("tags-boldened", state);
  }

  /** Emulates a click on the upvote button */
  private triggerUpvote (): void {
    $(".ptbr-vote-button[data-action=1]")[0].click();
  }

  /** Same as above, but does not unvote */
  private triggerUpvoteNU (): void {
    const voteWrap = $(".ptbr-vote");
    if (voteWrap.attr("data-vote") !== "0") return;
    $(".ptbr-vote-button[data-action=1]")[0].click();
  }

  /** Emulates a click on the downvote button */
  private triggerDownvote (): void {
    $(".ptbr-vote-button[data-action=-1]")[0].click();
  }

  /** Same as above, but does not unvote */
  private triggerDownvoteNU (): void {
    const voteWrap = $(".ptbr-vote");
    if (voteWrap.attr("data-vote") !== "0") return;
    $(".ptbr-vote-button[data-action=-1]")[0].click();
  }

  /** Toggles the favorite state */
  private toggleFavorite (): void {
    $(".ptbr-favorite-button")[0].click();
  }

  /** Adds the post to favorites, does not remove it */
  private addFavorite (): void {
    const btn = $(".ptbr-favorite-button");
    if (btn.attr("favorited") == "true") return;
    btn[0].click();
  }

  /** Removes the post from favorites, does not add it */
  private removeFavorite (): void {
    const btn = $(".ptbr-favorite-button");
    if (btn.attr("favorited") == "false") return;
    btn[0].click();
  }

  /** Switches the notes container to its opposite state */
  private async toggleNotes (): Promise<void> {
    const btn = $(".ptbr-notes-button");
    if (!btn.length) return;
    btn[0].click();
  }

  /** Toggles the note editing interface */
  private async switchNewNote (): Promise<void> {
    $("#translate")[0].click();
  }

  /** Opens the dialog to add the post to the set */
  private openSetDialogue (): void {
    $("a#set")[0].click();
  }

  /** Adds or removes the current post from the latest used set */
  private toggleSetLatest (): void {
    const lastSet = parseInt(window.localStorage.getItem("set"));
    if (!lastSet) {
      Danbooru.error(`Error: no set selected`);
      return;
    }

    PostActions.toggleSet(lastSet, Post.getViewingPost().id);
  }

  /** Adds the current post to the latest used set */
  private addSetLatest (): void {
    const lastSet = parseInt(window.localStorage.getItem("set"));
    if (!lastSet) {
      Danbooru.error(`Error: no set selected`);
      return;
    }

    PostActions.addSet(lastSet, Post.getViewingPost().id);
  }

  /** Removes the current post frp, the latest used set */
  private removeSetLatest (): void {
    const lastSet = parseInt(window.localStorage.getItem("set"));
    if (!lastSet) {
      Danbooru.error(`Error: no set selected`);
      return;
    }

    PostActions.removeSet(lastSet, Post.getViewingPost().id);
  }

  /** Adds the current post to the set defined in the config */
  private addSetCustom (dataKey: string): void {
    PostActions.addSet(
      this.fetchSettings<number>(dataKey),
      Post.getViewingPost().id,
    );
  }

  /** Opens the dialog to add the post to the pool */
  private async openPoolDialogue (): Promise<void> {
    await Util.sleep(50);
    $("a#pool")[0].click();
  }

  /** Redirects the page to the post history */
  private openImageHistory (): void {
    if (Page.matches(PageDefinition.post)) {
      location.href = "/post_versions?search[post_id]=" + Page.getPageID();
    } else if (Page.matches(PageDefinition.iqdb)) {
      if (!Page.hasQueryParameter("post_id")) return;
      location.href = "/post_versions?search[post_id]=" + Page.getQueryParameter("post_id");
    } else if (Page.matches(PageDefinition.changes)) {
      if (!Page.hasQueryParameter("search[post_id]")) return;
      location.href = "/posts/" + Page.getQueryParameter("search[post_id]");
    }
  }

  private static lookupClick (query: string): void {
    const lookup = $(query).first();
    if (lookup.length == 0) return;
    lookup[0].click();
  }

  /** Searches for other works by the artist, if there is one */
  private openArtist (): void { PostViewer.lookupClick("li.category-1 a.search-tag"); }

  /** Opens the first source link */
  private openSource (): void { PostViewer.lookupClick("div.source-link a"); }

  /** Opens the first source link */
  private openParent (): void { PostViewer.lookupClick("#has-parent-relationship-preview a, #has-children-relationship-preview a"); }

  /** Toggles the visibility of the parent/child thumbnails */
  private toggleRelSection (): void { PostViewer.lookupClick("#has-children-relationship-preview-link, #has-parent-relationship-preview-link"); }

  /** Opens IQDB page for the current page */
  private openIQDB (): void {
    if (Page.matches(PageDefinition.post)) {
      location.href = "/iqdb_queries?post_id=" + Page.getPageID();
    } else if (Page.matches(PageDefinition.iqdb)) {
      if (!Page.hasQueryParameter("post_id")) return;
      location.href = "/posts/" + Page.getQueryParameter("post_id");
    } else if (Page.matches(PageDefinition.changes)) {
      if (!Page.hasQueryParameter("search[post_id]")) return;
      location.href = "/iqdb_queries?post_id=" + Page.getQueryParameter("search[post_id]");
    }
  }

  private static openSourceLookup (source: "Google" | "SauceNAO" | "Derpibooru" | "Yandex" | "FuzzySearch" | "Inkbunny"): void {
    if (!Page.matches(PageDefinition.post)) return;
    const link = $(`#post-related-images a:contains("${source}")`).first();
    if (!link.length) return;
    link[0].click();
  }

  private openGoogle (): void { PostViewer.openSourceLookup("Google"); }

  private openSauceNAO (): void { PostViewer.openSourceLookup("SauceNAO"); }

  private openDerpibooru (): void { PostViewer.openSourceLookup("Derpibooru"); }

  private openYandex (): void { PostViewer.openSourceLookup("Yandex"); }

  private openFuzzySearch (): void { PostViewer.openSourceLookup("FuzzySearch"); }

  private openInkbunny (): void { PostViewer.openSourceLookup("Inkbunny"); }

  /** Opens the raw API data for the current post */
  private openAPI (): void { location.href = location.origin + location.pathname + ".json" + location.search; }

}
