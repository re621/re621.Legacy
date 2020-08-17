import { Danbooru } from "../../components/api/Danbooru";
import { Blacklist } from "../../components/data/Blacklist";
import { PageDefintion } from "../../components/data/Page";
import { PostFilter } from "../../components/data/PostFilter";
import { RE6Module, Settings } from "../../components/RE6Module";

/**
 * Blacklist Enhancer  
 * Replaces e6 blacklist functionality
 */
export class BlacklistEnhancer extends RE6Module {

    private static $wrapper: JQuery<HTMLElement>;               // wrapper for the rest of the content
    private static $header: JQuery<HTMLElement>;                // interactable header for the blacklist
    private static $content: JQuery<HTMLElement>;               // list of applicable filters
    private static $toggle: JQuery<HTMLElement>;                // toggle switch for all blacklists

    public constructor() {
        super([PageDefintion.search, PageDefintion.post], true);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            quickaddTags: true,

            blacklistCollapsed: true,
        };
    }

    public create(): void {
        super.create();

        // Override default blacklist function
        Danbooru.Blacklist.stub_vanilla_functions();
        Danbooru.Blacklist.initialize_disable_all_blacklists();
        $("#blacklisted-hider").remove();

        // Content wrapper
        // Clean up the vanilla attributes and styles, or things will go poorly
        BlacklistEnhancer.$wrapper = $("#blacklist-box")
            .attr({
                "id": "re621-blacklist",
                "open": false,
                "count": 0,
                "collapsed": this.fetchSettings("blacklistCollapsed"),
            })
            .removeAttr("style")
            .removeAttr("class")
            .html("");

        // Clickable header
        // Should remember its state between page loads
        BlacklistEnhancer.$header = $("<blacklist-header>")
            .html("Blacklisted")
            .appendTo(BlacklistEnhancer.$wrapper)
            .on("click.re621", () => {
                const enabled = BlacklistEnhancer.$wrapper.attr("collapsed") == "true";
                BlacklistEnhancer.$wrapper.attr("collapsed", !enabled + "");
                this.pushSettings("blacklistCollapsed", !enabled);
            });

        // Blacklist Filters
        // Click to disable individually
        BlacklistEnhancer.$content = $("<blacklist-content>")
            .appendTo(BlacklistEnhancer.$wrapper);

        BlacklistEnhancer.$content.on("click.re621", "a", (event) => {
            event.preventDefault();

            const $target = $(event.currentTarget).parent();
            const enabled = !($target.attr("enabled") == "true");
            const filter: PostFilter = $target.data("filter");
            filter.setEnabled(enabled);
            $target.attr("enabled", enabled + "");

            BlacklistEnhancer.updateHeader();
            BlacklistEnhancer.updateToggleSwitch();

            for (const match of filter.getMatches())
                $("#post_" + match).trigger("refresh.re621");
        });

        // Toggle-All Switch
        // Click to disable / re-enable all filters
        const toggleContainer = $("<blacklist-toggle>")
            .appendTo(BlacklistEnhancer.$wrapper);

        BlacklistEnhancer.$toggle = $("<a>")
            .html("Disable All Filters")
            .appendTo(toggleContainer)
            .on("click.re621", () => {
                // This is dumb, but much faster than the alternative
                if (BlacklistEnhancer.$toggle.text().startsWith("Enable")) Blacklist.enableAll();
                else Blacklist.disableAll();
                BlacklistEnhancer.update();

                $("post").trigger("refresh.re621");
            });
    }

    public static update(): void {
        BlacklistEnhancer.updateFilterList();
        BlacklistEnhancer.updateHeader();
        BlacklistEnhancer.updateToggleSwitch();
    }

    public static updateHeader(): void {
        let postCount = 0;
        for (const entry of BlacklistEnhancer.$content.find("filter[enabled=true]"))
            postCount += parseInt($(entry).attr("count")) || 0;

        BlacklistEnhancer.$header.html(`Blacklisted (${postCount})`);
        BlacklistEnhancer.$wrapper.attr({
            "count": postCount,
        });
    }

    public static updateFilterList(): void {

        BlacklistEnhancer.$content.html("");

        for (const [tags, filter] of Blacklist.getActiveFilters()) {
            const count = filter.getMatchesCount();
            const entry = $("<filter>")
                .attr({
                    "count": count,
                    "enabled": filter.isEnabled()
                })
                .data("filter", filter)
                .appendTo(BlacklistEnhancer.$content);
            $("<a>")
                .attr("href", "/posts?tags=" + tags.replace(" ", "+"))
                .html(tags.replace(/_/g, "&#8203;_"))
                .appendTo(entry);

            $("<span>")
                .html(count + "")
                .appendTo(entry);
        }
    }

    public static updateToggleSwitch(): void {
        if (BlacklistEnhancer.$content.find("filter[enabled=false]").length > 0)
            BlacklistEnhancer.$toggle.html("Enable All Filters");
        else BlacklistEnhancer.$toggle.html("Disable All Filters");
    }

}
