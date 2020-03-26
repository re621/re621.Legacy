import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Post, ViewingPost } from "../../components/data/Post";

declare var Danbooru;

/**
 * Blacklist Enhancer  
 * Replaces e6 blacklist functionality
 */
export class BlacklistEnhancer extends RE6Module {

    private static instance: BlacklistEnhancer;

    private $box: JQuery<HTMLElement>;
    private $toggle: JQuery<HTMLElement>;
    private $list: JQuery<HTMLElement>;

    private constructor() {
        super([PageDefintion.search, PageDefintion.post]);
        if (!this.eval()) return;

        //Override default blacklist function
        Danbooru.Blacklist.apply = () => { };
        Danbooru.Blacklist.initialize_anonymous_blacklist = () => { };
        Danbooru.Blacklist.initialize_all = () => { };

        this.modifyDOM();

        //Apply blacklist without user interaction. Blacklist might be active
        this.applyBlacklist(true);
    }

    private modifyDOM() {
        //Remove already added entries
        this.$box = $("section#blacklist-box");
        this.$list = $("#blacklist-list").empty();


        let $disableAllButton = $("#disable-all-blacklists").text("Disable all filters");
        let $enableAllbutton = $("#re-enable-all-blacklists").text("Enable all filters");

        //catch when the user toggles the blacklist
        $($disableAllButton).add($enableAllbutton).on("click", () => {
            this.applyBlacklist();
        });


        // Create blacklis toggle dom

        let $toggleContainer = $("section#blacklist-box h1").empty();
        this.$toggle = $(`<a href="">Blacklisted</a>`)
            .attr("id", "blacklist-toggle")
            .appendTo($toggleContainer);
        $("<span>")
            .addClass("blacklist-help")
            .html(`<a href="/help/blacklist" data-ytta-id="-">(filter help)</a>`)
            .appendTo($toggleContainer);

        // Hide the filters by default, unless they are all disabled
        if ($enableAllbutton.css("display") === "none") { this.hideBlacklistedTags(); }
        else { this.showBlacklistedTags(); }

        // Toggle the filter list when clicking the header
        $("a#blacklist-toggle").click(e => {
            e.preventDefault();
            //Togle display state
            this.toggleBlacklistedTags();
        });

        //Show the filter list when clicking on "disable all filters"
        $disableAllButton.click(e => {
            this.showBlacklistedTags();
        });
    }


    private toggleBlacklistedTags() {
        if (this.blacklistedTagsAreVisible()) { this.hideBlacklistedTags(); }
        else { this.showBlacklistedTags(); }
    }

    private blacklistedTagsAreVisible() {
        return this.$box.attr("data-blacklist-hidden") == "false";
    }

    private hideBlacklistedTags() {
        this.$box.attr("data-blacklist-hidden", "true");
    }

    private showBlacklistedTags() {
        this.$box.attr("data-blacklist-hidden", "false");
    }

    private blacklistIsActive() {
        return $("#disable-all-blacklists").is(":visible");
    }

    /**
     * Hides posts, if they are blacklisted and blacklist is active, show otherwise
     * @param hide 
     */
    private applyBlacklist(firstRun = false) {
        const blacklistIsActive = this.blacklistIsActive();
        for (const post of Post.fetchPosts()) {
            //Skip over posts who were already hidden by other means, like instantsearch
            if (firstRun && !post.getDomElement().is(":visible")) {
                continue;
            }
            //do not apply the blacklist to the post you're viewing
            if (post instanceof ViewingPost) {
                continue;
            }
            post.applyBlacklist(blacklistIsActive);
        }
    }

    /**
     * Returns a singleton instance of the class
     * @returns BlacklistEnhancer instance
     */
    public static getInstance() {
        if (this.instance === undefined) this.instance = new BlacklistEnhancer();
        return this.instance;
    }

}
