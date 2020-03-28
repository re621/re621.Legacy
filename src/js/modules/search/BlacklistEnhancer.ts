import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Post, ViewingPost } from "../../components/data/Post";
import { User } from "../../components/data/User";
import { PostFilter } from "../../components/data/PostFilter";

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
    }

    /**
     * Returns a singleton instance of the class
     * @returns BlacklistEnhancer instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new BlacklistEnhancer();
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            enabled: true,
            quickaddTags: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create() {
        if (!this.canInitialize()) return;
        super.create();

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
        $disableAllButton.on("click", () => {
            for (const filter of User.getBlacklist().values()) {
                filter.setEnabled(false);
            }
            this.applyBlacklist();
        });
        $enableAllbutton.on("click", () => {
            for (const filter of User.getBlacklist().values()) {
                filter.setEnabled(true);
            }
            this.applyBlacklist();
        })



        // Create blacklis toggle dom

        let $toggleContainer = $("section#blacklist-box h1").empty();
        this.$toggle = $(`<a href="">Blacklisted</a>`)
            .attr("id", "blacklist-toggle")
            .appendTo($toggleContainer);
        $("<span>")
            .addClass("blacklist-help")
            .html(`<a href="/help/blacklist" data-ytta-id="-">(filter help)</a>`)
            .appendTo($toggleContainer);

        this.showBlacklistedTags();

        // Toggle the filter list when clicking the header
        $("a#blacklist-toggle").click(e => {
            e.preventDefault();
            //Togle display state
            this.toggleBlacklistedTags();
        });

        //Add x next to tag names to toggle them from the blacklist
        if (this.fetchSettings("quickaddTags") === true && User.isLoggedIn()) {
            $("#tag-list .search-tag, #tag-box .search-tag").each((index, element) => {
                const $element = $(element);
                $("<a>").addClass("blacklist-tag-toggle").attr("href", "#").text("x").on("click", () => {
                    this.toggleBlacklistTag($element.text().replace(/ /g, "_"));
                }).prependTo($element.parent());
            });
        }
    }

    /**
     * Removes or adds a tag to the users blacklist
     */
    private async toggleBlacklistTag(tag) {
        Danbooru.notice("Getting current blacklist");
        let currentBlacklist = (await User.getCurrentSettings()).blacklisted_tags.split("\n");

        if (currentBlacklist.indexOf(tag) === -1) {
            currentBlacklist.push(tag);
            Danbooru.notice("Adding " + tag + " to blacklist");
        } else {
            currentBlacklist = currentBlacklist.filter(e => e !== tag);
            Danbooru.notice("Removing " + tag + " from blacklist");
        }
        await User.setSettings({ blacklisted_tags: currentBlacklist.join("\n") });
        Danbooru.notice("Done!");
        User.getInstance().addBlacklistFilter(tag);
        this.applyBlacklist();
    }

    private toggleBlacklistedTags() {
        if (this.blacklistedTagsAreVisible()) { this.hideBlacklistedTags(); }
        else { this.showBlacklistedTags(); }
    }

    private blacklistedTagsAreVisible() {
        return this.$box.attr("data-filters-hidden") == "false";
    }

    private hideBlacklistedTags() {
        this.$box.attr("data-filters-hidden", "true");
    }

    private showBlacklistedTags() {
        this.$box.attr("data-filters-hidden", "false");
    }

    public static blacklistIsActive() {
        return $("#disable-all-blacklists").css("display") !== "none";
    }

    /**
     * Hides posts, if they are blacklisted and blacklist is active, show otherwise
     * @param hide 
     */
    private applyBlacklist(firstRun = false) {
        const blacklistIsActive = BlacklistEnhancer.blacklistIsActive();
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

        this.$box.attr("data-blacklist-active", blacklistIsActive.toString());
        this.updateSidebar(blacklistIsActive);
    }

    public updateSidebar(blacklistIsActive: boolean) {
        //remove already added entries
        this.$list.empty();

        for (const entry of User.getBlacklist().entries()) {
            this.addSidebarEntry(entry[0], entry[1]);
        }

        //When there are no entries there's no need to display the blacklist box
        let nonZeorFilterCount = 0;
        for (const filter of User.getBlacklist().values()) {
            if (filter.getMatches() !== 0) {
                nonZeorFilterCount++;
            }
        }
        if (nonZeorFilterCount === 0) {
            this.$box.hide();
        } else {
            this.$box.show();
        }
    }

    private addSidebarEntry(filterString, filter: PostFilter) {
        //https://github.com/zwagoth/e621ng/blob/master/app/javascript/src/javascripts/blacklists.js

        //don't display filters with zero matches
        if (filter.getMatches() === 0) {
            return;
        }

        const $entry = $("<li>");
        const $link = $("<a>");
        const $count = $("<span>");

        $link.text(filterString);
        $link.addClass("blacklist-toggle-link");
        $link.attr("href", `/posts?tags=${encodeURIComponent(filterString)}`);
        $link.attr("title", filterString);
        $link.attr("rel", "nofollow");

        $link.on("click", e => {
            e.preventDefault();
            filter.toggleEnabled();
            BlacklistEnhancer.getInstance().applyBlacklist();
            $link.toggleClass("blacklisted-active");
        })

        if (!filter.isEnabled()) {
            $link.addClass("blacklisted-active");
        }

        $count.html(filter.getMatches());
        $count.addClass("post-count");
        $entry.append($link);
        $entry.append(" ");
        $entry.append($count);

        this.$list.append($entry);
    }

}
