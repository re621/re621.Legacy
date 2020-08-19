import { Danbooru } from "../../components/api/Danbooru";
import { Blacklist } from "../../components/data/Blacklist";
import { PageDefintion } from "../../components/data/Page";
import { PostFilter } from "../../components/post/PostFilter";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Util } from "../../components/utility/Util";
import { BetterSearch } from "./BetterSearch";

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
        super([PageDefintion.search, PageDefintion.favorites], true);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            quickaddTags: true,
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
                "discount": 0,
                "collapsed": Util.LS.getItem("bc") == "1",
            })
            .removeAttr("style")
            .removeAttr("class")
            .appendTo("#re621-search")
            .html("");

        // Clickable header
        // Should remember its state between page loads
        BlacklistEnhancer.$header = $("<blacklist-header>")
            .html("Blacklisted")
            .appendTo(BlacklistEnhancer.$wrapper)
            .on("click.re621", () => {
                const collapsed = !(BlacklistEnhancer.$wrapper.attr("collapsed") == "true");
                BlacklistEnhancer.$wrapper.attr("collapsed", collapsed + "");
                Util.LS.setItem("bc", collapsed ? "1" : "0");
                $("#sidebar").trigger("re621:reflow");
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
                $("#entry_" + match).trigger("re621:visibility");
            BetterSearch.trigger("postcount");
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
                else {
                    Blacklist.disableAll();
                    BlacklistEnhancer.$wrapper.attr("collapsed", "false");
                    $("#sidebar").trigger("re621:reflow");
                    Util.LS.setItem("bc", "0");
                }
                BlacklistEnhancer.update();

                $("post").trigger("re621:visibility");
                BetterSearch.trigger("postcount");
            });
    }

    public static update(): void {
        BlacklistEnhancer.updateFilterList();
        BlacklistEnhancer.updateHeader();
        BlacklistEnhancer.updateToggleSwitch();
        $("#sidebar").trigger("re621:reflow");
    }

    public static updateHeader(): void {
        let enabled = 0,
            disabled = 0;
        for (const entry of BlacklistEnhancer.$content.find("filter")) {
            const filter = $(entry);
            if (filter.attr("enabled") == "true") enabled += parseInt(filter.attr("count")) || 0;
            else disabled += parseInt(filter.attr("count")) || 0;
        }

        BlacklistEnhancer.$header.html(`Blacklisted (${enabled})`);
        BlacklistEnhancer.$wrapper.attr({
            "count": enabled,
            "discount": disabled,
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

        $("#sidebar").trigger("re621:reflow");
    }

    public static updateToggleSwitch(): void {
        if (BlacklistEnhancer.$content.find("filter[enabled=false]").length > 0) {
            BlacklistEnhancer.$toggle.html("Enable All Filters");
            Util.LS.setItem("dab", "1");
        } else {
            BlacklistEnhancer.$toggle.html("Disable All Filters");
            Util.LS.setItem("dab", "0");
        }
    }

}
