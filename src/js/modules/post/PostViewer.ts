import { Danbooru } from "../../components/api/Danbooru";
import { E621 } from "../../components/api/E621";
import { APISet } from "../../components/api/responses/APISet";
import { FavoriteCache } from "../../components/cache/FavoriteCache";
import { PageDefintion } from "../../components/data/Page";
import { Post, ViewingPost } from "../../components/data/Post";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class PostViewer extends RE6Module {

    private post: ViewingPost;

    public constructor() {
        super(PageDefintion.post, true);
        this.registerHotkeys(
            { keys: "hotkeyUpvote", fnct: this.triggerUpvote },
            { keys: "hotkeyDownvote", fnct: this.triggerDownvote },

            { keys: "hotkeyFavorite", fnct: this.toggleFavorite },
            { keys: "hotkeyAddFavorite", fnct: this.addFavorite },
            { keys: "hotkeyRemoveFavorite", fnct: this.removeFavorite },

            { keys: "hotkeyHideNotes", fnct: this.toggleNotes },
            { keys: "hotkeyNewNote", fnct: this.switchNewNote },

            { keys: "hotkeyAddSet", fnct: this.addSet },
            { keys: "hotkeyAddPool", fnct: this.addPool },

            { keys: "hotkeyToggleSetLatest", fnct: this.toggleSetLatest, },
            { keys: "hotkeyAddSetLatest", fnct: this.addSetLatest, },
            { keys: "hotkeyRemoveSetLatest", fnct: this.removeSetLatest, },

            { keys: "hotkeyAddSetCustom1", fnct: () => { this.addSetCustom("hotkeyAddSetCustom1_data"); } },
            { keys: "hotkeyAddSetCustom2", fnct: () => { this.addSetCustom("hotkeyAddSetCustom2_data"); } },
            { keys: "hotkeyAddSetCustom3", fnct: () => { this.addSetCustom("hotkeyAddSetCustom3_data"); } },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyUpvote: "w",          // vote up on the current post
            hotkeyDownvote: "s",        // vote down on the current post

            hotkeyFavorite: "f",        // toggle the favorite state of the post
            hotkeyAddFavorite: "",      // add current post to favorites
            hotkeyRemoveFavorite: "",   // remove current post from favorites

            hotkeyHideNotes: "o",       // toggle note visibility
            hotkeyNewNote: "p",         // add new note

            hotkeyAddSet: "",           // open the "add to set" dialogue
            hotkeyAddPool: "",          // open the "add to pool" dialogue

            hotkeyToggleSetLatest: "",  // toggles the current post's set
            hotkeyAddSetLatest: "",     // adds the current post to the last used set
            hotkeyRemoveSetLatest: "",  // removes the current post from the last used set

            hotkeyAddSetCustom1: "",
            hotkeyAddSetCustom1_data: "0",
            hotkeyAddSetCustom2: "",
            hotkeyAddSetCustom2_data: "0",
            hotkeyAddSetCustom3: "",
            hotkeyAddSetCustom3_data: "0",

            upvoteOnFavorite: true,     // add an upvote when adding the post to favorites
            hideNotes: false,           // should the notes be hidden by default
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        this.post = Post.getViewingPost();

        // Move the add to set / pool buttons
        const $addToContainer = $("<div>").attr("id", "image-add-links").insertAfter("div#image-download-link");
        $("li#add-to-set-list > a")
            .addClass("image-add-set")
            .addClass("button btn-neutral")
            .html("+ Set")
            .appendTo($addToContainer);
        $("li#add-to-pool-list > a")
            .addClass("image-add-pool")
            .addClass("button btn-neutral")
            .html("+ Pool")
            .appendTo($addToContainer);

        // Create the Note Toggle button
        const $noteToggleCountainer = $("<div>").attr("id", "image-toggle-notes").insertAfter("div#image-add-links");
        $("<a>")
            .attr({
                "id": "image-note-button",
                "href": "#",
            })
            .addClass("button btn-neutral")
            .html(this.fetchSettings("hideNotes") ? "Notes: Off" : "Notes: On")
            .appendTo($noteToggleCountainer)
            .on("click", (event) => {
                event.preventDefault();
                this.toggleNotes();
            });
        $("#note-container")
            .css("display", "")
            .attr("data-hidden", this.fetchSettings("hideNotes"));

        // Move child/parent indicator, leave others as is, like marked for deleteion
        const $bottomNotices = $(".parent-children");
        $bottomNotices.insertAfter($("#search-box"));

        // Listen to favorites button click
        $("#add-fav-button").on("click", () => {
            if (this.fetchSettings("upvoteOnFavorite"))
                Danbooru.Post.vote(Post.getViewingPost().getId(), 1, true);

            FavoriteCache.add(this.post.getId());
        });

        $("#remove-fav-button").on("click", () => {
            FavoriteCache.remove(this.post.getId());
        });
    }

    /** Emulates a click on the upvote button */
    private triggerUpvote(): void {
        Danbooru.Post.vote(Post.getViewingPost().getId(), 1);
    }

    /** Emulates a click on the downvote button */
    private triggerDownvote(): void {
        Danbooru.Post.vote(Post.getViewingPost().getId(), -1);
    }

    /** Toggles the favorite state */
    private toggleFavorite(): void {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) { $("button#add-fav-button")[0].click(); }
        else { $("button#remove-fav-button")[0].click(); }
    }

    /** Adds the post to favorites, does not remove it */
    private addFavorite(): void {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) {
            $("button#add-fav-button")[0].click();
        }
    }

    /** Removes the post from favorites, does not add it */
    private removeFavorite(): void {
        if (!$("div.fav-buttons").hasClass("fav-buttons-false")) {
            $("button#remove-fav-button")[0].click();
        }
    }

    /** Switches the notes container to its opposite state */
    private async toggleNotes(): Promise<void> {
        const module = ModuleController.get(PostViewer),
            hideNotes = module.fetchSettings("hideNotes");

        if (hideNotes) {
            $("#note-container").attr("data-hidden", "false");
            $("a#image-note-button").html("Notes: ON");
        } else {
            $("#note-container").attr("data-hidden", "true");
            $("a#image-note-button").html("Notes: OFF");
        }

        await module.pushSettings("hideNotes", !hideNotes);
    }

    /** Toggles the note editing interface */
    private async switchNewNote(): Promise<void> {
        $("#note-container").attr("data-hidden", "false");
        $("a#image-note-button").html("Notes: ON");
        await ModuleController.get(PostViewer).pushSettings("hideNotes", false);

        Danbooru.Note.TranslationMode.toggle(new Event("re621.dummy-event"));
    }

    /** Opens the dialog to add the post to the set */
    private addSet(): void {
        $("a#set")[0].click();
    }

    /** Adds or removes the current post from the latest used set */
    private toggleSetLatest(): void {
        const lastSet = parseInt(window.localStorage.getItem("set"));
        if (!lastSet) {
            Danbooru.error(`Error: no set selected`);
            return;
        }

        PostViewer.toggleSetPost(lastSet, Post.getViewingPost().getId());
    }

    /** Adds the current post to the latest used set */
    private addSetLatest(): void {
        const lastSet = parseInt(window.localStorage.getItem("set"));
        if (!lastSet) {
            Danbooru.error(`Error: no set selected`);
            return;
        }

        PostViewer.addSetPost(lastSet, Post.getViewingPost().getId());
    }

    /** Removes the current post frp, the latest used set */
    private removeSetLatest(): void {
        const lastSet = parseInt(window.localStorage.getItem("set"));
        if (!lastSet) {
            Danbooru.error(`Error: no set selected`);
            return;
        }

        PostViewer.removeSetPost(lastSet, Post.getViewingPost().getId());
    }

    /** Adds the current post to the set defined in the config */
    private addSetCustom(dataKey: string): void {
        PostViewer.addSetPost(
            this.fetchSettings<number>(dataKey),
            Post.getViewingPost().getId()
        );
    }

    /** Opens the dialog to add the post to the pool */
    private addPool(): void {
        $("a#pool")[0].click();
    }

    /**
     * If the posts provided are present in the 
     * @param setID 
     * @param postID 
     */
    public static async toggleSetPost(setID: number, postID: number): Promise<boolean> {
        // Fetch set data to see if the post is present
        const setData = await E621.Set.id(setID).first<APISet>({}, 500);
        // console.log(setData);
        if (setData == null) {
            Danbooru.error(`Error: active set moved or deleted`);
            return Promise.resolve(false);
        }

        // If a post is present in the set, remove it. Otherwise, add it.
        if (setData.post_ids.includes(postID))
            PostViewer.removeSetPost(setID, postID);
        else PostViewer.addSetPost(setID, postID);
    }

    public static addSetPost(setID: number, postID: number): Promise<boolean> {
        return E621.SetAddPost.id(setID).post({ "post_ids[]": [postID] }, 500).then(
            (response) => {
                if (response[1] == 201) {
                    Danbooru.notice(PostViewer.getSuccessResponse(true, setID, response[0].name, response[0].post_count, postID));
                    return Promise.resolve(true);
                }

                Danbooru.error(PostViewer.getErrorResponse(true, response[1]));
                Danbooru.error(`Error occured while adding the post to set: ${response[1]}`);
                return Promise.resolve(false);
            },
            (error) => {
                Danbooru.error(PostViewer.getErrorResponse(true, error[1]));
                Danbooru.error(`Error occured while adding the post to set: ${error[1]}`);
                return Promise.resolve(false);
            }
        );
    }

    public static removeSetPost(setID: number, postID: number): Promise<boolean> {
        return E621.SetRemovePost.id(setID).post({ "post_ids[]": [postID] }, 500).then(
            (response) => {
                if (response[1] == 201) {
                    Danbooru.notice(PostViewer.getSuccessResponse(false, setID, response[0].name, response[0].post_count, postID));
                    return Promise.resolve(true);
                }

                Danbooru.error(PostViewer.getErrorResponse(false, response[1]));
                return Promise.resolve(false);
            },
            (error) => {
                Danbooru.error(PostViewer.getErrorResponse(false, error[1]));
                return Promise.resolve(false);
            }
        );

    }

    private static getSuccessResponse(added: boolean, setID: number, setName: string, setTotal: number, post: number): string {
        return `<a href="/post_sets/${setID}">${setName}</a>: post <a href="/posts/${post}">#${post}</a> ${added ? "added" : "removed"} (${setTotal} total)`
    }

    private static getErrorResponse(added: boolean, message: string): string {
        return `Error occured while ${added ? "adding the post to" : "removing the post from"} set: ${message}`;
    }

}
