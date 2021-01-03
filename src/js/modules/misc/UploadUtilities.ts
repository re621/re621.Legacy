import { E621 } from "../../components/api/E621";
import { APIIQDBResponse } from "../../components/api/responses/APIIQDBResponse";
import { XM } from "../../components/api/XM";
import { PageDefinition } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { TagSuggester } from "./TagSuggester";

export class UploadUtilities extends RE6Module {


    public constructor() {
        super([PageDefinition.upload], true);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,

            checkDuplicates: true,      // run uploads through e621's version of IQDB
            addSourceLinks: true,       // improve source links fields somewhat
            cleanSourceLinks: true,    // convert linkst to https and remove the www
            loadImageData: false,       // load image headers to get extra data
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

        // Load extra data from the image's header
        this.handleImageData();

        // Fix the thumbnail not getting updated properly when copy-pasting
        const imageUrlInput = $("#file-container input[type=text]").on("paste", async () => {
            await Util.sleep(50);   // Paste event fires immediately, before the input changes
            Util.Events.triggerVueEvent(imageUrlInput, "keyup");
        });

        // Add a class to the "Submit" button
        $("button:contains('Upload')").addClass("submit-upload");
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
                    // console.log(response);
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
                    dupesContainer.html("");
                    const errorMessage = $("<span>")
                        .addClass("fullspan error")
                        .html(
                            (error.error && error.error == 429)
                                ? "IQDB: Too Many Requests. "
                                : `IQDB: Internal Error ${error.error ? error.error : 400} `
                        )
                        .appendTo(dupesContainer);
                    $("<a>")
                        .html("Retry?")
                        .appendTo(errorMessage)
                        .on("click", (event) => {
                            event.preventDefault();
                            $(fileContainer).find("input").trigger("input");
                        });
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
                        `${postData.image_width}x${postData.image_height} ${Util.Size.format(postData.file_size)} ${Math.round(entry.score)}% match\n` +
                        `${postData.tag_string_artist}\n${postData.tag_string_copyright}\n${postData.tag_string_character}\n${postData.tag_string_species}`
                    ,
                })
                .appendTo(link);

            $("<loading>")
                .css("--progress", Math.round(entry.score) + "%")
                .appendTo(link);

            $("<span>")
                .html(`${postData["image_width"]}x${postData["image_height"]} ${Util.Size.format(postData["file_size"])}`)
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

        const urlMatch = /(http(?:s)?\:\/\/)(www\.)?/;
        const timers = {};
        $(sourceContainer).on("input", "input.upload-source-input", (event) => {
            const $input = $(event.currentTarget),
                $parent = $input.parent();

            if ($input.data("vue-event") === "true") {
                $input.data("vue-event", "false");
                return;
            }

            let id = $input.attr("data-timer");
            if (!id) {
                id = Util.ID.make();
                $input.attr("data-timer", id);
                timers[id] = 0;
            }

            $parent.find("button.source-copy").remove();
            $parent.find("button.source-link").remove();
            $parent.find("span.source-eval").remove();

            if ($input.val() == "") return;

            // Fix the source links
            if (timers[id]) clearTimeout(timers[id]);
            timers[id] = window.setTimeout(() => {
                if (!this.fetchSettings("cleanSourceLinks")) return;
                $input.val((index, value) => {
                    if (!urlMatch.test(value)) return value;
                    return value.replace(urlMatch, "https://");
                });
                Util.Events.triggerVueEvent($input, "input", "vue-event");
            }, 500);

            // Create buttons
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

            $("<span>")
                .addClass("source-eval")
                .html(getLinkEval($input.val() + ""))
                .appendTo($parent);
        });

        $("input.upload-source-input").trigger("input");

        function getLinkEval(link: string): string {
            if (!/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(link)) return "invalid";
            if (!link.startsWith("https")) return "http";
            return "";
        }
    }

    /** Load image file size and type */
    private handleImageData(): void {

        const output = $("#preview-sidebar div.upload_preview_dims").first();
        const image = $("#preview-sidebar img.upload_preview_img").first();
        image.on("load.resix", () => {

            output.attr({
                "data-width": $(image).prop("naturalWidth"),
                "data-height": $(image).prop("naturalHeight"),
                "data-size": "0",
                "data-type": "unk",
                "data-file": false,
            });

            // Debug.log("loading", image.attr("src"));

            if (image.attr("src").startsWith("data:image")) {

                // Local file upload

                const fileData = $("#file-container input[type=file]").first()[0]["files"];
                if (!fileData || fileData.length == 0) {
                    output.html("");
                    return;
                }

                const file = fileData[0];

                output.attr({
                    "data-size": file["size"] || "0",
                    "data-type": (file["type"] || "UNK").replace("image/", ""),
                    "data-year": file["lastModifiedDate"] ? new Date(file["lastModifiedDate"]).getFullYear() : -1,
                    "data-file": true,
                });
                refreshFileData();

                TagSuggester.trigger("update");

            } else {

                // Fallback - in case the loading of external data is disabled
                if (!this.fetchSettings("loadImageData")) {

                    output.attr({
                        "data-size": -1,
                        "data-type": "UNK",
                        "data-year": -1,
                        "data-file": false,
                    });
                    refreshFileData();
                    TagSuggester.trigger("update");
                    return;
                }

                // Remote file URL
                XM.Connect.xmlHttpRequest({
                    url: image.attr("src"),
                    method: "HEAD",
                    onload: (event) => {

                        const headerStrings = event.responseHeaders.split(/\r?\n/);
                        const data = {};
                        for (const header of headerStrings) {
                            const parts = header.split(": ");
                            if (parts.length < 2) continue;
                            data[parts[0]] = parts.slice(1).join(": ");
                        }
                        // console.log(data);

                        output.attr({
                            "data-size": data["content-length"] || "0",
                            "data-type": (data["content-type"] || "UNK").replace("image/", ""),
                            "data-year": data["last-modified"] ? new Date(data["last-modified"]).getFullYear() : -1,
                            "data-file": false,
                        });
                        refreshFileData();
                        TagSuggester.trigger("update");
                    }
                });

            }
        });

        image.trigger("load.resix");

        function refreshFileData(): void {
            output.html([
                `${output.attr("data-width")}×${output.attr("data-height")}`,
                output.attr("data-type") !== "UNK" ? `${output.attr("data-type").toUpperCase()}` : undefined,
                output.attr("data-size") !== "-1" ? `${Util.Size.format(output.attr("data-size"))}` : undefined
            ].filter(n => n).join("&emsp;"));
        }

    }

}
