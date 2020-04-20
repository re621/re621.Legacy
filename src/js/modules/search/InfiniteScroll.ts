import { RE6Module, Settings } from "../../components/RE6Module";
import { Page, PageDefintion } from "../../components/data/Page";
import { E621 } from "../../components/api/E621";
import { APIPost } from "../../components/api/responses/APIPost";
import { PostHtml } from "../../components/api/PostHtml";
import { InstantSearch } from "./InstantSearch";
import { Post } from "../../components/data/Post";
import { BlacklistEnhancer } from "./BlacklistEnhancer";
import { ModuleController } from "../../components/ModuleController";
import { ThumbnailEnhancer, ThumbnailPerformanceMode, ThumbnailClickAction } from "./ThumbnailsEnhancer";
import { Danbooru } from "../../components/api/Danbooru";

/**
 * Gets rid of the default pagination and instead appends new posts
 * when you scrolled to the bottom
 */
export class InfiniteScroll extends RE6Module {

    private static scrollPaused = false;

    private $postContainer: JQuery<HTMLElement>;
    private $loadingIndicator: JQuery<HTMLElement>;
    private $nextButton: JQuery<HTMLElement>;
    private currentQuery: string;
    private nextPageToGet: number;
    private isInProgress: boolean;
    private pagesLeft: boolean;

    public constructor() {
        super(PageDefintion.search);
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings(): Settings {
        return { enabled: true };
    }

    /**
     * Creates the module's structure.  
     * Should be run immediately after the constructor finishes.
     */
    public create(): void {
        super.create();

        this.$postContainer = $("#posts-container");

        this.$loadingIndicator = $("<div>").attr("id", "re-infinite-scroll-loading").addClass("lds-dual-ring");
        this.$loadingIndicator.insertAfter(this.$postContainer);
        this.$loadingIndicator.hide();

        this.$nextButton = $("<a>").text("Load next").on("click", () => {
            this.addMorePosts(true);
        });
        this.$nextButton
            .attr("id", "re-infinite-scroll-next")
            .addClass("text-center")
            .insertAfter(this.$postContainer);

        this.currentQuery = Page.getQueryParameter("tags") !== null ? Page.getQueryParameter("tags") : "";
        const page = parseInt(Page.getQueryParameter("page"));
        this.nextPageToGet = isNaN(page) ? 2 : page + 1;
        this.isInProgress = false;
        this.pagesLeft = true;

        //Wait until all images are loaded, to prevent fetching posts 
        //while the layout is still changing
        $(() => {
            $(window).scroll(async () => { await this.addMorePosts(); });
        });
    }

    public destroy(): void {
        super.destroy();
        this.$nextButton.remove();
    }

    /**
     * Adds more posts to the site, if the user has scrolled down enough
     */
    private async addMorePosts(override = false): Promise<void> {
        if (!this.isEnabled() || this.isInProgress || !this.pagesLeft || !this.shouldAddMore(override) || InfiniteScroll.scrollPaused) {
            return;
        }
        this.isInProgress = true;
        this.$loadingIndicator.show();
        const posts = await E621.Posts.get<APIPost>({ tags: this.currentQuery, page: this.nextPageToGet });
        if (posts.length === 0) {
            this.pagesLeft = false;
            this.$loadingIndicator.hide();
            this.$nextButton.hide();
            Danbooru.notice("No more posts!");
            return;
        }
        Page.setQueryParameter("page", this.nextPageToGet.toString());
        this.addPageIndicator();

        const thumbnailEnhancer = ModuleController.get(ThumbnailEnhancer),
            upscaleMode: ThumbnailPerformanceMode = thumbnailEnhancer.fetchSettings("upscale"),
            clickAction: ThumbnailClickAction = thumbnailEnhancer.fetchSettings("clickAction");

        for (const json of posts) {
            const element = PostHtml.create(json, upscaleMode === ThumbnailPerformanceMode.Always);
            const post = new Post(element);

            //only append the post if it has image data
            //if it does not it is part of the anon blacklist
            if (post.getImageURL() !== undefined) {
                //Add post to the list of posts currently visible
                //This is important because InstantSearch relies on it
                Post.appendPost(post);

                //Apply blacklist before appending, to prevent image loading
                post.applyBlacklist();

                this.$postContainer.append(element);

                ThumbnailEnhancer.modifyThumbnail(element, upscaleMode, clickAction);
            }
        }
        this.isInProgress = false;
        this.$loadingIndicator.hide();

        ModuleController.getWithType<BlacklistEnhancer>(BlacklistEnhancer).updateSidebar();
        ModuleController.getWithType<InstantSearch>(InstantSearch).applyFilter();

        this.$postContainer.trigger("re621.infiniteScroll.pageLoad");

        this.nextPageToGet++;
    }

    private addPageIndicator(): void {
        const url = document.location.href;
        this.$postContainer.append($("<a>").attr("href", url).addClass("instantsearch-seperator").html(`<h2>Page: ${this.nextPageToGet}</h2>`));
    }

    /**
     * Checks if the user has scrolled down enough, so that more
     * posts should be appended
     */
    private shouldAddMore(override: boolean): boolean {
        return $(window).scrollTop() + $(window).height() > $(document).height() - 50 || override;
    }

    /**
     * Temporarily pauses the infinite scroll.  
     * This is a hack to improve MassDownloader performance.
     * @param scrollPaused True to pause the loading, false to unpause
     */
    public static pauseScroll(scrollPaused = true): void {
        InfiniteScroll.scrollPaused = scrollPaused;
    }
}
