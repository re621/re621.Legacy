import { Danbooru } from "../../components/api/Danbooru";
import { E621 } from "../../components/api/E621";
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

            { keys: "hotkeyAddSetLatest", fnct: this.addSetLatest, },
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

            hotkeyAddSetLatest: "",     // add current post to the latest used set

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

    /** Adds the current post to the latest added set */
    private addSetLatest(): void {
        const lastSet = parseInt(window.localStorage.getItem("set"));
        if (!lastSet) return;

        E621.SetAddPost.id(lastSet).post({ "post_ids[]": [Post.getViewingPost().getId()] }).then(
            (response) => {
                if (response[1] == 201)
                    Danbooru.notice(`<a href="/post_sets/${response[0].id}">${response[0].name}</a>: Post Added (${response[0].post_count} total)`);
                else Danbooru.error(`Error occured while adding the post to set: ${response[1]}`);
            },
            (error) => {
                Danbooru.error(`Error occured while adding the post to set: ${error[1]}`);
            }
        );
    }

    /** Opens the dialog to add the post to the pool */
    private addPool(): void {
        $("a#pool")[0].click();
    }

}
