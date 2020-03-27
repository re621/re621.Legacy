import { RE6Module } from "../../components/RE6Module";
import { PageDefintion } from "../../components/data/Page";

export class PoolNavigator extends RE6Module {

    private static instance: PoolNavigator;

    private activeNav: number = 0;
    private navbars: PostNav[] = [];

    private constructor() {
        super(PageDefintion.post);
        this.registerHotkeys(
            { keys: ["hotkey_cycle"], fnct: this.cycleNavbars },
            { keys: ["hotkey_next"], fnct: this.triggerNextPost },
            { keys: ["hotkey_prev"], fnct: this.triggerPrevPost },
        );
    }

    public init() {
        if (!this.shouldCallInitFunction()) {
            return;
        }
        super.init();

        this.buildDOM();

        $("input[type='radio'].post-nav-switch").change((event) => {
            this.activeNav = parseInt($(event.target).val() + "");
        });

        this.registerHotkeys();
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if (this.instance === undefined) {
            this.instance = new PoolNavigator();
            this.instance.init();
        }
        return this.instance;
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings() {
        return {
            hotkey_cycle: "r",
            hotkey_prev: "q",
            hotkey_next: "e",
        };
    }

    /** Loops through available navbars */
    private cycleNavbars() {
        if (this.navbars.length == 0) return;
        if ((this.activeNav + 1) > this.navbars.length) {
            this.navbars[0].checkbox.click();
            this.activeNav = 0;
        } else {
            this.navbars[this.activeNav + 1].checkbox.click();
            this.activeNav += 1;
        }
    }

    /** Emulates a click on the "next" button */
    private triggerNextPost() {
        if (this.navbars.length == 0) return;
        this.navbars[this.activeNav].element.find("a.prev").first()[0].click();
    }

    /** Emulates a click on the "prev" button */
    private triggerPrevPost() {
        if (this.navbars.length == 0) return;
        this.navbars[this.activeNav].element.find("a.next").first()[0].click();
    }

    /** Creates the module structure */
    private buildDOM() {
        // Search-nav
        if ($("div#search-seq-nav").length) {
            this.navbars.push({ type: "search", element: $("div#search-seq-nav > ul > li").first(), checkbox: undefined, });
        }

        // Pool-navs
        $("div#pool-nav > ul > li").each((index, element) => {
            this.navbars.push({ type: "pool", element: $(element), checkbox: undefined, });
        });

        // Set-navs

        // Create checkboxes
        this.navbars.forEach((nav, index) => {
            nav.element.addClass("post-nav");

            let $radioBox = $("<div>")
                .addClass("post-nav-switch-box")
                .appendTo(nav.element);
            nav.checkbox = $("<input>")
                .attr("type", "radio")
                .attr("id", "post-nav-switch-" + index)
                .attr("name", "nav")
                .val(index)
                .addClass("post-nav-switch")
                .appendTo($radioBox);
            if (index === this.activeNav) nav.checkbox.attr("checked", "");
            $("<label>")
                .attr("for", "post-nav-switch-" + index)
                .appendTo($radioBox);
        });
    }
}

interface PostNav {
    type: "search" | "pool",
    element: JQuery<HTMLElement>,
    checkbox: JQuery<HTMLElement>,
}
