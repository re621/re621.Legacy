import { RE6Module } from "../components/RE6Module";
import { Post } from "../components/Post";

/**
 * Handles scaling post images in an intelligent way
 */
export class ImageScaler extends RE6Module {

    private static instance: ImageScaler = new ImageScaler();

    constructor() {
        super();

        const post = Post.getViewingPost();
        if (post === undefined) { return; }

        console.log(post.getImageURL());
    }

    private createDOM() {

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
