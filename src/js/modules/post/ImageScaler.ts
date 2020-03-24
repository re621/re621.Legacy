import { RE6Module } from "../../components/RE6Module";
import { Post } from "../../components/data/Post";
import { Form } from "../../components/structure/Form";
import { PageDefintion } from "../../components/data/Page";
import { HotkeyCustomizer } from "../general/HotkeyCustomizer";

const IMAGE_SIZES = [
    { value: "sample", name: "Sample" },
    { value: "fit-horizontal", name: "Fit Horizontally" },
    { value: "fit-vertical", name: "Fit Vertically" },
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
        if (!this.eval()) return;

        let _self = this;
        this.post = Post.getViewingPost();
        this.image = $("img#image");
        this.createDOM();

        this.resizeSelector.getInputList().get("scale").change(function (event) {
            let size = $(event.target).val() + "";
            _self.setImageSize(size);
            _self.pushSettings("size", size)
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

    /** Registers the module's hotkeys */
    public registerHotkeys() {
        HotkeyCustomizer.register(this.fetchSettings("hotkey_scale"), function () {
            console.log("scaling");
        });
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
                    select: IMAGE_SIZES,
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
        this.image.removeClass().attr("src", this.post.getImageURL());

        switch (size) {
            case ("sample"): {
                this.image
                    .removeClass()
                    .attr("src", this.post.getSampleURL());
                break;
            }
            case ("fit-horizontal"): {
                this.image
                    .removeClass()
                    .addClass("re621-fit-horizontal")
                    .attr("src", this.post.getImageURL());
                break;
            }
            case ("fit-vertical"): {
                this.image
                    .removeClass()
                    .addClass("re621-fit-vertical")
                    .attr("src", this.post.getImageURL());
                break;
            }
            case ("original"): {
                this.image
                    .removeClass()
                    .attr("src", this.post.getImageURL());
                break;
            }
        }
    }

}
