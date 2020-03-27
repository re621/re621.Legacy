import { RE6Module } from "../../components/RE6Module";
import { Post } from "../../components/data/Post";
import { Form } from "../../components/structure/Form";
import { PageDefintion } from "../../components/data/Page";

const IMAGE_SIZES = [
    { value: "sample", name: "Sample" },
    { value: "fit-vertical", name: "Fit Vertically" },
    { value: "fit-horizontal", name: "Fit Horizontally" },
    { value: "original", name: "Original" },
];

/**
 * Handles scaling post images in an intelligent way
 */
export class ImageScaler extends RE6Module {

    private static instance: ImageScaler = new ImageScaler();

    private post: Post;
    private image: JQuery<HTMLElement>;

    private resizeSelector: Form;

    constructor() {
        super(PageDefintion.post);
        this.registerHotkeys(
            { keys: ["hotkey_scale"], fnct: this.cycleScaling }
        );
        if (!this.eval()) { return; }

        this.post = Post.getViewingPost();
        this.image = $("img#image");
        this.createDOM();

        this.resizeSelector.getInputList().get("scale").change(event => {
            let size = $(event.target).val() + "";
            this.setImageSize(size);
            this.pushSettings("size", size)
        });

        this.registerHotkeys();
    }

    /**
     * Returns a singleton instance of the class
     * @returns BlacklistToggler instance
     */
    public static getInstance() {
        if (this.instance === undefined) this.instance = new ImageScaler();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        let def_settings = {
            size: "sample",
            hotkey_scale: "v",
        };
        return def_settings;
    }

    /** Loops through scaling options */
    private cycleScaling() {
        let $next = $("#resize-image-scale option:selected").next();
        if ($next.length > 0) {
            $("#resize-image-scale").val($next.val()).change();
        } else {
            $("#resize-image-scale").val($("#resize-image-scale option").first().val()).change();
        }
    }

    /**
     * Builds basic structure for the module
     */
    private createDOM() {
        let resizeButtonContainer = $("#image-resize-cycle").empty();
        this.setImageSize(this.fetchSettings("size"));

        this.resizeSelector = new Form(
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
                    value: `<a href="` + this.post.getImageURL() + `" id="fullsize-image">Fullscreen</a>`,
                }
            ]
        )

        resizeButtonContainer.append(this.resizeSelector.get());
    }

    /**
     * Set the page image to the specified size
     * @param size sample, fit-gorizontal, fit-vertical, or original
     */
    private setImageSize(size: string) {
        this.image.removeClass();
        this.image.parent().addClass("loading");

        switch (size) {
            case ("sample"): {
                this.image.attr("src", this.post.getSampleURL());
                break;
            }
            case ("fit-vertical"): {
                this.image.addClass("re621-fit-vertical")
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

        this.image.on("load", () => {
            this.image.resize();
            this.image.parent().removeClass("loading");
        });
    }

}
