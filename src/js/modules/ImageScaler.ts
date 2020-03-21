import { RE6Module } from "../components/RE6Module";
import { Post } from "../components/Post";
import { Form } from "../utilities/Form";

const IMAGE_SIZES = [
    { value: "sample", name: "Sample" },
    { value: "fit-horizontal", name: "Fit Horizontally" },
    { value: "fit-vertically", name: "Fit Vertically" },
    { value: "original", name: "Original" },
];

/**
 * Handles scaling post images in an intelligent way
 */
export class ImageScaler extends RE6Module {

    private static instance: ImageScaler = new ImageScaler();

    constructor() {
        super();

        const post = Post.getViewingPost();
        if (post === undefined) { return; }

        this.createDOM();
    }

    private createDOM() {
        let resizeButtonContainer = $("#image-resize-cycle").html("");

        let resizeSelector = new Form(
            {
                id: "resize-image",
                parent: "#image-resize-cycle",
                columns: 2,
            },
            [
                {
                    id: "size",
                    type: "select",
                    select: IMAGE_SIZES,
                    value: "sample",
                }
            ]
        )

        resizeButtonContainer.append(resizeSelector.get());
    }

    /**
     * Returns a singleton instance of the class
     * @returns BlacklistToggler instance
     */
    public static getInstance() {
        if (this.instance === undefined) this.instance = new ImageScaler();
        return this.instance;
    }

}
