import { Post, ViewingPost } from "../../components/data/Post";
import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Util } from "../../components/structure/Util";
import { ModuleController } from "../../components/ModuleController";

/**
 * Add various symbols to the tilebar depending on the posts state
 */
export class PostViewer extends RE6Module {

    private post: ViewingPost;

    public constructor() {
        super(PageDefintion.post);
        this.registerHotkeys(
            { keys: "hotkeyUpvote", fnct: this.triggerUpvote },
            { keys: "hotkeyDownvote", fnct: this.triggerDownvote },
            { keys: "hotkeyFavorite", fnct: this.toggleFavorite },
            { keys: "hotkeyHideNotes", fnct: this.toggleNotes },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyUpvote: "w",
            hotkeyDownvote: "s",
            hotkeyFavorite: "f",
            hotkeyHideNotes: "o",

            autoOpenParentChild: true,
            upvoteOnFavorite: true,
            hideNotes: false,
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
            .appendTo($noteToggleCountainer)
            .html(this.fetchSettings("hideNotes") ? "Notes: Off" : "Notes: On")
            .on("click", (event) => {
                event.preventDefault();
                this.toggleNotes();
            });
        $("div#note-container")
            .css("display", "")
            .attr("data-hidden", this.fetchSettings("hideNotes"));

        // Move child/parent indicator, leave others as is, like marked for deleteion
        const $bottomNotices = $(".parent-children");
        $bottomNotices.insertAfter($("#search-box"));
        // Expand child/parent container
        const $parentRel = $("#has-parent-relationship-preview-link");
        const $childRel = $("#has-children-relationship-preview-link");

        const autoOpen = this.fetchSettings("autoOpenParentChild");
        // Only click on one container, because both open with one click. Clicking both results in them open and the closing
        if ($parentRel.length !== 0 && !$parentRel.is(":visible") && autoOpen) {
            $parentRel.click();
        } else if ($childRel.length !== 0 && !$childRel.is(":visible") && autoOpen) {
            $childRel.click();
        }
        // Remeber toggle state
        $parentRel.add($childRel).on("click", () => {
            this.pushSettings("autoOpenParentChild", !autoOpen);
        });

        this.registerHotkeys();
    }

    /** Emulates a click on the upvote button */
    private triggerUpvote(): void {
        Util.Danbooru.Post.vote(Post.getViewingPost().getId(), 1);
    }

    /** Emulates a click on the downvote button */
    private triggerDownvote(): void {
        Util.Danbooru.Post.vote(Post.getViewingPost().getId(), -1);
    }

    /** Toggles the favorite state */
    private toggleFavorite(): void {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) { $("button#add-fav-button")[0].click(); }
        else { $("button#remove-fav-button")[0].click(); }
    }

    /** Switches the notes container to its opposite state */
    private toggleNotes(): void {
        const module = ModuleController.get(PostViewer),
            hideNotes = module.fetchSettings("hideNotes");

        if (hideNotes) {
            $("div#note-container").attr("data-hidden", "false");
            $("a#image-note-button").html("Notes: ON");
        } else {
            $("div#note-container").attr("data-hidden", "true");
            $("a#image-note-button").html("Notes: OFF");
        }

        module.pushSettings("hideNotes", !hideNotes);
    }
}
