// eslint-disable-next-line @typescript-eslint/camelcase
declare const GM_addStyle;
// eslint-disable-next-line @typescript-eslint/camelcase
declare const GM_getResourceText;

/**
 * StructureUtilities  
 * DOM changes that don't belong to any specific project
 */
export class StructureUtilities {

    public static createDOM(): void {
        // Load in the external stylesheet
        GM_addStyle(GM_getResourceText("re621_styles"));

        // Create a modal container
        $("<re-modal-container>").prependTo("body");

        // Create a more sensible header structure
        const $menuContainer = $("nav#nav");
        const $menuMain = $("menu.main");

        if ($("nav#nav menu").length < 2) {
            $menuContainer.append(`<menu>`);
        }

        const $menuLogo = $("<menu>").addClass("logo desktop-only").html(`<a href="/" data-ytta-id="-">e621</a>`);
        $menuContainer.prepend($menuLogo);

        const $menuExtra = $("<menu>").addClass("extra");
        $menuMain.after($menuExtra);

        $("menu:last-child").addClass("submenu");

        // Tweak the tag lists
        const $tags = $("#tag-box > ul > li, #tag-list > ul > li");
        $tags.each((index, element) => {
            const $container = $(element);

            const $tagLink = $container.find("a.search-tag").first();
            $container.find("a.wiki-link").insertBefore($tagLink);

            const $countBox = $container.find(".post-count");
            $countBox.attr("data-count-short", $countBox.text());
            if (!$countBox.attr("data-count")) { $countBox.attr("data-count", $countBox.text()); }

            const $buttonBox = $("<div>")
                .addClass("tag-actions")
                .attr("data-tag", $container.find("a.search-tag").text().replace(/ /g, "_"))
                .appendTo($container);

            // This is an anchor element for the SubscriptionManager to attach its buttons to.
            // No, I don't know why it does things the way it does. Bother Earlopain about it.
            $("<span>").addClass("tag-action-dummy").appendTo($buttonBox);
        });
    }

}
