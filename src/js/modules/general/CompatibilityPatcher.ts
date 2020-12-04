import { RE6Module } from "../../components/RE6Module";

export class CompatibilityPatcher extends RE6Module {

    public constructor() {
        super(undefined, true);
    }

    public create(): void {
        super.create();

        this.patchUIConfigurator();
    }

    /**
     * Compatibility patch for E621 UI Configurator
     * https://e621.net/forum_topics/27907
     */
    private patchUIConfigurator(): void {
        const menuButton = $("#viewConfig");
        if (menuButton.length == 0) return;

        menuButton
            .removeAttr("style")
            .addClass("float-left")
            .css("font-weight", "500")
            .prependTo("menu.extra")
        menuButton
            .find("a")
            .html("UI");
    }

}
