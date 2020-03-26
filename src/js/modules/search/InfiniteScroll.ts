import { RE6Module } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
import { Api } from "../../components/api/Api";
import { ApiPost } from "../../components/api/responses/ApiPost";
import { PostHtml } from "../../components/api/PostHtml";
import { InstantSearch } from "./InstantSearch";
import { Post } from "../../components/data/Post";
import { BlacklistEnhancer } from "./BlacklistEnhancer";

declare var Danbooru;

/**
 * Gets rid of the default pagination and instead appends new posts
 * when you scrolled to the bottom
 */
export class InfiniteScroll extends RE6Module {

    private $postContainer: JQuery<HTMLElement>;
    private $loadingIndicator: JQuery<HTMLElement>;
    private currentQuery: string;
    private nextPageToGet: number;
    private isInProgress: boolean;
    private pagesLeft: boolean;

    private static instance: InfiniteScroll = new InfiniteScroll();

    private constructor() {
        super(PageDefintion.search);
        if (!this.eval()) return;

        this.$postContainer = $("#posts-container");

        this.$loadingIndicator = $("<div>").attr("id", "re-infinite-scroll-loading").addClass("lds-dual-ring");
        this.$loadingIndicator.insertAfter(this.$postContainer);
        this.$loadingIndicator.hide();

        this.currentQuery = Page.getQueryParameter("tags") !== null ? Page.getQueryParameter("tags") : "";
        const page = parseInt(Page.getQueryParameter("page"));
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
        this.$loadingIndicator.show();
        const posts: ApiPost[] = (await Api.getJson(`/posts.json?tags=${this.currentQuery}&page=${this.nextPageToGet}`)).posts;
        Page.setQueryParameter("page", this.nextPageToGet.toString());
        this.addPageIndicator();
        const blacklistIsActive = Post.blacklistIsActive();
        for (const json of posts) {
            const element = PostHtml.create(json);
            const post = new Post(element);
            //Add post to the list of posts currently visible
            //This is important because InstantSearch relies on it
            Post.appendPost(post);

            //Apply blacklist before appending, to prevent image loading
            post.applyBlacklist(blacklistIsActive);

            this.$postContainer.append(element);
            //Hide if blacklist is active and post matches the blacklist
        }
        this.pagesLeft = posts.length !== 0;
        this.isInProgress = false;
        this.$loadingIndicator.hide();

        BlacklistEnhancer.getInstance().updateSidebar(blacklistIsActive);

        InstantSearch.getInstance().applyFilter();
        this.nextPageToGet++;
    }

    private addPageIndicator() {
        const url = document.location.href;
        this.$postContainer.append($("<a>").attr("href", url).addClass("instantsearch-seperator").html(`<h2>Page: ${this.nextPageToGet}</h2>`));
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
