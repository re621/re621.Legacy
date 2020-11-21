import { Danbooru } from "../../components/api/Danbooru";
import { PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { Post } from "../../components/post/Post";
import { PostActions } from "../../components/post/PostActions";
import { RE6Module, Settings } from "../../components/RE6Module";
import { RISSizeLimit } from "../../components/utility/UtilSize";

/**
 * Add various symbols to the titlebar depending on the posts state
 */
export class PostViewer extends RE6Module {

    private post: Post;

    public constructor() {
        super(PageDefinition.post, true);
        this.registerHotkeys(
            { keys: "hotkeyUpvote", fnct: this.triggerUpvote },
            { keys: "hotkeyUpvoteNU", fnct: this.triggerUpvoteNU },
            { keys: "hotkeyDownvote", fnct: this.triggerDownvote },
            { keys: "hotkeyDownvoteNU", fnct: this.triggerDownvoteNU },

            { keys: "hotkeyFavorite", fnct: this.toggleFavorite },
            { keys: "hotkeyAddFavorite", fnct: this.addFavorite },
            { keys: "hotkeyRemoveFavorite", fnct: this.removeFavorite },

            { keys: "hotkeyHideNotes", fnct: () => { this.toggleNotes(); } },
            { keys: "hotkeyNewNote", fnct: this.switchNewNote },

            { keys: "hotkeyAddSet", fnct: this.addSet },
            { keys: "hotkeyAddPool", fnct: this.addPool },

            { keys: "hotkeyToggleSetLatest", fnct: this.toggleSetLatest, },
            { keys: "hotkeyAddSetLatest", fnct: this.addSetLatest, },
            { keys: "hotkeyRemoveSetLatest", fnct: this.removeSetLatest, },

            { keys: "hotkeyAddSetCustom1", fnct: () => { this.addSetCustom("hotkeyAddSetCustom1_data"); } },
            { keys: "hotkeyAddSetCustom2", fnct: () => { this.addSetCustom("hotkeyAddSetCustom2_data"); } },
            { keys: "hotkeyAddSetCustom3", fnct: () => { this.addSetCustom("hotkeyAddSetCustom3_data"); } },

            { keys: "hotkeyOpenHistory", fnct: this.openImageHistory, },
            { keys: "hotkeyOpenArtist", fnct: this.openArtist, },
            { keys: "hotkeyOpenSource", fnct: this.openSource, },
            { keys: "hotkeyOpenParent", fnct: this.openParent, },
            { keys: "hotkeyToggleRel", fnct: this.toggleRelSection, },
            { keys: "hotkeyOpenIQDB", fnct: this.openIQDB, },
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
            hotkeyUpvoteNU: "",         // vote up, don't unvote
            hotkeyDownvote: "s",        // vote down on the current post
            hotkeyDownvoteNU: "",       // vote down, don't unvote

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

            hotkeyOpenHistory: "",      // Opens the post history for the current image
            hotkeyOpenArtist: "",       // Opens the search page for the post's artist
            hotkeyOpenSource: "",       // Opens the first image source in a new tab
            hotkeyOpenParent: "",       // Opens the parent/child post, if there is one
            hotkeyToggleRel: "",        // Toggles the relationship section
            hotkeyOpenIQDB: "",         // Searches for similar posts

            upvoteOnFavorite: true,     // add an upvote when adding the post to favorites
            hideNotes: false,           // should the notes be hidden by default

            moveChildThumbs: true,      // Moves the parent/child post thumbnails to under the searchbar
            boldenTags: true,           // Restores the classic bold look on non-general tags
            betterImageSearch: true,    // Uses larger version of the image for reverse image searches
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
        const $noteToggleContainer = $("<div>").attr("id", "image-toggle-notes").insertAfter("div#image-add-links");
        $("<a>")
            .attr({
                "id": "image-note-button",
                "href": "#",
            })
            .addClass("button btn-neutral")
            .html(this.fetchSettings("hideNotes") ? "Notes: OFF" : "Notes: ON")
            .appendTo($noteToggleContainer)
            .on("click", (event) => {
                event.preventDefault();
                this.toggleNotes();
            });
        const $noteContainer = $("#note-container")
            .css("display", "")
            .attr("data-hidden", this.fetchSettings("hideNotes"));

        // Move the note preview to root
        $("#note-preview").insertBefore("#page");

        $("#translate")
            .appendTo("#image-toggle-notes")
            .addClass("button btn-neutral")
            .html("+ Note")
            .on("click", async () => {
                if (!await Danbooru.Note.TranslationMode.active()) return;
                if ($noteContainer.attr("data-hidden") == "true")
                    this.toggleNotes(false);
            });


        // Move child/parent indicator, leave others as is, like marked for deletion
        if (this.fetchSettings("moveChildThumbs"))
            $(".parent-children")
                .addClass("children-moved")
                .insertAfter($("#search-box"));

        // Bolden the tags
        this.toggleBoldenedTags(this.fetchSettings<boolean>("boldenTags"));

        // Listen to favorites button click
        $("#add-fav-button, #add-to-favorites").on("click", () => {
            if (!this.fetchSettings("upvoteOnFavorite")) return;
            Danbooru.Post.vote(this.post.id, 1, true);
        });

        // Fix reverse image search links
        // Google       20MB
        // SauceNAO     15MB
        // Derpibooru   20MB
        // Kheina        8MB    weakest link
        if ($("#post-related-images").length == 0) {
            $("<section>")
                .attr("id", "post-related-images")
                .html(`
                    <h1>Related</h1>
                    <ul>
                        <li><a href="/post_sets?post_id=${this.post.id}">Sets with this post</a></li>
                        <li><a href="/iqdb_queries?post_id=${this.post.id}">Visually similar on E6</a></li>
                    </ul>
                `)
                .insertAfter("#post-history")
        } else {
            const useSample = !this.fetchSettings("betterImageSearch");
            $("#post-related-images ul").html(`
                <li><a href="/post_sets?post_id=${this.post.id}">Sets with this post</a></li>
                <li><a href="/iqdb_queries?post_id=${this.post.id}">Visually similar on E6</a></li>
                <li><a href="https://www.google.com/searchbyimage?image_url=${this.getSourceLink(RISSizeLimit.Google, useSample)}" target="_blank">Reverse Google Search</a></li>
                <li><a href="https://saucenao.com/search.php?url=${this.getSourceLink(RISSizeLimit.SauceNAO, useSample)}" target="_blank">Reverse SauceNAO Search</a></li>
                <li><a href="https://inkbunny.net/search_process.php?text=${this.post.file.md5}&md5=yes" target="_blank">Inkbunny MD5 Search</a></li>
                <li><a href="https://derpibooru.org/search/reverse?url=${this.getSourceLink(RISSizeLimit.Derpibooru, useSample)}" target="_blank">Reverse Derpibooru Search</a></li>
                <li><a href="https://kheina.com/?url=${this.getSourceLink(RISSizeLimit.Kheina, useSample)}" target="_blank">Reverse Kheina Search</a></li>
            `);
        }
    }

    private getSourceLink(limit: RISSizeLimit, useSample: boolean): string {
        console.log(limit.toString());
        return (useSample || !limit.test(this.post))
            ? this.post.file.sample
            : this.post.file.original;
    }

    /** Toggles the boldened look on sidebar tags */
    public toggleBoldenedTags(state = true): void {
        $("#tag-list").toggleClass("tags-boldened", state);
    }

    /** Emulates a click on the upvote button */
    private triggerUpvote(): void {
        Danbooru.Post.vote(Post.getViewingPost().id, 1);
    }

    /** Same as above, but does not unvote */
    private triggerUpvoteNU(): void {
        const id = Post.getViewingPost().id;
        PostActions.vote(id, 1, true).then((response) => {
            if (!response.success) {
                Danbooru.error("An error occurred while processing votes");
                return;
            }

            $("span.post-vote-up-" + id)
                .removeClass("score-neutral")
                .addClass("score-positive");
            $("span.post-vote-down-" + id)
                .removeClass("score-negative")
                .addClass("score-neutral");

            $("span.post-score-" + id)
                .removeClass("score-positive score-negative score-neutral")
                .addClass(PostViewer.getScoreClass(response.score))
                .attr("title", response.up + " up / " + response.down + " down")
                .html(response.score + "")
            if (response.score > 0) Danbooru.notice("Post Score Updated");
        });
    }

    /** Emulates a click on the downvote button */
    private triggerDownvote(): void {
        Danbooru.Post.vote(Post.getViewingPost().id, -1);
    }

    /** Same as above, but does not unvote */
    private triggerDownvoteNU(): void {
        const id = Post.getViewingPost().id;
        PostActions.vote(id, -1, true).then((response) => {
            if (!response.success) {
                Danbooru.error("An error occurred while processing votes");
                return;
            }

            $("span.post-vote-down-" + id)
                .addClass("score-negative")
                .removeClass("score-neutral");
            $("span.post-vote-up-" + id)
                .removeClass("score-positive")
                .addClass("score-neutral");

            $("span.post-score-" + id)
                .removeClass("score-positive score-negative score-neutral")
                .addClass(PostViewer.getScoreClass(response.score))
                .attr("title", response.up + " up / " + response.down + " down")
                .html(response.score + "")
            if (response.score < 0) Danbooru.notice("Post Score Updated");
        });
    }

    private static getScoreClass(score: number): string {
        if (score > 0) return "score-positive";
        if (score < 0) return "score-negative";
        return "score-neutral";
    }

    /** Toggles the favorite state */
    private toggleFavorite(): void {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) { $("#add-fav-button")[0].click(); }
        else { $("#remove-fav-button")[0].click(); }
    }

    /** Adds the post to favorites, does not remove it */
    private addFavorite(): void {
        if ($("div.fav-buttons").hasClass("fav-buttons-false")) {
            $("#add-fav-button")[0].click();
        }
    }

    /** Removes the post from favorites, does not add it */
    private removeFavorite(): void {
        if (!$("div.fav-buttons").hasClass("fav-buttons-false")) {
            $("#remove-fav-button")[0].click();
        }
    }

    /** Switches the notes container to its opposite state */
    private async toggleNotes(updateSettings = true): Promise<void> {
        const module = ModuleController.get(PostViewer),
            hideNotes = module.fetchSettings("hideNotes");

        if (hideNotes) {
            $("#note-container").attr("data-hidden", "false");
            $("a#image-note-button").html("Notes: ON");
        } else {
            $("#note-container").attr("data-hidden", "true");
            $("a#image-note-button").html("Notes: OFF");
        }

        if (updateSettings)
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

    /** Redirects the page to the post history */
    private openImageHistory(): void {
        location.href = "/post_versions?search[post_id]=" + Post.getViewingPost().id;
    }

    private static lookupClick(query: string): void {
        const lookup = $(query).first();
        if (lookup.length == 0) return;
        lookup[0].click();
    }

    /** Searches for other works by the artist, if there is one */
    private openArtist(): void { PostViewer.lookupClick("li.category-1 a.search-tag"); }

    /** Opens the first source link */
    private openSource(): void { PostViewer.lookupClick("div.source-link a"); }

    /** Opens the first source link */
    private openParent(): void { PostViewer.lookupClick("#has-parent-relationship-preview a, #has-children-relationship-preview a"); }

    /** Toggles the visibility of the parent/child thumbnails */
    private toggleRelSection(): void { PostViewer.lookupClick("#has-children-relationship-preview-link, #has-parent-relationship-preview-link"); }

    /** Opens IQDB page for the current page */
    private openIQDB(): void { PostViewer.lookupClick("#post-related-images a[href*=iqdb_queries]"); }

}
