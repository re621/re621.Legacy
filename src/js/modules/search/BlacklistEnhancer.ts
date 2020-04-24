import { Danbooru } from "../../components/api/Danbooru";
import { PageDefintion } from "../../components/data/Page";
import { Post, ViewingPost } from "../../components/data/Post";
import { PostFilter } from "../../components/data/PostFilter";
import { User } from "../../components/data/User";
import { RE6Module, Settings } from "../../components/RE6Module";

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
            quickaddTags: true
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        //Override default blacklist function
        Danbooru.Blacklist.stub_vanilla_functions();
        Danbooru.Blacklist.initialize_disable_all_blacklists();
        $("#blacklisted-hider").remove();

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
        $disableAllButton
            .off("click.danbooru")
            .on("click.re621", () => {
                for (const filter of User.getBlacklist().values()) {
                    filter.setEnabled(false);
                }
                this.applyBlacklist();
                $disableAllButton.hide();
                $enableAllbutton.show();
            });
        $enableAllbutton
            .off("click.danbooru")
            .on("click.re621", () => {
                for (const filter of User.getBlacklist().values()) {
                    filter.setEnabled(true);
                }
                this.applyBlacklist();
                $disableAllButton.show();
                $enableAllbutton.hide();
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

        //update total count
        $("#blacklisted-count").text(`(${User.getTotalBlacklistMatches()})`);
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
