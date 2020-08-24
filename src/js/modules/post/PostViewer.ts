import { Danbooru } from "../../components/api/Danbooru";
import { PageDefintion } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post } from "../../components/post/Post";
import { PostActions } from "../../components/post/PostActions";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class PostViewer extends RE6Module {

    private post: Post;

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

            moveChildThumbs: true,      // Moves the parent/child post thumbnails to under the searchbar
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        this.post = Post.getViewingPost()

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
        if (this.fetchSettings("moveChildThumbs"))
            $(".parent-children")
                .addClass("children-moved")
                .insertAfter($("#search-box"));

        // Bolden the tags
        this.toggleBoldenedTags(this.fetchSettings<boolean>("boldenTags"));

        // Listen to favorites button click
        $("#add-fav-button").on("click", () => {
            if (this.fetchSettings("upvoteOnFavorite"))
                Danbooru.Post.vote(this.post.id, 1, true);
        });
    }

    /** Emulates a click on the upvote button */
    private triggerUpvote(): void {
        Danbooru.Post.vote(Post.getViewingPost().id, 1);
    }

    /** Emulates a click on the downvote button */
    private triggerDownvote(): void {
        Danbooru.Post.vote(Post.getViewingPost().id, -1);
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

        Danbooru.Note.TranslationMode.toggle();
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

        PostActions.toggleSet(lastSet, Post.getViewingPost().id);
    }

    /** Adds the current post to the latest used set */
    private addSetLatest(): void {
        const lastSet = parseInt(window.localStorage.getItem("set"));
        if (!lastSet) {
            Danbooru.error(`Error: no set selected`);
            return;
        }

        PostActions.addSet(lastSet, Post.getViewingPost().id);
    }

    /** Removes the current post frp, the latest used set */
    private removeSetLatest(): void {
        const lastSet = parseInt(window.localStorage.getItem("set"));
        if (!lastSet) {
            Danbooru.error(`Error: no set selected`);
            return;
        }

        PostActions.removeSet(lastSet, Post.getViewingPost().id);
    }

    /** Adds the current post to the set defined in the config */
    private addSetCustom(dataKey: string): void {
        PostActions.addSet(
            this.fetchSettings<number>(dataKey),
            Post.getViewingPost().id
        );
    }

    /** Opens the dialog to add the post to the pool */
    private addPool(): void {
        $("a#pool")[0].click();
    }

}
