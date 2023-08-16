import { RE6Module, Settings } from "../../models.old/RE6Module";
import { E621 } from "../../models/api/E621";
import { APIPost } from "../../models/api/responses/APIPost";
import { PageDefinition } from "../../models/data/Page";
import User from "../../models/data/User";
import Modal from "../../models/structure/Modal";

export class PostSuggester extends RE6Module {

    /** Maximum number of pages the module can search for data */
    private static maxPages = 5;

    /** Ignore all tags that have less than this number of posts */
    private static minTagCount = 10;

    /** These tags are not helpful, and are not displayed */
    private static removedTags = [
        "hi_res", "absurd_res", "digital_media_(artwork)", // meta
        "solo", "duo", "group", // composition
        "simple_background", "detailed_background", // background
        "text", "english_text", // misc
    ];

    /** These tags are displayed, by not selected */
    private static ignoredTags = [
        "male", "female", "intersex", // genders
        "mammal", "scalie", "biped", // species
        "anthro", "feral", // species type
        "genitals", "penis", "balls", "animal_genitalia", "humanoid_penis", "erection", "pussy", "butt", "anus", "breasts", "nipples", "non-mammal_breasts", // genitalia
        "genital_fluids", "bodily_fluids", "cum", // fluids
        "wings", "membrane_(anatomy)", "membranous_wings", "claws", "horn", "scales", "teeth", "smile", "tongue", "feathers", "toes", // body parts
        "hair", "fur", "clothing", "clothed", "nude", // misc
        "sex", "penetration", "male_penetrating", // actions
    ];

    private status: JQuery<HTMLElement>;
    private content: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefinition.posts.list);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
        };
    }

    public create(): void {
        super.create();

        if (!User.loggedIn) return;

        // Create the sidebar button
        const listItem = $("<li>").appendTo("ul#related-list");
        const button = $("<a>")
            .attr({
                "id": "recommended-posts",
                "title": "Show posts similar to your favorites"
            })
            .html("Recommended")
            .appendTo(listItem);

        // Create modal content
        const modalContent = $("<div>")
            .addClass("post-suggester");

        this.status = $("<div>")
            .addClass("post-suggester-status")
            .appendTo(modalContent);
        this.content = $("<div>")
            .addClass("post-suggester-content")
            .appendTo(modalContent);

        // Create the modal
        const modal = new Modal({
            title: "Post Recommendations",
            triggers: [{ element: button }],
            fixed: true,
            content: modalContent,
            position: { my: "center", at: "center" }
        });

        let triggered = false;
        modal.getElement().on("dialogopen", () => {
            if (triggered) return;
            else {
                triggered = true;
                this.handleRecommendation();
            }
        });
    }

    public async handleRecommendation(): Promise<boolean> {
        this.status.html("Compiling favorites data");
        const data: TagCounter = {};
        let result: APIPost[];
        for (let i = 1; i <= PostSuggester.maxPages; i++) {
            // Fetching data from the API
            this.status.html(`Analyzing favorites [ page ${i} ]`);
            result = await E621.Favorites.get<APIPost>({ "user_id": User.userID, page: i }, 500);
            result.forEach((post) => {
                APIPost.getTags(post).forEach((tag) => {
                    if (data[tag]) data[tag] = data[tag] + 1;
                    else data[tag] = 1;
                });
            });

            if (result.length !== 100) break;
        }

        this.status.html("Lookup complete");

        // Convert and sort
        let processedData: [string, number][] = [];
        for (const tag in data) processedData.push([tag, data[tag]]);
        processedData = processedData.sort((a, b) => { return b[1] - a[1]; });

        // Add year tags
        for (let year = 1973; year <= new Date().getFullYear(); year++)
            PostSuggester.removedTags.push(year + "");

        // Filter
        processedData = processedData.filter((entry) => {
            return !PostSuggester.removedTags.includes(entry[0]) &&
                entry[1] > PostSuggester.minTagCount;
        });
        if (processedData.length > 100) processedData.length = 100;

        // Output
        this.content[0].innerHTML = "";
        let checkedNum = 0, shouldCheck = true;
        for (const [tag, count] of processedData) {
            const container = $("<span>").appendTo(this.content);

            shouldCheck = checkedNum < 10 && !PostSuggester.ignoredTags.includes(tag);
            if (shouldCheck) checkedNum++;

            $("<input>")
                .attr({
                    "type": "checkbox",
                    "name": "post-suggester-selector",
                    "value": tag,
                    "id": "tag-" + tag,
                    "data-tag": tag,
                    "data-count": count,
                })
                .prop("checked", shouldCheck)
                .appendTo(container);
            $("<label>")
                .attr({
                    "for": "tag-" + tag,
                })
                .html(tag.replace(/_/g, " "))
                .appendTo(container);
            $("<a>")
                .attr("href", "/posts?tags=" + tag)
                .html("?")
                .appendTo(container);
            $("<span>")
                .addClass("tag-count")
                .html("" + count)
                .appendTo(container);
        }

        // Action Link
        this.status[0].innerHTML = "";
        $("<a>")
            .html("Search")
            .addClass("button btn-neutral post-suggester-search")
            .appendTo(this.status)
            .on("click", (event) => {
                event.preventDefault();
                const checkedEls = $("input[name=post-suggester-selector]:checked").get();
                const query = [];
                for (const checkedEl of checkedEls)
                    query.push("~" + encodeURIComponent($(checkedEl).attr("data-tag")))
                query.length = Math.min(query.length, 37);
                query.push(
                    encodeURIComponent("-fav:" + User.username),
                    encodeURIComponent("order:random"),
                    encodeURIComponent("score:>10"),
                );

                window.location.href = "/posts?tags=" + query.join("+");
            });

        return Promise.resolve(true);
    }

}

type TagCounter = {
    [prop: string]: number;
}
