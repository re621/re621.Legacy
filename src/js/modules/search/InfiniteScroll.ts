import { Danbooru } from "../../components/api/Danbooru";
import { E621 } from "../../components/api/E621";
import { PostHtml } from "../../components/api/PostHtml";
import { APIPost } from "../../components/api/responses/APIPost";
import { Page, PageDefintion } from "../../components/data/Page";
import { Post } from "../../components/data/Post";
import { ModuleController } from "../../components/ModuleController";
import { RE6Module, Settings } from "../../components/RE6Module";
import { BlacklistEnhancer } from "./BlacklistEnhancer";
import { InstantSearch } from "./InstantSearch";
import { ThumbnailClickAction, ThumbnailEnhancer, ThumbnailPerformanceMode } from "./ThumbnailsEnhancer";

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

    private currentPage: number;
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

        this.$loadingIndicator = $("<div>")
            .attr("id", "re-infinite-scroll-loading")
            .html(`<i class="fas fa-circle-notch fa-5x fa-spin"></i>`)
            .insertAfter(this.$postContainer);
        this.$loadingIndicator.hide();

        this.$nextButton = $("<a>").text("Load next").on("click", () => {
            this.addMorePosts(true);
        });
        this.$nextButton
            .attr("id", "re-infinite-scroll-next")
            .addClass("text-center")
            .insertAfter(this.$postContainer);

        this.currentQuery = Page.getQueryParameter("tags") !== null ? Page.getQueryParameter("tags") : "";

        this.currentPage = parseInt(Page.getQueryParameter("xpage")) || 1;
        this.isInProgress = false;
        this.pagesLeft = true;

        // Wait until all images are loaded, to prevent fetching posts 
        // while the layout is still changing
        $(async () => {
            // Load previous result pages on document load
            let processingPage = 2;
            while (processingPage <= this.currentPage) {
                await this.loadPage(processingPage, {
                    scrollToPage: true,
                    lazyload: false,
                });
                processingPage++;
            }

            $("img.later-lazyload").removeClass("later-lazyload").addClass("lazyload");

            // Load the next result page when scrolled to the bottom
            let timer: number;
            $(window).scroll(() => {
                if (timer) return;
                timer = window.setTimeout(async () => {
                    await this.addMorePosts();
                    timer = null;
                }, 1000);
            });
        });
    }

    public destroy(): void {
        super.destroy();
        this.$nextButton.remove();
    }

    /**
     * Adds more posts to the site, if the user has scrolled down enough
     */
    private async addMorePosts(override = false): Promise<boolean> {
        if (!this.isEnabled() || this.isInProgress || !this.pagesLeft || !this.shouldAddMore(override) || InfiniteScroll.scrollPaused) {
            return Promise.resolve(false);
        }

        const pageLoaded = await this.loadPage(this.currentPage + 1);
        if (pageLoaded) {
            Page.setQueryParameter("xpage", (this.currentPage + 1).toString());
            this.currentPage++;
            this.$postContainer.trigger("re621.infiniteScroll.pageLoad");
        }
        return Promise.resolve(pageLoaded);
    }

    private async loadPage(page: number, options = { scrollToPage: false, lazyload: true }): Promise<boolean> {
        this.isInProgress = true;
        this.$loadingIndicator.show();

        const posts = await E621.Posts.get<APIPost>({ tags: this.currentQuery, page: page }, 500);
        if (posts.length === 0) {
            this.pagesLeft = false;
            this.$loadingIndicator.hide();
            this.$nextButton.hide();
            Danbooru.notice("No more posts!");
            return Promise.resolve(false);
        }

        $("<a>")
            .attr({
                "href": document.location.href,
                "id": "xpage-link-" + page
            })
            .addClass("instantsearch-seperator")
            .html("<h2>Page: " + page + "</h2>")
            .appendTo(this.$postContainer);

        if (options.scrollToPage) {
            $([document.documentElement, document.body]).animate({
                scrollTop: $("a#xpage-link-" + page).offset().top
            }, '0');
        }

        const thumbnailEnhancer = ModuleController.get(ThumbnailEnhancer),
            upscaleMode: ThumbnailPerformanceMode = thumbnailEnhancer.fetchSettings("upscale"),
            clickAction: ThumbnailClickAction = thumbnailEnhancer.fetchSettings("clickAction");

        const promises: Promise<void>[] = [];
        for (const json of posts) {
            promises.push(new Promise((resolve) => {
                const element = PostHtml.create(json, options.lazyload, upscaleMode === ThumbnailPerformanceMode.Always);
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

                resolve();
            }));
        }

        Promise.all(promises).then(() => {
            this.isInProgress = false;
            this.$loadingIndicator.hide();

            const blacklistEnhancer = ModuleController.getWithType<BlacklistEnhancer>(BlacklistEnhancer),
                instantSearch = ModuleController.getWithType<InstantSearch>(InstantSearch);
            if (blacklistEnhancer.isInitialized()) blacklistEnhancer.updateSidebar();
            if (instantSearch.isInitialized()) instantSearch.applyFilter();
        });

        return Promise.resolve(true);
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
