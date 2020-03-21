import { RE6Module } from "../components/RE6Module";
import { Url } from "../components/Url";
import { Api } from "../components/Api";
import { ApiPost } from "../components/apiresponses/ApiPost";
import { PostHtml } from "../components/PostHtml";
import { InstantSearch } from "./InstantSearch";

/**
 * Gets rid of the default pagination and instead appends new posts
 * when you scrolled to the bottom
 */
export class InfiniteScroll extends RE6Module {

    private locationConstrain = "=/posts|/posts?";
    private $postContainer: JQuery<HTMLElement>;
    private currentQuery: string;
    private nextPageToGet: number;
    private isInProgress: boolean;
    private pagesLeft: boolean;

    private static instance: InfiniteScroll = new InfiniteScroll();

    private constructor() {
        super();
        if (!Url.matches(this.locationConstrain)) {
            return;
        }
        this.$postContainer = $("#posts-container");
        this.currentQuery = Url.getQueryParameter("tags") !== undefined ? Url.getQueryParameter("tags") : "";
        const page = parseInt(Url.getQueryParameter("page"));
        this.nextPageToGet = isNaN(page) ? 2 : page + 1;
        this.isInProgress = false;
        this.pagesLeft = true;

        //Wait until all images are loaded, to prevent fetching posts 
        //while the layout is still changing
        $(() => {
            $(window).scroll(async () => { await this.addMorePosts() });

            //If the user has few posts per page, he might already be scrolled to the bottom
            this.addMorePosts();
        });
    }

    /**
     * Adds more posts to the site, if the user has scrolled down enough
     */
    private async addMorePosts() {
        if (this.isInProgress || !this.pagesLeft || !this.shouldAddMore()) {
            return;
        }
        this.isInProgress = true;
        const posts: ApiPost[] = (await Api.getJson(`/posts.json?tags=${this.currentQuery}&page=${this.nextPageToGet}`)).posts;
        for (const json of posts) {
            this.$postContainer.append(PostHtml.create(json));
        }
        this.pagesLeft = posts.length !== 0;
        this.isInProgress = false;
        Url.setQueryParameter("page", this.nextPageToGet.toString());
        this.nextPageToGet++;
    }

    /**
     * Checks if the user has scrolled down enough, so that more
     * posts should be appended
     */
    private shouldAddMore() {
        return $(window).scrollTop() + $(window).height() > $(document).height() - 50;
    }

    /**
     * Returns a singleton instance of the class
     * @returns InfiniteScroll instance
     */
    public static getInstance() {
        if (this.instance == undefined) this.instance = new InfiniteScroll();
        return this.instance;
    }
}
