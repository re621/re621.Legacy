import { E621 } from "../api/E621";
import { APISet } from "../api/responses/APISet";

/** Collection of API calls related to individual posts */
export class PostActions {

    /**
     * If the post is present in the set, removes it. Otherwise, adds it.  
     * This method is slower than the individual addSet and removeSet ones because of an extra API call.  
     * @param setID ID of the set to add to / remove from
     * @param postID ID of the post
     */
    public static async toggleSet(setID: number, postID: number): Promise<boolean> {
        // Fetch set data to see if the post is present
        const setData = await E621.Set.id(setID).first<APISet>({}, 500);
        // console.log(setData);
        if (setData == null) {
            Danbooru.error(`Error: active set moved or deleted`);
            return Promise.resolve(false);
        }

        // If a post is present in the set, remove it. Otherwise, add it.
        if (setData.post_ids.includes(postID))
            PostActions.removeSet(setID, postID);
        else PostActions.addSet(setID, postID);
    }

    /**
     * Adds the post to the specified set.  
     * Does not check if the post is already present in the set
     * @param setID ID of the set to add to
     * @param postID ID of the post
     */
    public static addSet(setID: number, postID: number): Promise<boolean> {
        return E621.SetAddPost.id(setID).post({ "post_ids[]": [postID] }, 500).then(
            (response) => {
                if (response[1] == 201) {
                    Danbooru.notice(`<a href="/post_sets/${setID}">${response[0].name}</a>: post <a href="/posts/${postID}">#${postID}</a> added (${response[0].post_count} total)`);
                    return Promise.resolve(true);
                }

                Danbooru.error(`Error occured while adding the post to set: ${response[1]}`)
                return Promise.resolve(false);
            },
            (response) => {
                Danbooru.error(`Error occured while adding the post to set: ${response[1]}`)
                return Promise.resolve(false);
            }
        );
    }

    /**
     * Removes the post from the specified set.
     * Does not check if the post is present in the set.
     * @param setID ID of the set to remove from
     * @param postID ID of the post
     */
    public static removeSet(setID: number, postID: number): Promise<boolean> {
        return E621.SetRemovePost.id(setID).post({ "post_ids[]": [postID] }, 500).then(
            (response) => {
                if (response[1] == 201) {
                    Danbooru.notice(`<a href="/post_sets/${setID}">${response[0].name}</a>: post <a href="/posts/${postID}">#${postID}</a> removed (${response[0].post_count} total)`);
                    return Promise.resolve(true);
                }

                Danbooru.error(`Error occured while removing the post from set: ${response[1]}`)
                return Promise.resolve(false);
            },
            (response) => {
                Danbooru.error(`Error occured while removing the post from set: ${response[1]}`)
                return Promise.resolve(false);
            }
        );

    }

}
