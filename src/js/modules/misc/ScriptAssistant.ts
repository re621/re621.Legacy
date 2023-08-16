import { PageDefinition } from "../../components/data/Page";
import { Post } from "../../components/post/Post";
import { RE6Module } from "../../components/RE6Module";
import { BetterSearch } from "../search/BetterSearch";

export class ScriptAssistant extends RE6Module {

    public constructor() {
        super(PageDefinition.posts.list, true, false, [BetterSearch]);
    }

    public create(): void {
        super.create();

        const input = $("#tag-script-field");
        if (input.length == 0) return;

        $("<button>")
            .attr({
                "id": "tag-script-all",
                "title": "Apply the current script to all posts on the page",
            })
            .html("all")
            .insertAfter(input)
            .on("click", () => {
                Post.find("all").each((post) => {
                    post.$ref.trigger("pseudoclick");
                })
            })

    }

}
