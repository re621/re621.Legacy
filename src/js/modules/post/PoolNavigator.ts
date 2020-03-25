import { RE6Module } from "../../components/RE6Module";
import { HotkeyCustomizer } from "../general/HotkeyCustomizer";
import { PageDefintion } from "../../components/data/Page";

export class PoolNavigator extends RE6Module {

    private static instance: PoolNavigator;

    private activeNav: number = 0;
    private navbars: PostNav[] = [];

    private constructor() {
        super(PageDefintion.post);
        if (!this.eval()) {
            this.reserveHotkeys();
            return;
        }

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
        if (this.instance === undefined) this.instance = new PoolNavigator();
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

    /** Registers hotkeys for the module */
    protected registerHotkeys() {
        HotkeyCustomizer.register(this.fetchSettings("hotkey_cycle"), () => {
            if (this.navbars.length == 0) return;
            if ((this.activeNav + 1) > this.navbars.length) {
                this.navbars[0].checkbox.click();
                this.activeNav = 0;
            } else {
                this.navbars[this.activeNav + 1].checkbox.click();
                this.activeNav += 1;
            }
        });
        HotkeyCustomizer.register(this.fetchSettings("hotkey_prev"), () => {
            if (this.navbars.length == 0) return;
            this.navbars[this.activeNav].element.find("a.prev").first()[0].click();
        });
        HotkeyCustomizer.register(this.fetchSettings("hotkey_next"), () => {
            if (this.navbars.length == 0) return;
            this.navbars[this.activeNav].element.find("a.next").first()[0].click();
        });
    }

    /** Reserves hotkeys to prevent them from being re-assigned */
    protected reserveHotkeys() {
        HotkeyCustomizer.register(this.fetchSettings("hotkey_prev"), function () { });
        HotkeyCustomizer.register(this.fetchSettings("hotkey_next"), function () { });
    }

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
