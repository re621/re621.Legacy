import { Page, PageDefinition } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Add various symbols to the titlebar depending on the posts state
 */
export class TitleCustomizer extends RE6Module {

  private post: Post;

  public constructor () {
    super(PageDefinition.post, true);
  }

  /**
   * Returns a set of default settings values
   * @returns Default settings
   */
  protected getDefaultSettings (): Settings {
    return {
      enabled: true,
      template: "#%postid% by %artist% (%copyright%) - %character%",
      symbolsEnabled: true,
      symbolFav: "\u2665",      // heart symbol
      symbolVoteUp: "\u2191",   // arrow up
      symbolVoteDown: "\u2193",  // arrow down
    };
  }

  /**
   * Creates the module's structure.
   * Should be run immediately after the constructor finishes.
   */
  public create (): void {
    super.create();

    this.post = Post.getViewingPost();
    this.refreshPageTitle();
  }

  /**
   * Refreshes the page's title according to the template in the settings
   */
  public refreshPageTitle (): void {
    document.title = this.parseTemplate();
  }

  /**
   * Parses the page title template, replacing variables with their corresponding values
   * @returns string Page title
   */
  private parseTemplate (): string {
    let prefix = "";
    if (this.fetchSettings("symbolsEnabled")) {
      if (this.post.is_favorited) { prefix += this.fetchSettings("symbolFav"); }
      if (this.post.user_score > 0) {
        prefix += this.fetchSettings("symbolVoteUp");
      } else if (this.post.user_score < 0) { prefix += this.fetchSettings("symbolVoteDown"); }
      if (prefix) prefix += " ";
    }

    return prefix + this.fetchSettings("template")
      .replace(/%postid%/g, this.post.id)
      .replace(/%artist%/g, tagSetToString(this.post.tags.real_artist))
      .replace(/%copyright%/g, tagSetToString(this.post.tags.copyright))
      .replace(/%character%/g, tagSetToString(this.post.tags.character))
      .replace(/%species%/g, tagSetToString(this.post.tags.species))
      .replace(/%general%/g, tagSetToString(this.post.tags.general))
      .replace(/%all%/g, this.post.tagString)
      .replace(/%meta%/g, tagSetToString(this.post.tags.meta))
      .replace(/[ ]{2,}/g, " ")
      .replace(/( (?:- ){2,})/g, " - ")
      .replace(/\(\)|( - )$/g, "")
      .replace(/^ | $/g, "")
            + " - " + Page.getSiteName();

    function tagSetToString (tags: Set<string>): string {
      return [...tags].join(", ");
    }
  }
}
