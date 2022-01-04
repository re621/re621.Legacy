import { PageDefinition } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";

export class ProfileEnhancer extends RE6Module {

    public constructor() {
        super(PageDefinition.profile, true);
    }

    public create(): void {
        super.create();

        const username = $("div.profile-stats h1 > a").text();

        const commentsLine = $("th:contains('Comments')");
        if (commentsLine.length > 0)
            commentsLine.next().append(` (<a href="/comments?group_by=comment&search[body_matches]=${username}">Mentions</a>)`)

        const forumLine = $("th:contains('Forum Posts')");
        if (forumLine.length > 0)
            forumLine.next().append(` (<a href="https://e621.net/forum_posts?search[body_matches]=${username}">Mentions</a>)`)
    }

}
