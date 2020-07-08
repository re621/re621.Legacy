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

    /** Container for the blacklist filters in the sidebar */
    private static $box: JQuery<HTMLElement>;
    /** List of filters within the box */
    private static $list: JQuery<HTMLElement>;

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

    public create(): void {
        super.create();

        // Override default blacklist function
        Danbooru.Blacklist.stub_vanilla_functions();
        Danbooru.Blacklist.initialize_disable_all_blacklists();
        $("#blacklisted-hider").remove();

        // Remove already added entries
        BlacklistEnhancer.$box = $("section#blacklist-box");
        BlacklistEnhancer.$list = $("#blacklist-list").html("");

        const $disableAllButton = $("#disable-all-blacklists").text("Disable all filters");
        const $enableAllbutton = $("#re-enable-all-blacklists").text("Enable all filters");

        // Catch when the user toggles the blacklist
        $disableAllButton
            .off("click.danbooru")
            .on("click.re621", () => {
                for (const filter of User.getBlacklist().values())
                    filter.setEnabled(false);
                BlacklistEnhancer.applyBlacklist();
                $disableAllButton.hide();
                $enableAllbutton.show();
            });
        $enableAllbutton
            .off("click.danbooru")
            .on("click.re621", () => {
                for (const filter of User.getBlacklist().values())
                    filter.setEnabled(true);
                BlacklistEnhancer.applyBlacklist();
                $disableAllButton.show();
                $enableAllbutton.hide();
            });

        // Add x next to tag names to toggle them from the blacklist
        if (this.fetchSettings("quickaddTags") === true && User.isLoggedIn()) {
            $("div.tag-actions span.tag-action-blacklist").each((index, element) => {
                const $container = $(element);

                $("<a>")
                    .attr({
                        "href": "#",
                        "title": "Blacklist Tag",
                    })
                    .addClass("blacklist-tag-toggle")
                    .html(`<i class="fas fa-times"></i>`)
                    .prependTo($container)
                    .click((event) => {
                        event.preventDefault();
                        this.toggleBlacklistTag($container.parent().attr("data-tag"));
                    });
            });
        }

        // Apply blacklist without user interaction. Blacklist might be active
        BlacklistEnhancer.applyBlacklist();

        BlacklistEnhancer.on("updateSidebar.main", () => {
            BlacklistEnhancer.updateSidebar();
        });
    }

    public destroy(): void {
        super.destroy();
        BlacklistEnhancer.off("updateSidebar.main");
    }

    /**
     * Adds or removes a tag from the user's blacklist
     * @param tagname Name of the tag to toggle
     */
    private async toggleBlacklistTag(tagname: string): Promise<void> {
        Danbooru.notice("Getting current blacklist");
        let currentBlacklist = (await User.getCurrentSettings()).blacklisted_tags.split("\n");

        if (currentBlacklist.indexOf(tagname) === -1) {
            currentBlacklist.push(tagname);
            User.getInstance().addBlacklistFilter(tagname);
            Danbooru.notice("Adding " + tagname + " to blacklist");
        } else {
            currentBlacklist = currentBlacklist.filter(e => e !== tagname);
            User.getInstance().removeBlacklistFilter(tagname);
            Danbooru.notice("Removing " + tagname + " from blacklist");
        }
        await User.setSettings({ blacklisted_tags: currentBlacklist.join("\n") });
        Danbooru.notice("Done!");
        BlacklistEnhancer.applyBlacklist();
    }

    /**
     * Refreshes the post's visibility status in accordance to the blacklist
     * @param firstRun 
     */
    private static async applyBlacklist(): Promise<void> {
        const posts = Post.fetchPosts();
        for (const post of posts) {
            if (post instanceof ViewingPost) continue;
            post.applyBlacklist();
        }

        this.updateSidebar();
        return Promise.resolve();
    }

    private static async updateSidebar(): Promise<void> {
        // Remove already added entries
        BlacklistEnhancer.$list.html("");

        const blacklist = User.getBlacklist();

        let filtered = new Set<number>();
        for (const [filterString, filter] of blacklist.entries()) {
            addSidebarEntry(filterString, filter);
            filtered = new Set<number>([...filtered, ...filter.getMatchesIds()]);
        }

        // When there are no entries there's no need to display the blacklist box
        if (filtered.size === 0) BlacklistEnhancer.$box.hide();
        else BlacklistEnhancer.$box.show();

        // Update total count
        $("#blacklisted-count").text("(" + filtered.size + ")");

        /**
         * Creates a filter list entry and appends it to the list  
         * https://github.com/zwagoth/e621ng/blob/master/app/javascript/src/javascripts/blacklists.js
         * @param filterString Filter string
         * @param filter PostFilter object
         * @returns True if an entry was added, false otherwise
         */
        function addSidebarEntry(filterString: string, filter: PostFilter): boolean {
            if (filter.getMatches() === 0) return false;
            // console.log(filterString, filter.getMatches(), filter.getMatchesIds());

            const $entry = $("<li>");

            const $link = $("<a>")
                .text(filterString)
                .addClass("blacklist-toggle-link")
                .toggleClass("blacklisted-active", !filter.isEnabled())
                .attr({
                    "href": `/posts?tags=${encodeURIComponent(filterString)}`,
                    "title": filterString,
                    "rel": "nofollow"
                })
                .appendTo($entry)
                .on("click", event => {
                    event.preventDefault();
                    filter.toggleEnabled();
                    BlacklistEnhancer.applyBlacklist();
                    $link.toggleClass("blacklisted-active");
                });

            $entry.append(" ");

            $("<span>")
                .html(filter.getMatches() + "")
                .addClass("post-count")
                .appendTo($entry);

            BlacklistEnhancer.$list.append($entry);
            return true;
        }
    }

}
