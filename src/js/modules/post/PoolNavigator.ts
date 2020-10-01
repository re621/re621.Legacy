import { PageDefinition } from "../../components/data/Page";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";

export class PoolNavigator extends RE6Module {

    private activeNav = 0;
    private navbars: PostNav[] = [];

    public constructor() {
        super(PageDefinition.post);
        this.registerHotkeys(
            { keys: "hotkeyCycle", fnct: this.cycleNavbars },
            { keys: "hotkeyNext", fnct: this.triggerNextPost },
            { keys: "hotkeyPrev", fnct: this.triggerPrevPost },
        );
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
            hotkeyCycle: "x|.",
            hotkeyPrev: "a|left",
            hotkeyNext: "d|right",
        };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        this.buildDOM();

        $("input[type='radio'].post-nav-switch").on("change", (event) => {
            this.activeNav = parseInt($(event.target).val() + "");
        });

    }

    /** Loops through available navbars */
    private cycleNavbars(): void {
        const poolNavigator = ModuleController.get(PoolNavigator);
        const navbars = poolNavigator.navbars,
            active = poolNavigator.activeNav;

        if (navbars.length == 0) return;

        if ((active + 1) >= navbars.length) { navbars[0].checkbox.trigger("click"); }
        else { navbars[active + 1].checkbox.trigger("click"); }
    }

    /** Emulates a click on the "next" button */
    private triggerNextPost(): void {
        const poolNavigator = ModuleController.get(PoolNavigator);
        const navbars = poolNavigator.navbars,
            active = poolNavigator.activeNav;
        if (navbars.length == 0) return;
        const button = navbars[active].element.find<HTMLElement>("a.next").first()[0];
        if (button === undefined) return;
        button.click();
    }

    /** Emulates a click on the "prev" button */
    private triggerPrevPost(): void {
        const poolNavigator = ModuleController.get(PoolNavigator);
        const navbars = poolNavigator.navbars,
            active = poolNavigator.activeNav;
        if (navbars.length == 0) return;
        const button = navbars[active].element.find<HTMLElement>("a.prev").first()[0];
        if (button === undefined) return;
        button.click();
    }

    /** Creates the module structure */
    private buildDOM(): void {
        // Search-nav
        if ($("#search-seq-nav").length) {
            this.navbars.push({ type: "search", element: $("#search-seq-nav > ul > li").first(), checkbox: undefined, });
        }

        // Pool-navbars
        for (const element of $("#pool-nav").find("ul > li").get()) {
            this.navbars.push({ type: "pool", element: $(element), checkbox: undefined, });
        }

        // Set-navbars
        for (const element of $("#set-nav").find("ul > li").get()) {
            this.navbars.push({ type: "set", element: $(element), checkbox: undefined, });
        };

        // Create checkboxes
        this.navbars.forEach((nav, index) => {
            nav.element.addClass("post-nav");

            const $radioBox = $("<div>")
                .addClass("post-nav-switch-box")
                .prependTo(nav.element);
            $("<div>")
                .addClass("post-nav-spacer")
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

        // Hide the checkbox if there is only one navbar
        if (this.navbars.length == 1) {
            this.navbars[0].checkbox.parent().addClass("vis-hidden");
        }

        // Tweak the "first-last" links
        $("#nav-links, #nav-links-top, #nav-links-bottom").find(".first").each((index, element) => { $(element).html("&laquo;"); });
        $("#nav-links, #nav-links-top, #nav-links-bottom").find(".last").each((index, element) => { $(element).html("&raquo;"); });
    }
}

interface PostNav {
    type: "search" | "pool" | "set";
    element: JQuery<HTMLElement>;
    checkbox: JQuery<HTMLElement>;
}
