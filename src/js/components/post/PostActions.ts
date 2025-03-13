import { E621 } from "../api/E621";
import { APISet } from "../api/responses/APISet";
import { Debug } from "../utility/Debug";

/** Collection of API calls related to individual posts */
export class PostActions {

    /**
     * If the post is present in the set, removes it. Otherwise, adds it.
     * This method is slower than the individual addSet and removeSet ones because of an extra API call.
     * @param setID ID of the set to add to / remove from
     * @param postID ID of the post
     */
    public static async toggleSet (setID: number, postID: number): Promise<boolean> {
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
    public static addSet (setID: number, postID: number): Promise<boolean> {
        return E621.SetAddPost.id(setID).post({ "post_ids[]": [postID] }, 500).then(
            (response) => {
                if (response[1] == 201) {
                    Danbooru.notice(`<a href="/post_sets/${setID}">${response[0].name}</a>: post <a href="/posts/${postID}">#${postID}</a> added (${response[0].post_count} total)`);
                    return Promise.resolve(true);
                }

                Danbooru.error(`Error occurred while adding the post to set: ${response[1]}`);
                return Promise.resolve(false);
            },
            (response) => {
                Danbooru.error(`Error occurred while adding the post to set: ${response[1]}`);
                return Promise.resolve(false);
            },
        );
    }

    /**
     * Removes the post from the specified set.
     * Does not check if the post is present in the set.
     * @param setID ID of the set to remove from
     * @param postID ID of the post
     */
    public static removeSet (setID: number, postID: number): Promise<boolean> {
        return E621.SetRemovePost.id(setID).post({ "post_ids[]": [postID] }, 500).then(
            (response) => {
                if (response[1] == 201) {
                    Danbooru.notice(`<a href="/post_sets/${setID}">${response[0].name}</a>: post <a href="/posts/${postID}">#${postID}</a> removed (${response[0].post_count} total)`);
                    return Promise.resolve(true);
                }

                Danbooru.error(`Error occurred while removing the post from set: ${response[1]}`);
                return Promise.resolve(false);
            },
            (response) => {
                Danbooru.error(`Error occurred while removing the post from set: ${response[1]}`);
                return Promise.resolve(false);
            },
        );
    }

    /**
     * Records a vote for the specified post
     * @param postID Post ID
     * @param score -1 to downvote, 1 to upvote, 0 to remove the vote
     * @param preventUnvote If true, voting will fail if a vote of the same type (-1 / 1) already exits
     */
    public static vote (postID: number, score: number, preventUnvote = false): Promise<VoteResponse> {
        return new Promise((resolve) => {
            E621.PostVotes.id(postID).post({ score: score, no_unvote: preventUnvote }).then(
                (success) => {
                    Debug.log(success);
                    resolve({
                        success: true,
                        action: success[0].our_score,
                        score: success[0].score,
                        up: success[0].up,
                        down: success[0].down,
                    });
                },
                (error) => {
                    console.log(error);
                    resolve({ success: false });
                },
            );
        });
    }

    /**
     * Adds the specified post to favorites
     * @param postID Post ID
     * @returns True if the operation was successful, false otherwise
     */
    public static addFavorite (postID: number): Promise<boolean> {
        return new Promise((resolve) => {
            E621.Favorites.post({ "post_id": postID }).then(
                (response) => { Debug.log(response); resolve(true); },
                (error) => { console.log(error); resolve(false); },
            );
        });
    }

    /**
     * Removes the specified post from favorites
     * @param postID Post ID
     * @returns True if the operation was successful, false otherwise
     */
    public static removeFavorite (postID: number): Promise<boolean> {
        return new Promise((resolve) => {
            E621.Favorite.id(postID).delete().then(
                (response) => { Debug.log(response); resolve(true); },
                (error) => { console.log(error); resolve(false); },
            );
        });
    }

}

interface VoteResponse {
    /** If false, an error has occurred, and the rest of the values do not exist */
    success: boolean;
    /** -1 for downvote, 1 for upvote, 0 for unvote */
    action?: -1 | 0 | 1;
    /** Final score of the post */
    score?: number;
    /** Total number of upvotes */
    up?: number;
    /** Total number of downvotes */
    down?: number;
}
