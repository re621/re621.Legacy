import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { ThumbnailEnhancer } from "./ThumbnailsEnhancer";
import { Util } from "../../components/structure/Util";

declare const JSZip;

export class MassDownloader extends RE6Module {

    private showInterface = false;

    private selectButton: JQuery<HTMLElement>;
    private actButton: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.search);
    }

    public create(): void {

        /* Create Button */
        const $section = $("<section>")
            .attr("id", "downloader-box")
            .appendTo("aside#sidebar");
        $("<h1>").html("Mass Downloader").appendTo($section);

        this.selectButton = $("<a>")
            .html("Select")
            .addClass("button btn-neutral")
            .appendTo($section)
            .on("click", (event) => {
                event.preventDefault();
                this.toggleState();
            });

        this.actButton = $("<a>")
            .html("Download")
            .addClass("button btn-neutral")
            .css("display", "none")
            .appendTo($section)
            .on("click", (event) => {
                event.preventDefault();

                const queue = [];
                $("article.post-preview.download-item").each((index, element) => {
                    const $article = $(element);
                    queue.push(new Promise((resolve) => {
                        resolve({
                            name: $article.attr("data-id") + "." + $article.attr("data-file-ext"),
                            data: Util.getImageBlob($article.attr("data-large-file-url"))
                        });
                    }));
                });

                Promise.all(queue).then((data) => {
                    const zip = new JSZip();

                    data.forEach((value) => {
                        zip.file(value.name, value.data, { binary: true });
                    });

                    zip.generateAsync({ type: "base64" })
                        .then(function (base64) {
                            location.href = "data:application/zip;base64," + base64;
                        });
                });
            });
    }

    private toggleState(): void {
        this.showInterface = !this.showInterface;
        ModuleController.getWithType<ThumbnailEnhancer>(ThumbnailEnhancer).hideHoverZoom(this.showInterface);
        this.listenForClicks(this.showInterface);

        if (this.showInterface) {
            this.selectButton.html("Cancel");
            this.actButton.css("display", "");
        } else {
            this.selectButton.html("Select");
            this.actButton.css("display", "none");
        }
    }

    private listenForClicks(enabled = true): void {
        if (enabled) {
            $("div#posts-container")
                .attr("data-downloading", "true")
                .on("click.re621.mass-dowloader", "a.preview-box", (event) => {
                    event.preventDefault();
                    $(event.target).parents("article.post-preview").toggleClass("download-item");
                });
        } else {
            $("div#posts-container")
                .attr("data-downloading", "false")
                .off("click.re621.mass-dowloader");
        }
    }

}
