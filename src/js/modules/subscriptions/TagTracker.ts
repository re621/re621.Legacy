import { E621 } from "../../components/api/E621";
import { APIPost, PostFlag } from "../../components/api/responses/APIPost";
import { XM } from "../../components/api/XM";
import { Blacklist } from "../../components/data/Blacklist";
import { PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { PostData } from "../../components/post/Post";
import { PostActions } from "../../components/post/PostActions";
import { PostParts } from "../../components/post/PostParts";
import { Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { WikiEnhancer } from "../misc/WikiEnhancer";
import { BetterSearch, ImageClickAction } from "../search/BetterSearch";
import { UpdateContent, UpdateData } from "./_SubscriptionCache";
import { SubscriptionManager } from "./_SubscriptionManager";
import { SubscriptionTracker } from "./_SubscriptionTracker";

export class TagTracker extends SubscriptionTracker {

  // Needs to be overridden due to lower lookup batch sizes
  protected batchSize = 40;

  protected quickSubEnabled = true;

  protected buttonSelect = {
    minor: {
      regex: [PageDefinition.search, PageDefinition.post],
      selector: "#tag-box li span.tag-list-subscribe, #tag-list li span.tag-list-subscribe",
    },
    major: {
      regex: [PageDefinition.wiki, PageDefinition.wikiNA, PageDefinition.artist],
      selector: "#c-wiki-pages > #a-show > #content > h1:first, #c-artists > #a-show > h1:first",
    },
  };

  public getDefaultSettings (): Settings {
    return {
      ...super.getDefaultSettings(),

      cacheSize: 500,                 // how many subscription updates are kept
    };
  }

  protected fetchMinorSubscriptionName (element: JQuery<HTMLElement>): string {
    return decodeURIComponent(element.attr("data-tag"));
  }

  protected fetchMajorSubscriptionName (element: JQuery<HTMLElement>): string {
    return WikiEnhancer.sanitizeWikiTagName(element.find("a:first").text());
  }

  public async fetchUpdatedEntries (): Promise<UpdateData> {

    const result: UpdateData = {};
    this.clearStatus();
    this.writeStatus("Updating Tag Subscriptions");

    // Fetching the list of subscriptions
    this.writeStatus(`. . . retrieving settings`);
    const subscriptions = this.slist.get();
    const lastUpdate = await this.fetchSettings<number>("lastUpdate", true);
    if (subscriptions.size == 0) return result;

    // Splitting subscriptions into batches and sending API requests
    this.writeStatus(`. . . sending an API request`);
    const subscriptionsChunks = Util.chunkArray(subscriptions, this.batchSize);
    const apiResponse: { [timestamp: number]: APIPost } = {};

    for (const [index, chunk] of subscriptionsChunks.entries()) {

      // Processing batch #index
      const processedChunk = chunk.map(el => "~" + el);
      if (index == 10) this.writeStatus(`&nbsp; &nbsp; &nbsp; <span style="color:gold">connection throttled</span>`);
      if (subscriptionsChunks.length > 1)
        this.writeStatus(`&nbsp; &nbsp; - processing batch #${index} [<a href="/posts?tags=${processedChunk.join("+")}" target="_blank">${chunk.length}</a>]`);

      for (const post of await E621.Posts.get<APIPost>({ "tags": processedChunk, "limit": 320 }, index < 10 ? 500 : 1000))
        apiResponse[new Date(post.created_at).getTime()] = post;

      // This should prevent the tracker from double-updating if the process takes more than 5 minutes
      // There are definitely users who are subscribed to enough tags to warrant this
      SubscriptionManager.trigger("inprogress." + this.trackerID, 1);
    }

    // Parsing output, discarding irrelevant data
    this.writeStatus(`. . . formatting output`);
    // await Util.sleep(5000);
    for (const index of Object.keys(apiResponse).sort()) {

      // This is needed exclusively for the Blacklist below
      const post = PostData.fromAPI(apiResponse[index]);

      // Don't include updates posted before the last update timestamp
      const timestamp = post.date.obj.getTime();
      if (timestamp < lastUpdate) continue;

      // Avoid posts with blacklisted tags
      // This is kind of excessive, but it works
      Blacklist.addPost(post);
      if (Blacklist.checkPost(post.id, true)) continue;

      result[timestamp] = {
        uid: post.id,
        md5:
                    ((post.file.ext == "swf" || post.flags.has(PostFlag.Deleted)) ? "" : post.file.md5)
                    + "|" + post.has.sample     // sample       boolean
                    + "|" + post.file.ext       // extension    string
                    + "|" + post.rating         // rating       E | Q | S
                    + "|" + post.img.width      // width        int
                    + "|" + post.img.height     // height       int
                    + "|" + post.file.size,      // filesize     int
        new: true,
      };
    }

    this.writeStatus(`. . . displaying results`);

    return result;
  }

  protected drawUpdateEntry (data: UpdateContent, timestamp: number, deleteFunction): JQuery<HTMLElement> {

    if (!data.md5) {
      console.error("Error: Invalid data in cache");
      return;
    }

    const imageData = data.md5.split("|");
    const result = $("<subitem>")
      .attr({
        "new": data.new,    // Output ordering
        "uid": timestamp,   // Needed for dynamic rendering

        // Necessary data for the HoverZoom
        "data-id": data.uid,
        "data-md5": imageData[0],
        "data-preview-url": getPreviewLink(imageData[0]),
        "data-sample-url": getSampleLink(imageData[0], imageData[1] == "true", imageData[2]),
        "data-file-ext": imageData[2],
        "data-rating": imageData[3] || "e",
        "data-created-at": new Date(timestamp).toString(),

        "data-width": imageData[4],
        "data-height": imageData[5],
        "data-size": imageData[6],

        "hztrigger": "img",
      })
      .on("re621:render", () => {
        const link = $("<a>")
          .attr({ href: "/posts/" + data.uid })
          .appendTo(result);

        PostParts.bootstrapDoubleClick(link, () => {

          switch (ModuleController.fetchSettings(BetterSearch, "clickAction")) {
            case ImageClickAction.NewTab: {
              XM.Util.openInTab(window.location.origin + link.attr("href"), false);
              break;
            }
            case ImageClickAction.CopyID: {
              XM.Util.setClipboard(data.uid + "", "text");
              Danbooru.notice(`Copied post ID to clipboard: <a href="/posts/${data.uid}" target="_blank" rel="noopener noreferrer">#${data.uid}</a>`);
              break;
            }
            case ImageClickAction.Blacklist: {
              Blacklist.toggleBlacklistTag("id:" + data.uid);
              break;
            }
            case ImageClickAction.AddToSet: {
              const lastSet = parseInt(window.localStorage.getItem("set"));
              if (!lastSet) Danbooru.error(`Error: no set selected`);
              else PostActions.addSet(lastSet, data.uid);
              break;
            }
            case ImageClickAction.ToggleSet: {
              const lastSet = parseInt(window.localStorage.getItem("set"));
              if (!lastSet) Danbooru.error(`Error: no set selected`);
              else PostActions.toggleSet(lastSet, data.uid);
              break;
            }
            default: {
              link.off("click.re621.dbl-extra");
              link[0].click();
            }
          }

        });

        const image = $("<img>")
          .attr({
            src: getPreviewLink(imageData[0]),
            hztarget: "subitem",
          })
          .appendTo(link)
          .one("load", () => {
            // This is a workaround to avoid empty thumbnails
            // The preview gets loaded first, then a sample replaces it if necessary
            if (this.loadLargeThumbs && !image.attr("error"))
              image
                .attr("src", getSampleLink(imageData[0], imageData[1] == "true", imageData[2]))
                .one("error", () => {
                  image.attr("src", "https://e621.net/images/deleted-preview.png");
                });
          })
          .one("error", () => {
            image.attr("error", "true");
            image.attr("src", "https://e621.net/images/deleted-preview.png");
          });

        $("<a>")
          .addClass("delete-link")
          .html(`<span><i class="fas fa-times"></i></span>`)
          .appendTo(result)
          .on("click", (event) => {
            event.preventDefault;
            deleteFunction(timestamp, result);
          });
      })
      .on("re621:reset", () => {
        result.html("");
      });

    return result;

    function getPreviewLink (md5: string): string {
      if (!md5) return "https://e621.net/images/deleted-preview.png";
      return `https://static1.e621.net/data/preview/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`;
    }

    function getSampleLink (md5: string, hasSample: boolean, ext = "jpg"): string {
      if (!md5) return "https://e621.net/images/deleted-preview.png";
      return hasSample
        ? `https://static1.e621.net/data/sample/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`
        : `https://static1.e621.net/data/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.${ext}`;
    }
  }

  protected formatSubscriptionListEntry (id: string, value: any, unsub: (name: string) => void): JQuery<HTMLElement> {

    const formattedID = id.replace(/_/g, " ").toLowerCase();
    const result = $("<sb-enitem>")
      .attr({
        content: id + " " + formattedID,
        sort: id.toLowerCase(),
      });

    $("<a>")
      .addClass("sb-unsub")
      .html(`<i class="fas fa-times"></i>`)
      .attr({ "title": "Unsubscribe" })
      .appendTo(result)
      .on("click", (event) => {
        event.preventDefault();
        unsub(id);
      });

    $("<a>")
      .html(id)
      .attr({ "href": "/wiki_pages/show_or_new?title=" + id })
      .appendTo(result);

    return result;
  }

}
