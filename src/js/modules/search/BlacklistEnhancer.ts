import { RE6Module, Settings } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";
import { Post, ViewingPost } from "../../components/data/Post";
import { User } from "../../components/data/User";
import { PostFilter } from "../../components/data/PostFilter";

/* eslint-disable @typescript-eslint/camelcase */

declare const Danbooru;

/**
 * Blacklist Enhancer  
 * Replaces e6 blacklist functionality
 */
export class BlacklistEnhancer extends RE6Module {

    private $box: JQuery<HTMLElement>;
    private $toggle: JQuery<HTMLElement>;
    private $list: JQuery<HTMLElement>;

    public constructor() {
        super([PageDefintion.search, PageDefintion.post]);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            quickaddTags: true,
            hideFilterList: true,
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        if (!this.canInitialize()) return;
        super.create();

        //Override default blacklist function
        Danbooru.Blacklist.apply = (): void => { return; };
        Danbooru.Blacklist.initialize_anonymous_blacklist = (): void => { return; };
        Danbooru.Blacklist.initialize_all = (): void => { return; };

        this.modifyDOM();

        //Apply blacklist without user interaction. Blacklist might be active
        this.applyBlacklist(true);
    }

    private modifyDOM(): void {
        //Remove already added entries
        this.$box = $("section#blacklist-box");
        this.$list = $("#blacklist-list").empty();


        const $disableAllButton = $("#disable-all-blacklists").text("Disable all filters");
        const $enableAllbutton = $("#re-enable-all-blacklists").text("Enable all filters");

        //catch when the user toggles the blacklist
        $disableAllButton.on("click", () => {
            for (const filter of User.getBlacklist().values()) {
                filter.setEnabled(false);
            }
            this.applyBlacklist();
            this.showFilterList();
        });
        $enableAllbutton.on("click", () => {
            for (const filter of User.getBlacklist().values()) {
                filter.setEnabled(true);
            }
            this.applyBlacklist();
        });



        // Create blacklis toggle dom

        const $toggleContainer = $("section#blacklist-box h1").empty();
        this.$toggle = $(`<a href="">Blacklisted</a>`)
            .attr("id", "blacklist-toggle")
            .appendTo($toggleContainer);
        $("<span>")
            .addClass("blacklist-help")
            .html(`<a href="/help/blacklist" data-ytta-id="-">(filter help)</a>`)
            .appendTo($toggleContainer);

        this.$box.attr("data-filters-hidden", this.fetchSettings("hideFilterList"));

        // Toggle the filter list when clicking the header
        $("a#blacklist-toggle").click(e => {
            e.preventDefault();
            //Togle display state
            this.toggleFilterList();
        });

        //Add x next to tag names to toggle them from the blacklist
        if (this.fetchSettings("quickaddTags") === true && User.isLoggedIn()) {
            $("div.tag-actions span.tag-action-blacklist").each((index, element) => {
                const $container = $(element);

                const toggleButton = $("<a>")
                    .attr({
                        "href": "#",
                        "title": "Blacklist Tag",
                    })
                    .addClass("blacklist-tag-toggle")
                    .html(`<i class="fas fa-times"></i>`)
                    .prependTo($container);

                toggleButton.click((event) => {
                    event.preventDefault();
                    this.toggleBlacklistTag($container.parent().attr("data-tag"));
                });
            });
        }
    }

    /**
     * Removes or adds a tag to the users blacklist
     */
    private async toggleBlacklistTag(tag): Promise<void> {
        Danbooru.notice("Getting current blacklist");
        let currentBlacklist = (await User.getCurrentSettings()).blacklisted_tags.split("\n");

        if (currentBlacklist.indexOf(tag) === -1) {
            currentBlacklist.push(tag);
            User.getInstance().addBlacklistFilter(tag);
            Danbooru.notice("Adding " + tag + " to blacklist");
        } else {
            currentBlacklist = currentBlacklist.filter(e => e !== tag);
            User.getInstance().removeBlacklistFilter(tag);
            Danbooru.notice("Removing " + tag + " from blacklist");
        }
        await User.setSettings({ blacklisted_tags: currentBlacklist.join("\n") });
        Danbooru.notice("Done!");
        this.applyBlacklist();
    }

    /** Toggles the filter list state */
    private toggleFilterList(): void {
        if (this.filterListVisible()) { this.hideFilterList(); }
        else { this.showFilterList(); }
    }

    /** Returns true if the filter list is visible, false otherwise */
    private filterListVisible(): boolean {
        return this.$box.attr("data-filters-hidden") == "false";
    }

    /** Hides the filter list */
    private hideFilterList(): void {
        this.pushSettings("hideFilterList", true);
        this.$box.attr("data-filters-hidden", "true");
    }

    /** Shows the filter list */
    private showFilterList(): void {
        this.pushSettings("hideFilterList", false);
        this.$box.attr("data-filters-hidden", "false");
    }

    /**
     * Hides posts, if they are blacklisted and blacklist is active, show otherwise
     * @param hide 
     */
    private applyBlacklist(firstRun = false): void {
        for (const post of Post.fetchPosts()) {
            //Skip over posts who were already hidden by other means, like instantsearch
            if (firstRun && !post.getDomElement().is(":visible")) {
                continue;
            }
            //do not apply the blacklist to the post you're viewing
            if (post instanceof ViewingPost) {
                continue;
            }
            post.applyBlacklist();
        }

        this.updateSidebar();
    }

    public updateSidebar(): void {
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

    private addSidebarEntry(filterString, filter: PostFilter): void {
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
            this.applyBlacklist();
            $link.toggleClass("blacklisted-active");
        });

        if (!filter.isEnabled()) {
            $link.addClass("blacklisted-active");
        }

        $count.html(filter.getMatches() + "");
        $count.addClass("post-count");
        $entry.append($link);
        $entry.append(" ");
        $entry.append($count);

        this.$list.append($entry);
    }

}
