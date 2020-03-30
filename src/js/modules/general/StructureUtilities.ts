declare var GM_addStyle;
declare var GM_getResourceText;

/**
 * StructureUtilities  
 * DOM changes that don't belong to any specific project
 */
export class StructureUtilities {

    public static createDOM() {
        // Load in the external stylesheet
        GM_addStyle(GM_getResourceText("re621_styles"));

        // Create a modal container
        let $modalContainer = $("<re-modal-container>").prependTo("body");

        // Create a more sensible header structure
        let $menuContainer = $("nav#nav");
        let $menuMain = $("menu.main");

        if ($("nav#nav menu").length < 2) {
            $menuContainer.append(`<menu>`);
        }

        let $menuLogo = $("<menu>").addClass("logo desktop-only").html(`<a href="/" data-ytta-id="-">e621</a>`);
        $menuContainer.prepend($menuLogo);

        let $menuExtra = $("<menu>").addClass("extra");
        $menuMain.after($menuExtra);

        $("menu:last-child").addClass("submenu");

        // Tweak the tag lists
        const $tags = $("#tag-box > ul > li, #tag-list > ul > li");
        $tags.each((index, element) => {
            let $container = $(element);

            let $tagLink = $container.find("a.search-tag").first();
            $container.find("a.wiki-link").insertBefore($tagLink);

            let $countBox = $container.find(".post-count");
            $countBox.attr("data-count-short", $countBox.text());
            if (!$countBox.attr("data-count")) { $countBox.attr("data-count", $countBox.text()); }

            let $buttonBox = $("<div>")
                .addClass("tag-actions")
                .attr("data-tag", $container.find("a.search-tag").text().replace(/ /g, "_"))
                .appendTo($container);

            // This is an anchor element for the SubscriptionManager to attach its buttons to.
            // No, I don't know why it does things the way it does. Bother Earlopain about it.
            $("<span>").addClass("tag-action-dummy").appendTo($buttonBox);
        });
    }

}
