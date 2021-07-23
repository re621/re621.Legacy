import { E621 } from "../../components/api/E621";
import { APIIQDBResponse } from "../../components/api/responses/APIIQDBResponse";
import { APIPost, PostFlag } from "../../components/api/responses/APIPost";
import { XM } from "../../components/api/XM";
import { PageDefinition } from "../../components/data/Page";
import { PostData } from "../../components/post/Post";
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
            cleanSourceLinks: true,     // convert linkst to https and remove the www
            loadImageData: false,       // load image headers to get extra data
            fixPixivPreviews: false,    // load pixiv previews manually

            stopLeaveWarning: false,    // removes the beforeunload warning
        };
    }

    public create(): void {
        super.create();

        // This form's structure is the absolute worst
        // There is not a single ID, or even a unique class

        // Check for duplicates and add reverse image search links
        if (this.fetchSettings("checkDuplicates")) this.handleDuplicateCheck();

        // Add clickable links to sources
        if (this.fetchSettings("addSourceLinks")) {
            this.handleSourceEnhancements();
            const noSourceCheckbox = $("#no_source").on("change", () => {
                if (noSourceCheckbox.prop("checked")) return;
                this.handleSourceEnhancements();
            });
        }

        // Load extra data from the image's header
        this.handleImageData();

        // Add a class to the "Submit" button
        $("button:contains('Upload')").addClass("submit-upload");

        // Remove the warning before leaving the page
        if (this.fetchSettings("stopLeaveWarning")) {
            XM.Window.onbeforeunload = null;
        }

        // Add a preview image to the parent ID input
        this.handleParentIDPreview();

        // Make sure the pixiv previews load in properly
        if (this.fetchSettings("fixPixivPreviews"))
            this.handlePixivPreviews();
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

        let timer: number = null;
        $(fileContainer).on("input paste", "input", async (event) => {
            clearTimeout(timer);
            timer = setTimeout(() => handleInput(event), 500);
        });

        fileContainer.find("input[type=text").trigger("input");

        /** Handles the image URL input changes */
        function handleInput(event: JQuery.TriggeredEvent): void {
            const $input = $(event.target),
                value = $input.val() + "";

            // Input is empty
            if (value == "") {
                dupesContainer.html("");
                risContainer.html("");
                return;
            }

            // Input is not a URL
            try { new URL(value); }
            catch {
                dupesContainer.html(`<span class="fullspan">Unable to parse image path. <a href="/iqdb_queries" target="_blank" rel="noopener noreferrer">Check manually</a>?</span>`);
                risContainer.html("");
                return;
            }

            dupesContainer.html(`<span class="fullspan">Checking for duplicates . . .</span>`);;

            E621.IQDBQueries.get<APIIQDBResponse>({ "url": encodeURI(value) }).then(
                (response) => {
                    // console.log(response);
                    dupesContainer.html("");

                    // Sometimes, an empty response is just an empty array
                    // More often than not, it's an array with one malformed object
                    if (response.length == 0 || (response[0] !== undefined && response[0].post_id == undefined))
                        return;

                    $("<h3>")
                        .html(`<a href="/iqdb_queries?url=${encodeURI(value)}" target="_blank" rel="noopener noreferrer">Duplicates Found:</a> ${response.length}`)
                        .appendTo(dupesContainer);

                    for (const entry of response)
                        makePostThumbnail(entry).appendTo(dupesContainer);
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
                }
            );

            risContainer.html(`
                <a href="/iqdb_queries?url=${encodeURI(value)}" target="_blank" rel="noopener noreferrer">e621</a>
                <a href="https://www.google.com/searchbyimage?image_url=${encodeURI(value)}" target="_blank" rel="noopener noreferrer">Google</a>
                <a href="https://saucenao.com/search.php?url=${encodeURI(value)}" target="_blank" rel="noopener noreferrer">SauceNAO</a>
                <a href="https://derpibooru.org/search/reverse?url=${encodeURI(value)}" target="_blank" rel="noopener noreferrer">Derpibooru</a>
                <a href="https://kheina.com/?url=${encodeURI(value)}" target="_blank" rel="noopener noreferrer">Kheina</a>
            `);
        }

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
                    rel: "noopener noreferrer",
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
        $(sourceContainer).on("input re621:input", "input.upload-source-input", (event) => {
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
                $input.trigger("re621:input"); // This is stupid, but it works
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

        const output = $("#preview-sidebar div.upload_preview_dims").first()
            .on("re621:update", () => {
                output.html([
                    output.attr("data-width") == "-1" ? "0×0" : `${output.attr("data-width")}×${output.attr("data-height")}`,
                    output.attr("data-type") !== "UNK" ? `${output.attr("data-type").toUpperCase()}` : undefined,
                    output.attr("data-size") !== "-1" ? `${Util.Size.format(output.attr("data-size"))}` : undefined
                ].filter(n => n).join("&emsp;"));
            });
        const image = $("#preview-sidebar img.upload_preview_img").first();

        // WEBM files send two error messages
        // This is here so that the second one can get ignored
        let prevRequest = "";
        let prevData = {};

        // Listening for image load (or failing to load) is better,
        // since that guarantees that the image dimensions are accessible.
        image.on("load.resix error.resix", (event) => {

            // Reset the output attributes
            output.attr({
                "data-width": event.type == "error" ? -1 : $(image).prop("naturalWidth"),
                "data-height": event.type == "error" ? -1 : $(image).prop("naturalHeight"),
                "data-size": "0",
                "data-type": "unk",
                "data-year": -1,
                "data-file": false,
            });

            // Debug.log("loading", image.attr("src"));
            const fileInput = $("#file-container input[type=file]").first(),
                urlInput = $("#file-container input[type=text]").first();

            if (fileInput.length > 0 && urlInput.length > 0) return;    // Form is reset
            else if (fileInput.length > 0) {                            // Local file upload

                const fileData = fileInput[0]["files"];
                if (!fileData || fileData.length == 0) {
                    output.html("");
                    return;
                }

                const file = fileData[0];

                output.attr({
                    "data-size": file["size"] || "0",
                    "data-type": (file["type"] || "UNK").replace(/(image\/|video\/|\/plain)/g, "").replace("application/x-shockwave-flash", "swf"),
                    "data-year": file["lastModifiedDate"] ? new Date(file["lastModifiedDate"]).getFullYear() : -1,
                    "data-file": true,
                });

                prevRequest = "";
                output.trigger("re621:update");
                TagSuggester.trigger("update");

            } else if (urlInput.length > 0) {                           // Remote file URL

                // Fallback - in case the loading of external data is disabled
                if (!this.fetchSettings("loadImageData")) {

                    output.attr({
                        "data-size": -1,
                        "data-type": "UNK",
                        "data-year": -1,
                        "data-file": false,
                    });

                    prevRequest = "";
                    output.trigger("re621:update");
                    TagSuggester.trigger("update");
                    return;
                }

                const curRequest = (urlInput.val() + "").trim();
                console.log("attempting", prevRequest == curRequest);
                if (curRequest == prevRequest) {
                    output.attr(prevData);
                    output.trigger("re621:update");
                    TagSuggester.trigger("update");
                    return;
                }
                prevRequest = curRequest;

                const requestURL = urlInput.val() + "";
                XM.Connect.xmlHttpRequest({
                    url: requestURL,
                    method: "HEAD",
                    headers: {
                        referer: requestURL.includes("i.pximg.net") ? "https://www.pixiv.net/" : window.location.href,
                    },
                    onload: (event) => {

                        const headerStrings = event.responseHeaders.split(/\r?\n/);
                        const data = {};
                        for (const header of headerStrings) {
                            const parts = header.split(": ");
                            if (parts.length < 2) continue;
                            data[parts[0]] = parts.slice(1).join(": ");
                        }
                        console.log(data);

                        output.attr({
                            "data-size": data["content-length"] || "0",
                            "data-type": (data["content-type"] || "UNK").replace(/(image\/|video\/|\/plain)/g, "").replace("application/x-shockwave-flash", "swf"),
                            "data-year": data["last-modified"] ? new Date(data["last-modified"]).getFullYear() : -1,
                            "data-file": false,
                        });
                        prevData = {
                            "data-width": output.attr("data-width"),
                            "data-height": output.attr("data-height"),
                            "data-size": output.attr("data-size"),
                            "data-type": output.attr("data-type"),
                            "data-year": output.attr("data-year"),
                            "data-file": false,
                        }

                        output.trigger("re621:update");
                        TagSuggester.trigger("update");
                    }
                });

            }
        });

        image.trigger("load.resix");

    }

    /** Add a preview image to the parent ID field */
    private handleParentIDPreview(): void {
        const input = $(`input[placeholder="Ex. 12345"]`);
        if (input.length == 0) return;

        const preview = $("<a>")
            .attr({
                target: "_blank",
                rel: "noopener noreferrer",
                id: "upload-parent-preview",
            })
            .addClass("display-none-important")
            .insertAfter(input);

        const image = $("<img>")
            .attr({
                src: "/images/deleted-preview.png"
            })
            .appendTo(preview);

        let timer: number;
        input.on("input paste", () => {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(async () => {
                const search = parseInt(input.val() + "");
                if (!search) {
                    preview.addClass("display-none-important");
                    return;
                }

                const lookup = await E621.Posts.first<APIPost>({ tags: "id:" + search }, 500);
                console.log(lookup);
                if (!lookup) {
                    preview.addClass("display-none-important");
                    return;
                }

                const post = PostData.fromAPI(lookup);
                preview
                    .attr("href", "/posts/" + post.id)
                    .removeClass("display-none-important");
                image.attr("src", post.flags.has(PostFlag.Deleted) ? "/images/deleted-preview.png" : post.file.preview);

            }, 500);
        })
    }

    /** Fixes an issue with Pixiv previews not loading properly */
    private handlePixivPreviews(): void {
        const fileContainer = UploadUtilities.findSection("post_file", "section-file")
            .find("div.col2").first()
            .attr("id", "file-container");

        const output = $("#preview-sidebar div.upload_preview_dims").first();
        const image = $("#preview-sidebar img.upload_preview_img").first();

        let timer: number = null;
        $(fileContainer).on("input paste", "input", async (event) => {
            clearTimeout(timer);
            timer = setTimeout(() => processInput(event), 200);
        });

        // Process the input URL
        // Should only be executed once the user pastes/stops typing
        function processInput(event: JQuery.TriggeredEvent): void {

            // Get input value
            const $input = $(event.target),
                value = $input.val() + "";

            // Only applies to pixiv files
            if (!value.includes("i.pximg.net")) return;

            // Test for valid URL
            try { new URL(value); }
            catch { return; }

            image.attr("src", Util.DOM.getLoadingImage());

            // Fetch the image directly
            XM.Connect.xmlHttpRequest({
                url: value,
                method: "GET",
                responseType: "blob",
                headers: {
                    referer: "https://www.pixiv.net/",
                },
                onload: (event) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(event.response);
                    reader.onloadend = (): void => {
                        const base64data = reader.result;
                        image
                            .attr("src", base64data + "")
                            .one("load", () => {
                                const width = image.prop("naturalWidth"),
                                    height = image.prop("naturalHeight");
                                output
                                    .attr("data-width", width)
                                    .attr("data-height", height)
                                    .trigger("re621:update");
                            });
                    }

                    TagSuggester.trigger("update");
                }
            });
        }
    }

}
