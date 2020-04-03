import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Util } from "../../components/structure/Util";

export class ThumbnailEnhancer extends RE6Module {

    private postContainer: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefintion.search, PageDefintion.popular, PageDefintion.favorites]);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            crop: true,
            zoom: true,
        };
    }

    public create(): void {
        this.postContainer = $("div#posts-container");

        this.toggleCroppedThumbnails(this.fetchSettings("crop"));

        this.toggleHoverZoom(this.fetchSettings("zoom"));
    }

    /**
     * Crops the thumbnails to squares to minimize empty space
     * @param state True to crop, false to restore
     */
    public toggleCroppedThumbnails(state = true): void {
        if (state) this.postContainer.attr("data-thumb-crop", "true");
        else this.postContainer.attr("data-thumb-crop", "false");
    }

    /**
     * Enables the zoom-on-hover functionality
     * @param state True to enable, false to disable
     */
    public toggleHoverZoom(state = true): void {
        if (!state) return;

        this.postContainer.attr("data-thumb-zoom", "true");

        $("article.post-preview").each((index, element) => {
            const $article = $(element),
                $picture = $article.find("picture"),
                $source = $article.find("source[media='(min-width: 800px)']"),
                $img = $article.find("img"),
                $imgData = $img.attr("title").split("\n").slice(0, -2);

            console.log($imgData);

            const $previewBox = $("<div>").addClass("preview-box").prependTo($article);
            $picture.appendTo($previewBox);

            const $extrasBox = $("<div>").addClass("preview-extras").appendTo($previewBox);
            $("<span>").html(parseRating($imgData[0])).appendTo($extrasBox);
            $("<span>").html(parseStatus($imgData[3])).appendTo($extrasBox);
            $("<span>").html(parseDate($imgData[2])).appendTo($extrasBox);

            $img.attr({
                "alt": "",
                "title": "",
            });

            $source.attr("srcset", $article.attr("data-large-file-url"));
        });

        function parseRating(input: string): string {
            switch (input) {
                case "Rating: e": return "Explicit";
                case "Rating: q": return "Questionable";
                case "Rating: s": return "Safe";
                default: return "Unknown";
            }
        }

        function parseStatus(input: string): string {
            input = input.split(": ")[1];
            return input.charAt(0).toUpperCase() + input.slice(1);
        }

        function parseDate(input: string): string {
            input = input.split(": ")[1];
            return `<span title="` + input + `">` + Util.timeAgo(input) + `</span>`;
        }
    }

}