import { PageDefinition } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

export class EditTracker extends RE6Module {

  public constructor () {
    super(PageDefinition.post);
  }

  public create (): void {

    if ($("#post_tag_string, #re621_qedit_tags").is(":visible")) this.listen();
    else { $("body").one("click.re621", "#post-edit-link, #side-edit-link", () => { this.listen(); }); }
  }

  private async listen (): Promise<void> {

    const input = $("#post_tag_string, #re621_qedit_tags").filter(":visible").first(),
      original = Util.getTags(input);

    const changes = $("<div>")
      .addClass("diff-list post-changes")
      .insertAfter("#tags-container");

    input.on("input", () => {
      const changed = Util.getTags(input);

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
