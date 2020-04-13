import { RE6Module, Settings } from "../../components/RE6Module";
import { Post } from "../../components/data/Post";
import { Form } from "../../components/structure/Form";
import { PageDefintion } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Danbooru } from "../../components/api/Danbooru";

const IMAGE_SIZES = [
    { value: "sample", name: "Sample" },
    { value: "fit-vertical", name: "Fill Screen" },
    { value: "fit-horizontal", name: "Fit Horizontally" },
    { value: "original", name: "Original" },
];

/**
 * Handles scaling post images in an intelligent way
 */
export class ImageScaler extends RE6Module {

    private post: Post;
    private image: JQuery<HTMLElement>;

    private resizeSelector: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.post);
        this.registerHotkeys(
            { keys: "hotkeyScale", fnct: () => { this.setScale(); } }
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyScale: "v|0",
            clickScale: true,

            size: "fit-vertical",
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        if (!this.canInitialize()) return;
        super.create();

        this.post = Post.getViewingPost();
        this.image = $("img#image");

        const resizeButtonContainer = $("#image-resize-cycle").empty();
        this.setImageSize(this.fetchSettings("size"));

        const resizeForm = new Form(
            {
                id: "resize-image",
                parent: "#image-resize-cycle",
                columns: 2,
            },
            [
                {
                    id: "scale",
                    type: "select",
                    data: IMAGE_SIZES,
                    value: this.fetchSettings("size"),
                },
                {
                    id: "fullsize",
                    type: "div",
                    value: `<a href="` + this.post.getImageURL() + `" class="button btn-neutral" id="fullsize-image">Fullscreen</a>`,
                }
            ]
        );

        resizeButtonContainer.append(resizeForm.get());
        this.resizeSelector = resizeForm.getInputList().get("scale");

        this.resizeSelector.change((event, save) => {
            const size = $(event.target).val() + "";
            this.setImageSize(size);
            if (save !== false) this.pushSettings("size", size);
        });

        this.image.click(() => {
            if (!this.fetchSettings("clickScale") || Danbooru.Note.TranslationMode.active) return;
            this.setScale("", false);
        });

        this.registerHotkeys();
    }

    /**
     * Sets a new scale for the post image
     * @param size New size. If none specified, cycles to the next in the list
     * @param save Set to false to prevent saving the scale to settings
     */
    private setScale(size = "", save = true): void {
        const selector = ModuleController.getWithType<ImageScaler>(ImageScaler).resizeSelector;
        if (size === "") {
            const $next = selector.find("option:selected").next();
            if ($next.length > 0) { size = $next.val() + ""; }
            else { size = selector.find("option").first().val() + ""; }
        }

        selector.val(size).trigger("change", save);
    }

    /**
     * Set the page image to the specified size
     * @param size sample, fit-gorizontal, fit-vertical, or original
     */
    private setImageSize(size: string): void {
        this.image.removeClass();
        this.image.parent().addClass("loading");

        this.image.on("load", () => {
            Danbooru.Note.Box.scale_all();
            this.image.parent().removeClass("loading");
        });

        switch (size) {
            case ("sample"): {
                this.image.attr("src", this.post.getSampleURL());
                break;
            }
            case ("fit-vertical"): {
                this.image.addClass("re621-fit-vertical");
                if (this.image.attr("src") !== this.post.getImageURL()) {
                    this.image.attr("src", this.post.getImageURL());
                } else { this.image.parent().removeClass("loading"); }
                break;
            }
            case ("fit-horizontal"): {
                this.image.addClass("re621-fit-horizontal");
                if (this.image.attr("src") !== this.post.getImageURL()) {
                    this.image.attr("src", this.post.getImageURL());
                } else { this.image.parent().removeClass("loading"); }
                break;
            }
            case ("original"): {
                if (this.image.attr("src") !== this.post.getImageURL()) {
                    this.image.attr("src", this.post.getImageURL());
                } else { this.image.parent().removeClass("loading"); }
                break;
            }
        }

        Danbooru.Note.Box.scale_all();
    }

}
