import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";

/**
 * Blacklist Toggler  
 * Makes the blacklist filters collapsable
 */
export class BlacklistToggler extends RE6Module {

    private static instance: BlacklistToggler;

    private $box: JQuery<HTMLElement>;
    private $toggle: JQuery<HTMLElement>;
    private $list: JQuery<HTMLElement>;

    private constructor() {
        super([PageDefintion.search, PageDefintion.post]);
        if (!this.eval()) return;

        // Create the required DOM
        this.$box = $("section#blacklist-box");

        let $toggleContainer = $("section#blacklist-box h1").empty();
        this.$toggle = $(`<a href="">Blacklisted</a>`)
            .attr("id", "blacklist-toggle")
            .appendTo($toggleContainer);
        $("<span>")
            .addClass("blacklist-help")
            .html(`<a href="/help/blacklist" data-ytta-id="-">(filter help)</a>`)
            .appendTo($toggleContainer);

        let $disableAllButton = $("#disable-all-blacklists").text("Disable all filters");
        let $enableAllbutton = $("#re-enable-all-blacklists").text("Enable all filters");

        // Hide the filters by default, unless they are all disabled
        if ($enableAllbutton.css("display") === "none") { this.hide(); }
        else { this.show(); }

        // Toggle the filter list when clicking the header
        $("a#blacklist-toggle").click(e => {
            e.preventDefault();
            this.toggleList();
        });

        //Show the filter list when clicking on "disable all filters"
        $disableAllButton.click(e => {
            this.show();
        });
    }

    private toggleList() {
        if (this.isVisible()) { this.hide(); }
        else { this.show(); }
    }

    private isVisible() {
        return this.$box.attr("data-blacklist-hidden") == "false";
    }

    private hide() {
        this.$box.attr("data-blacklist-hidden", "true");
    }

    private show() {
        this.$box.attr("data-blacklist-hidden", "false");
    }

    /**
     * Returns a singleton instance of the class
     * @returns BlacklistToggler instance
     */
    public static getInstance() {
        if (this.instance === undefined) this.instance = new BlacklistToggler();
        return this.instance;
    }

}
