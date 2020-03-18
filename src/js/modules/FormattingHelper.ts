
export class FormattingHelper {

    private static instance : FormattingHelper = new FormattingHelper();

    private constructor() {
        this.createDOM();
    }

    /**
     * Returns a singleton instance of the class
     * @returns FormattingHelper instance
     */
    public static getInstance() {
        if(this.instance == undefined) this.instance = new FormattingHelper();
        return this.instance;
    }

    private createDOM() {
        let $container = $("div.dtext-previewable:has(textarea)");

        let $bar = $("<div>").addClass("comment-header").prependTo($container);
        let $toggleTabs = $("<div>").addClass("comment-tabs").appendTo($bar);

        let $toggleEdit = $(`<a href="">`).html("Write").addClass("active").appendTo($toggleTabs);
        let $togglePreview = $(`<a href="">`).html("Preview").appendTo($toggleTabs);

        let $buttonBox = $("<div>").addClass("comment-buttons").appendTo($bar);

        let $buttonBold = $(`<a href="">`).html("B").appendTo($buttonBox);
    }

    private format() {
        $.ajax({
            type: "post",
            url: "/dtext_preview",
            dataType: "json",
            data: {
              body: "test"
            },
            success: function(data) {
                console.log(data);
            }
        });
    }
}
