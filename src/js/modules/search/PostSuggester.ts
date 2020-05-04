import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { PageDefintion } from "../../components/data/Page";
import { RE6Module, Settings } from "../../components/RE6Module";
import { Modal } from "../../components/structure/Modal";

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
        "text", // misc
    ];

    /** These tags are displayed, by not selected */
    private static ignoredTags = [
        "male", "female", // genders
        "mammal", "scalie", // species
        "anthro", "feral", // species type
        "genitals", "penis", "balls", "animal_genitalia", "humanoid_penis", "erection", "pussy", "butt", "anus", "breasts", "nipples", "non-mammalian_breasts", // genitalia
        "genital_fluids", "bodily_fluids", "cum", // fluids
        "wings", "membrane_(anatomy)", "claws", "horn", "scales", "teeth", "smile", "tongue", "feathers", // body parts
        "hair", "fur", "clothing", "clothed", "nude", // misc
        "sex", "penetration", // actions
    ];

    private status: JQuery<HTMLElement>;
    private content: JQuery<HTMLElement>;

    public constructor() {
        super(PageDefintion.search);
    }

    protected getDefaultSettings(): Settings {
        return {
            enabled: true,
        };
    }

    public create(): void {
        super.create();

        // Create the sidebar button
        const listItem = $("<li>").appendTo("ul#related-list");
        const button = $("<a>")
            .html("Recommended")
            .click((event) => {
                event.preventDefault();
                this.handleRecommendation();
                // TODO Block repeat clicks while the queue is processing
            })
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
        let result: APIPost[],
            index = 1;
        do {
            // Fetching data from the API
            this.status.html(`Analyzing favorites [ ${index} / ${PostSuggester.maxPages} ]`);
            result = await E621.Posts.get<APIPost>({ tags: "fav:bitWolfy", page: index, limit: 320 }, 500);
            result.forEach((post) => {
                APIPost.getTags(post).forEach((tag) => {
                    if (data[tag]) data[tag] = data[tag] + 1;
                    else data[tag] = 1;
                });
            });
            index++;
        } while (result.length == 320 && index <= PostSuggester.maxPages);

        this.status.html("Lookup complete");

        // Convert and sort
        let processedData: [string, number][] = [];
        for (const tag in data) processedData.push([tag, data[tag]]);
        processedData = processedData.sort((a, b) => { return b[1] - a[1]; });

        // Filter
        processedData = processedData.filter((entry) => {
            return !PostSuggester.removedTags.includes(entry[0]) &&
                entry[1] > PostSuggester.minTagCount;
        });

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
                .html(`<a href="/posts?tags=${tag}">${tag.replace(/_/g, " ")}</a>`)
                .appendTo(container);
            $("<span>")
                .addClass("tag-count")
                .html("" + count)
                .appendTo(container);
        }

        // Action Link
        this.status[0].innerHTML = "";
        $("<a>")
            .html("create_query")
            .appendTo(this.status)
            .click((event) => {
                event.preventDefault();
                const checkedEls = $("input[name=post-suggester-selector]:checked").get();
                const query = [];
                for (const checkedEl of checkedEls)
                    query.push("~" + encodeURIComponent($(checkedEl).attr("data-tag")))
                query.push(encodeURIComponent("order:random"));
                query.push(encodeURIComponent("score:>10"));

                window.location.href = "/posts?tags=" + query.join("+");
            });

        return Promise.resolve(true);
    }

}

type TagCounter = {
    [prop: string]: number;
}
