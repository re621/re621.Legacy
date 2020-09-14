import { E621 } from "../../components/api/E621";
import { APIIQDBResponse } from "../../components/api/responses/APIIQDBResponse";
import { XM } from "../../components/api/XM";
import { PageDefinition } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";

export class UploadUtilities extends RE6Module {


    public constructor() {
        super([PageDefinition.upload], true);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            checkDuplicates: true,
            addSourceLinks: true,
        };
    }

    public create(): void {
        super.create();

        // This form's structure is the absolute worst
        // There is not a single ID, or even a unique class

        // Check for duplicates and add reverse image search links
        if (this.fetchSettings("checkDuplicates")) this.handleDuplicateCheck();

        // Add clickable links to sources
        if (this.fetchSettings("addSourceLinks")) this.handleSourceEnhancements();
    }

    /**
     * Finds and returns a form section with the specified label.  
     * @param label Label to look for
     * @param id ID to add to the section
     */
    private static findSection(label: string, id: string): JQuery<HTMLElement> {
        return $("label[for=" + label + "]")
            .parent().parent()
            .attr("id", id);
    }

    /** Handles checking for duplicates, and appends reverse image search links */
    private handleDuplicateCheck(): void {

        const fileContainer = UploadUtilities.findSection("post_file", "section-file")
            .find("div.col2").first()
            .attr("id", "file-container");

        const dupesContainer = $("<div>")
            .attr("id", "dupes-container")
            .appendTo(fileContainer);

        const risContainer = $("<div>")
            .attr("id", "ris-container")
            .html("")
            .appendTo("div.upload_preview_container");

        let working = false;
        $(fileContainer).on("input", "input", (event) => {
            if (working) return;

            const $input = $(event.target),
                value = $input.val() + "";

            // Input is empty
            if (value == "") {
                dupesContainer.html("");
                risContainer.html("");
                return;
            }

            // Input is not a URL
            if (!/^https?:\/\//.test(value)) {
                dupesContainer.html(`<span class="fullspan">Unable to parse image path. <a href="/iqdb_queries" target="_blank">Check manually</a>?</span>`);
                risContainer.html("");
                return;
            }

            working = true;
            dupesContainer.html(`<span class="fullspan">Checking for duplicates . . .</span>`);;

            E621.IQDBQueries.get<APIIQDBResponse>({ "url": value }).then(
                (response) => {
                    console.log(response);
                    dupesContainer.html("");

                    // Sometimes, an empty response is just an empty array
                    // More often than not, it's an array with one malformed object
                    if (response.length == 0 || (response[0] !== undefined && response[0].post_id == undefined)) {
                        working = false;
                        return;
                    }

                    $("<h3>")
                        .html(`<a href="/iqdb_queries?url=${encodeURI(value)}" target="_blank">Duplicates Found:</a> ${response.length}`)
                        .appendTo(dupesContainer);

                    for (const entry of response)
                        makePostThumbnail(entry).appendTo(dupesContainer);

                    working = false;
                },
                (error) => {
                    console.log(error);
                    dupesContainer.html(`"<span class="fullspan error">IQDB server responded with: Internal Error ${error}</span>`);
                    working = false;
                }
            );

            risContainer.html(`
                <a href="/iqdb_queries?url=${encodeURI(value)}" target="_blank">e621</a>
                <a href="https://www.google.com/searchbyimage?image_url=${encodeURI(value)}" target="_blank">Google</a>
                <a href="https://saucenao.com/search.php?url=${encodeURI(value)}" target="_blank">SauceNAO</a>
                <a href="https://derpibooru.org/search/reverse?url=${encodeURI(value)}" target="_blank">Derpibooru</a>
                <a href="https://kheina.com/?url=${encodeURI(value)}" target="_blank">Kheina</a>
            `);
        });

        fileContainer.find("input[type=text").trigger("input");

        /**
         * Makes a simplistic thumbnail to display in the duplicates section
         * @param entry Post data
         */
        function makePostThumbnail(entry: APIIQDBResponse): JQuery<HTMLElement> {
            const postData = entry.post.posts;
            const article = $("<div>");

            const link = $("<a>")
                .attr({
                    href: "/posts/" + postData.id,
                    target: "_blank",
                })
                .appendTo(article);

            $("<img>")
                .attr({
                    src: postData.is_deleted ? "/images/deleted-preview.png" : postData["preview_file_url"],
                    title:
                        `${postData.image_width}x${postData.image_height} ${Util.formatBytes(postData.file_size)} ${Math.round(entry.score)}% match\n` +
                        `${postData.tag_string_artist}\n${postData.tag_string_copyright}\n${postData.tag_string_character}\n${postData.tag_string_species}`
                    ,
                })
                .appendTo(link);

            $("<loading>")
                .css("--progress", Math.round(entry.score) + "%")
                .appendTo(link);

            $("<span>")
                .html(`${postData["image_width"]}x${postData["image_height"]} ${Util.formatBytes(postData["file_size"])}`)
                .appendTo(article);

            return article;
        }
    }

    /** Improves source field functionality */
    private handleSourceEnhancements(): void {

        const sourceContainer = UploadUtilities.findSection("post_sources", "section-sources")
            .find("div.col2")
            .children("div").eq(1)
            .attr("id", "source-container");

        $(sourceContainer).on("input", "input.upload-source-input", (event) => {
            const $input = $(event.target),
                $parent = $input.parent();

            $parent.find("button.source-copy").remove();
            $parent.find("button.source-link").remove();

            if ($input.val() == "") return;

            $("<button>")
                .addClass("source-copy")
                .html("copy")
                .appendTo($parent)
                .on("click", () => {
                    XM.Util.setClipboard($input.val());
                });

            $("<button>")
                .addClass("source-link")
                .html("open")
                .appendTo($parent)
                .on("click", () => {
                    window.open($input.val() + "", "_blank");
                });
        });

        $("input.upload-source-input").trigger("input");
    }

}
