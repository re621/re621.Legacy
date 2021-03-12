import { Page } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";

export class TitleFixer extends RE6Module {

    public constructor() {
        super([], true);
    }

    public create(): void {
        super.create();

        let pageName = null;
        const pageType = Page.getPageType();
        switch (pageType) {
            case "tickets":
            case "upload":
            case "deleted_posts":
            case "blips":
            case "temp": {
                pageName = this.formatPageTitle(pageType);;
                break;
            }
            case "help": {
                const id = Page.getPageID();
                pageName = id == undefined
                    ? "Help"
                    : "Help: " + this.formatPageTitle(id);
                break;
            }
        }

        if (pageName) {
            let $title = $("title");
            if ($title.length == 0) $title = $("<title>").prependTo("head");
            $title.html(`${pageName} - ${Page.getSiteName()}`);
        }
    }

    private formatPageTitle(input: string): string {
        return input.split("_").map(e => capitalize(e)).join(" ");

        function capitalize(text: string): string {
            return text.charAt(0).toUpperCase() + text.slice(1);
        }
    }

}
