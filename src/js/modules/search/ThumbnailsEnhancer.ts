import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Util } from "../../components/structure/Util";
import { GM } from "../../components/api/GM";
import { Danbooru } from "../../components/api/Danbooru";

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

            performance: true,
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

        const performance = this.fetchSettings("performance");
        this.postContainer.attr("data-thumb-zoom", "true");

        $("#posts-container article.post-preview").each((index, element) => {
            ThumbnailEnhancer.modifyThumbnail($(element), performance);
        });
    }

    /**
     * Converts the thumbnail into an enhancer-ready format
     * @param $article JQuery element `article.post-preview`
     * @param performance If false, loads bigger images immediately. Otherwise, waits for hover.
     */
    public static modifyThumbnail($article: JQuery<HTMLElement>, performance = true): void {

        /* Create the structure */
        const $link = $article.find("a").first().addClass("preview-box"),
            postID = parseInt($article.attr("data-id")),
            $img = $article.find("img"),
            $imgData = $img.attr("title").split("\n").slice(0, -2);     // Replace if the post date is added for the data-attributes.

        $article.find("source").remove();                               // If we ever have to worry about mobile users, this will need to be addressed.
        $img.removeAttr("title").attr("alt", "#" + $article.attr("data-id"));

        // Loading icon
        $("<div>")
            .addClass("preview-load")
            .html(`<i class="fas fa-circle-notch fa-2x fa-spin"></i>`)
            .appendTo($link);

        // Description box that only shows up on hover
        const $extrasBox = $("<div>")
            .addClass("bg-highlight preview-extras")
            .appendTo($link);
        $("<span>").html($imgData[4]).appendTo($extrasBox);
        $("<span>").html(parseRating($imgData[0])).appendTo($extrasBox);
        $("<span>").html(parseDate($imgData[2])).appendTo($extrasBox);

        // Voting Buttons
        const $voteBox = $("<div>")
            .addClass("preview-voting")
            .appendTo($link);
        const $voteUp = $("<button>")        // Upvote
            .attr("href", "#")
            .html(`<i class="far fa-thumbs-up"></i>`)
            .addClass("button score-neutral voteButton post-vote-up-" + postID)
            .appendTo($voteBox);
        const $voteDown = $("<button>")        // Downvote
            .attr("href", "#")
            .html(`<i class="far fa-thumbs-down"></i>`)
            .addClass("button score-neutral voteButton post-vote-down-" + postID)
            .appendTo($voteBox);
        /*
        $("<button>")        // Favorite
            .attr("href", "#")
            .html(`<i class="far fa-star"></i>`)
            .addClass("button score-neutral voteButton")
            .appendTo($voteBox);
        */

        $voteUp.click((event) => {
            event.preventDefault();
            Danbooru.Post.vote(postID, 1);
        });
        $voteDown.click((event) => {
            event.preventDefault();
            Danbooru.Post.vote(postID, -1);
        });


        /* Handle double-click */
        let dbclickTimer;
        const delay = 200;
        let prevent = false;

        //Make it so that the doubleclick prevents the normal click event
        $link.on("click.re621.thumbnail", (event) => {
            if (event.button !== 0) { return; } // Ignore mouse clicks which are not left clicks
            event.preventDefault();

            if ($(event.target).hasClass("voteButton") || $(event.target).parent().hasClass("voteButton")) return;

            dbclickTimer = window.setTimeout(() => {
                if (!prevent) {
                    $link.off("click.re621.thumbnail");
                    $link[0].click();
                }
                prevent = false;
            }, delay);
        }).on("dblclick.re621.thumbnail", (event) => {
            if (event.button !== 0) { return; } // Ignore mouse clicks which are not left clicks
            event.preventDefault();
            window.clearTimeout(dbclickTimer);
            prevent = true;
            GM.openInTab(window.location.origin + $link.attr("href"));
        });


        /* Load the larger images */
        // Thumbnail types that are not compatible with the enhancer
        if ($article.attr("data-file-ext") === "swf" || $article.attr("data-flags") === "deleted") return;

        const sampleURL = $article.attr("data-large-file-url");

        if (performance) {
            let timer;
            $article.on("mouseenter", () => {
                // only load sample after a bit of waiting
                // this prevents loading images just by hovering over them to get to another one
                timer = window.setTimeout(() => {
                    if ($img.attr("src") == sampleURL) return;

                    $link.addClass("loading");
                    $img.attr({
                        "src": sampleURL,
                        "data-src": sampleURL
                    });
                    $img.on("load", () => { $link.removeClass("loading"); });
                }, 200);
            });
            $article.on("mouseleave", () => {
                window.clearTimeout(timer);
            });
        } else {
            $link.addClass("loading");
            $img.attr({
                "src": sampleURL,
                "data-src": sampleURL
            });
            $img.on("load", () => { $link.removeClass("loading"); });
        }

        function parseRating(input: string): string {
            switch (input) {
                case "Rating: e": return "Explicit";
                case "Rating: q": return "Questionable";
                case "Rating: s": return "Safe";
                default: return "Unknown";
            }
        }

        function parseDate(input: string): string {
            const date = new Date(input.split(": ").pop().replace(" ", "T").replace(" ", ""));
            return `<span title="` + date.toLocaleString() + `">` + Util.timeAgo(date) + `</span>`;
        }
    }

}
