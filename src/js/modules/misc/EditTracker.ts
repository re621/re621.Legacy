import { PageDefinition } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

export class EditTracker extends RE6Module {

  private trackingBound = false;

  public constructor () {
    super(PageDefinition.post);
  }

  public create (): void {
    this.trackingBound = false;
    const $input = $("#post_tag_string").first();
    if ($input.length && $input.is(":visible")) {
      this.listen($input);
    } else {
      $("body").one("click.re621.edit-tracker", "#post-edit-link, #side-edit-link", () => {
        this.attachWhenReady();
      });
    }
  }

  public destroy (): void {
    if (!this.isInitialized()) return;
    super.destroy();
    $("body").off("click.re621.edit-tracker");
    $(document).off("input.re621.edit-tracker", "#post_tag_string");
    $(".diff-list.post-changes").remove();
    this.trackingBound = false;
  }

  private attachWhenReady (attempts = 0): void {
    if (this.trackingBound) return;
    const $input = $("#post_tag_string").first();
    if ($input.length) {
      this.listen($input);
      return;
    }
    if (attempts < 20) {
      window.setTimeout(() => this.attachWhenReady(attempts + 1), 50);
    }
  }

  private listen ($input: JQuery<HTMLElement>): void {
    if (this.trackingBound) return;
    this.trackingBound = true;

    const original = Util.getTags($input);

    $(".diff-list.post-changes").remove();
    const changes = $("<div>")
      .addClass("diff-list post-changes")
      .insertAfter("#tags-container");

    $input.off("input.re621.edit-tracker").on("input.re621.edit-tracker", () => {
      const changed = Util.getTags($input);

      const output = [];
      // Added tags (in changed, but not in original)
      for (const tag of changed.filter(el => !original.includes(el)))
        output.push(`<ins>+<a href="/wiki_pages/show_or_new?title=${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer">${escapeHTML(tag)}</a></ins>`);
      // Removed tags (in original, but not in changed)
      for (const tag of original.filter(el => !changed.includes(el)))
        output.push(`<del>-<a href="/wiki_pages/show_or_new?title=${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer">${escapeHTML(tag)}</a></del>`);

      if (output.length == 0) {
        changes.html("");
        return;
      }

      changes.html(`<label>Tag Changes</label>\n` + output.join(" "));
    });

    function escapeHTML (input: string): string {
      return $("<span>").text(input).html();
    }
  }

}
