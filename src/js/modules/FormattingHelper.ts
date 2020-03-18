import { RE6Module } from "../components/RE6Module";

export class FormattingHelper extends RE6Module {

    private $container: JQuery<HTMLElement>;

    private $toggleTabs: JQuery<HTMLElement>;
    private $toggleEditing: JQuery<HTMLElement>;
    private $togglePreview: JQuery<HTMLElement>;

    private $textarea: JQuery<HTMLElement>;
    private $preview: JQuery<HTMLElement>;

    private constructor($targetContainer) {
        super();
        let _self = this;

        this.$container = $targetContainer;

        this.createDOM();

        this.$toggleTabs.find("a").click(function (e) {
            e.preventDefault();
            _self.toggleEditing();
        });
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    public getDefaultSettings() {
        return {
            "buttons": [
                { title: `<i class="fas fa-bold"></i>`, content: "[b]$selection[/b]" },
                { title: `<i class="fas fa-italic"></i>`, content: "[i]$selection[/i]" },
                { title: `<i class="fas fa-strikethrough"></i>`, content: "[s]$selection[/s]" },
                /*
                { title: "Under", content: "[u]$selection[/u]" },
                { title: "Super", content: "[sup]$selection[/sup]" },
                { title: "Spoiler", content: "[spoiler]$selection[/spoiler]" },
                { title: "Color", content: "[color=]$selection[/color]" },
                { title: "Code", content: "`$selection`" },
                { title: "Heading", content: "h2.$selection" },
                { title: "Quote", content: "[quote]$selection[/quote]" },
                { title: "Section", content: "[section=Title]$selection[/section]" },
                { title: "Tag", content: "{{$selection}}" },
                { title: "Wiki", content: "[[$selection]]" },
                { title: "Link", content: "\"$selection\":" }
                */
            ]
        };
    }

    public static init() {
        $("div.dtext-previewable:has(textarea)").each(function (index, element) {
            new FormattingHelper($(element));
        });

        $("input.dtext-preview-button").remove();   // TODO Remove only buttons corresponding to the elements
    }

    /**
     * Builds basic structure for the module
     */
    private createDOM() {
        this.$container.attr("data-editing", "true");

        this.$textarea = this.$container.find("textarea");
        this.$preview = this.$container.find("div.dtext-preview");

        let $bar = $("<div>").addClass("comment-header").prependTo(this.$container);

        this.$toggleTabs = $("<div>")
            .addClass("comment-tabs")
            .appendTo($bar);
        this.$toggleEditing = $(`<a href="">`)
            .html("Write")
            .addClass("toggle-editing")
            .addClass("active")
            .appendTo(this.$toggleTabs);
        this.$togglePreview = $(`<a href="">`)
            .html("Preview")
            .addClass("toggle-preview")
            .appendTo(this.$toggleTabs);

        let $buttonBox = $("<div>").addClass("comment-buttons").appendTo($bar);

        this.fetchSettings("buttons").forEach(function (value) {
            $(`<a href="">`).html(value.title).appendTo($buttonBox);
        });

    }

    /**
     * Toggles the comment form from editing to preview
     */
    private toggleEditing() {
        let _self = this;
        if (this.$container.attr("data-editing") === "true") {
            this.$container.attr("data-editing", "false");
            this.$toggleEditing.removeClass("active");
            this.$togglePreview.addClass("active");

            // format the text
            this.$textarea.val();
            this.format(this.$textarea.val(), function (data) {
                console.log(data);
                _self.$preview.html(data.html);
            });
        } else {
            this.$container.attr("data-editing", "true");
            this.$toggleEditing.addClass("active");
            this.$togglePreview.removeClass("active");
        }
    }

    private format(input: string | string[] | number, handleData: any) {
        $.ajax({
            type: "post",
            url: "/dtext_preview",
            dataType: "json",
            data: {
                body: input
            },
            success: function (data) {
                handleData(data);
            }
        });
    }
}
