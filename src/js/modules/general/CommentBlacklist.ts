import { RE6Module, Settings } from "../../components/RE6Module";

export class CommentBlacklist extends RE6Module {

  public constructor () {
    super([], true);
  }

  public getDefaultSettings (): Settings {
    return {
      enabled: true,

      filters: [],
    };
  }

  public create (): void {

    const filters = this.fetchSettings("filters");
    for (const comment of $("article.comment").get()) {
      const $comment = $(comment);
      const text = $comment.find("div.body:first").text().toLowerCase();
      for (const filter of filters) {
        if (!CommentBlacklist.filterMatches(text, filter)) continue;
        $comment.addClass("comment-blacklisted below-threshold");
        break;
      }
    }

  }

  /**
   * Checks if the provided comment text matches the specified blacklist line
   * @param comment Comment to check
   * @param blacklistLine Single line from the blacklist
   * @returns true if the line matches, false otherwise
   */
  private static filterMatches (comment: string, blacklistLine: string): boolean {
    const filters = blacklistLine.split(" ");
    let matches = 0;
    for (const filter of filters) {

      // Skip the empty filters. Shouldn't happen, but it still sometimes does
      if (filter.length == 0) {
        matches++;
        continue;
      }

      // Negative filter handling
      // If even one is found, just abort the whole thing. Otherwise, skip
      if (filter.startsWith("-")) {
        if (comment.includes(filter.substr(1))) return false;
        else matches++;
      } else if (comment.includes(filter)) matches++;
    }

    // Number of matches should exactly fit the number of filters in the blacklist line
    return matches == filters.length;
  }

}
