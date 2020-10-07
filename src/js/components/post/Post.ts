import { BetterSearch } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { APIPost, PostFlag, PostRating } from "../api/responses/APIPost";
import { Blacklist } from "../data/Blacklist";
import { Tag } from "../data/Tag";
import { ModuleController } from "../ModuleController";
import { Debug } from "../utility/Debug";
import { Util } from "../utility/Util";
import { PostParts } from "./PostParts";
import { PostSet } from "./PostSet";

export class Post implements PostData {

    public $ref: JQuery<HTMLElement>;       // reference to the post's DOM object

    public id: number;
    public flags: Set<PostFlag>;
    public score: number;                   // post total score
    public user_score: number;              // user's current vote. might be undefined if no vote has been registered this session
    public favorites: number;               // total number of favorites
    public is_favorited: boolean;           // true if the post is in the user's favorites
    public comments: number;                // total number of comments
    public rating: PostRating;              // rating in the one-letter lowercase format (s, q, e)
    public uploader: number;                // uploader ID
    public page: string;                    // search page. can either be numeric, or in a- / b- format

    public date: {
        raw: string;                        // upload time, in `Fri Aug 21 2020 12:32:52 GMT-0700` format
        ago: string;                        // relative time, aka `5 minutes ago`
    };

    public tagString: string;               // string with space-separated tags. Makes outputting tags easier
    public tags: {
        all: Set<string>;
        artist: Set<string>;
        real_artist: Set<string>;           // same as artist, minus tags like `conditional_dnp` or `sound_warning`. See `Tag.isArtist()` for more info.
        copyright: Set<string>;
        species: Set<string>;
        character: Set<string>;
        general: Set<string>;
        invalid: Set<string>;               // usually empty, not sure why it even exists
        meta: Set<string>;
        lore: Set<string>;
    };

    public file: {
        ext: string;                        // file extension
        md5: string;
        original: string;                   // full-resolution image. `null` if the post is deleted
        sample: string;                     // sampled (~850px) image. for WEBM, same as original. for SFW, null or undefined
        preview: string;                    // thumbnail (150px). for SFW, null or undefined
        size: number;
        duration: number;                   // in seconds - for webm only, null for everything else
    };
    public loaded: LoadedFileType;          // currently loaded file size. used in hover loading mode

    public img: {
        width: number;
        height: number;
        ratio: number;                      // height divided by width. used to size thumbnails properly
    };

    public has: {
        file: boolean;                      // true if the post wasn't deleted, and is not on the anon blacklist
        children: boolean;                  // whether the post has any children
        parent: boolean;                    // whether the post has a parent
    };

    public rel: {
        children: Set<number>;              // IDs of child posts
        parent: number;                     // ID of the parent post
    }

    private constructor(data: PostData, $ref: JQuery<HTMLElement>) {
        for (const [key, value] of Object.entries(data)) this[key] = value;
        this.$ref = $ref;
        this.$ref.data("post", this);

        this.updateFilters();
    }

    /** Updates the post's data from the API response */
    public update(data: APIPost): Post {
        for (const [key, value] of Object.entries(PostData.fromAPI(data)))
            this[key] = value;

        this.updateFilters();

        return this;
    }

    /** Returns true if the post has been rendered, false otherwise */
    public isRendered(): boolean {
        return this.$ref.attr("rendered") == "true";
    }

    /** Returns true if the post is currently filtered out by the blacklist */
    public isBlacklisted(): boolean {
        return this.$ref.attr("blacklisted") == "true";
    }

    /** Converts the placeholder DOM into an actual post element */
    public render(): Post {

        const conf = ModuleController.get(BetterSearch).fetchSettings([
            "imageRatioChange",                                 // renderArticle
            "clickAction",                                      // renderLink
            "imageLoadMethod", "autoPlayGIFs", "hoverTags",     // renderImage
            "ribbonsFlag", "ribbonsRel",                        // renderRibbons
            "buttonsVote", "buttonsFav",                        // renderButtons
        ]);

        // Reset the article state
        this.$ref
            .attr({
                "fav": this.is_favorited == true ? "true" : undefined,
                "rendered": true,
            })
            .removeAttr("style")
            .html("");

        // Render elements
        this.$ref
            .append(PostParts.renderImage(this, conf))       // Image
            .append(PostParts.renderRibbons(this, conf))     // Ribbons
            .append(PostParts.renderButtons(this, conf))     // Voting Buttons
            .append(PostParts.renderFlags(this))             // Custom Flags
            .append(PostParts.renderInfo(this))              // Post info

        if (!conf.imageRatioChange) this.$ref.css("--img-ratio", this.img.ratio);
        if (this.file.duration) this.$ref.css("--duration", this.file.duration);

        // Refresh blacklist state
        this.updateVisibility();

        return this;
    }

    /** Resets the previously rendered post element back to placeholder state */
    public reset(): Post {

        // Remove structure
        this.$ref
            .attr({
                "rendered": false,
                "loading": false,
            })
            .html(this.id + "")
            .children().remove();

        // Unbind events
        this.$ref.off("re621:update");

        return this;
    }

    /** Refreshes the blacklist and custom flagger filters */
    public updateFilters(): Post {
        CustomFlagger.addPost(this);
        Blacklist.addPost(this);

        return this;
    }

    /**
     * Refreshes the post's blacklist status.  
     * Should be executed every time a blacklist filter is toggled.
     */
    public updateVisibility(): Post {
        if (Blacklist.checkPost(this.id)) {
            this.$ref.attr("blacklisted", "true");
            if (this.isRendered()) this.reset();
        } else this.$ref.removeAttr("blacklisted");

        return this;
    }

    /**
     * Returns a Post object that matches the provided ID.  
     * Alternatively, fetches the Post object for the provided DOM element.
     * @param post Post object, if it exists.  
     * `null` is returned if the DOM element does not exist.  
     * `undefined` is returned if the DOM element exists, but lacks data
     */
    public static get(post: number): Post;
    public static get(post: JQuery<Element>): Post;
    public static get(post: number | JQuery<Element>): Post {
        if (typeof post == "number") {
            post = $("#entry_" + post).first();
            if (post.length == 0) return null;
        }
        return post.data("post");
    }

    /**
     * Returns the currently visible post.  
     * Only applicable on the individual post page (i.e. `/posts/12345`).
     */
    public static getViewingPost(): Post {
        const container = $("#image-container");
        if (container.data("post") !== undefined) return Post.get(container);
        return new Post(PostData.fromDOM(), container);
    }

    /**
     * Returns all Post elements of the specified type
     * @param type Type to look for
     */
    public static find(type: "rendered" | "blacklisted" | "hovering" | "all"): PostSet {
        const result = new PostSet();
        switch (type) {
            case "hovering":
            case "blacklisted":
            case "rendered": {
                for (const elem of $(`post[${type}=true]`).get())
                    result.push(Post.get($(elem)));
                break;
            }
            case "all": {
                for (const elem of $(`post`).get())
                    result.push(Post.get($(elem)));
            }
        }
        return result;
    }

    /**
     * Creates a Post element with the specified parameters
     * @param data API response with post data
     * @param page Page of the search results
     * @param imageRatioChange Image crop, if applicable
     */
    public static make(data: APIPost, page?: string, imageRatioChange?: boolean): Post {

        const tags = APIPost.getTagSet(data),
            flags = PostFlag.get(data),
            animated = tags.has("animated") || data.file.ext == "webm" || data.file.ext == "gif" || data.file.ext == "swf";

        if (imageRatioChange == undefined) imageRatioChange = ModuleController.get(BetterSearch).fetchSettings("imageRatioChange");

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "entry_" + data.id,
                "fav": data.is_favorited == true ? true : undefined,
                "vote": undefined,
                "animated": animated ? "true" : undefined,
                "filetype": data.file.ext,
                "deleted": flags.has(PostFlag.Deleted) ? true : undefined,
                "rendered": false,
                "page": page,
            })
            .data({
                // Backwards compatibility for HoverZoom
                "id": data.id,
                "large-file-url": data.sample.url,
                "file-ext": data.file.ext,
            })
            .html(data.id + "");

        if (!imageRatioChange) $article.css("--img-ratio", (data.file.height / data.file.width) + "");

        const result = new Post(PostData.fromAPI(data, page), $article);

        if (!result.file.original && !result.flags.has(PostFlag.Deleted)) {
            Debug.log(`Post #${result.id} skipped: no file`);
            return null;
        }

        // Register for blacklist and custom flagger
        result.updateFilters();
        result.updateVisibility();

        return result;
    }

}

/**
 * Generalized post data that is not attached to a specific element.  
 * Generated either from an API result, or from a DOM element.
 */
export interface PostData {

    id: number;
    flags: Set<PostFlag>;
    score: number;
    user_score: number;
    favorites: number;
    is_favorited: boolean;
    comments: number;
    rating: PostRating;
    uploader: number;

    page: string;

    date: {
        raw: string;
        ago: string;
    };

    tagString: string;
    tags: {
        all: Set<string>;
        artist: Set<string>;
        real_artist: Set<string>;
        copyright: Set<string>;
        species: Set<string>;
        character: Set<string>;
        general: Set<string>;
        invalid: Set<string>;
        meta: Set<string>;
        lore: Set<string>;
    };

    file: {
        ext: string;
        md5: string;
        original: string;
        sample: string;
        preview: string;
        size: number;
        duration: number;
    };
    loaded: LoadedFileType;

    img: {
        width: number;
        height: number;
        ratio: number;
    };

    has: {
        file: boolean;
        children: boolean;
        parent: boolean;
    };

    rel: {
        children: Set<number>;
        parent: number;
    };

}

export namespace PostData {

    /**
     * Generates PostData from an API result
     * @param data API result
     * @param page Search page
     */
    export function fromAPI(data: APIPost, page?: string): PostData {

        const tags = APIPost.getTagSet(data),
            flags = PostFlag.get(data);

        return {
            id: data.id,
            flags: flags,
            score: data.score.total,
            user_score: undefined,
            favorites: data.fav_count,
            is_favorited: data.is_favorited == true,
            comments: data.comment_count,
            rating: PostRating.fromValue(data.rating),
            uploader: data.uploader_id,

            page: page,

            date: {
                raw: data.created_at == null ? data.updated_at : data.created_at,
                ago: Util.Time.ago(data.created_at == null ? data.updated_at : data.created_at),
            },

            tagString: [...tags].sort().join(" "),
            tags: {
                all: tags,
                artist: new Set(data.tags.artist),
                real_artist: new Set(data.tags.artist.filter(tag => Tag.isArtist(tag))),
                copyright: new Set(data.tags.copyright),
                species: new Set(data.tags.species),
                character: new Set(data.tags.character),
                general: new Set(data.tags.general),
                invalid: new Set(data.tags.invalid),
                meta: new Set(data.tags.meta),
                lore: new Set(data.tags.lore),
            },

            file: {
                ext: data.file.ext,
                md5: data.file.md5,
                original: data.file.url,
                sample: data.sample.has ? data.sample.url : data.file.url,
                preview: data.preview.url,
                size: data.file.size,
                duration: data.duration,
            },
            loaded: undefined,

            img: {
                width: data.file.width,
                height: data.file.height,
                ratio: data.file.height / data.file.width,
            },

            has: {
                file: data.file.url !== null,
                children: data.relationships.has_active_children,
                parent: data.relationships.parent_id !== undefined && data.relationships.parent_id !== null,
            },

            rel: {
                children: new Set(data.relationships.children),
                parent: data.relationships.parent_id,
            },

        };
    }

    /**
     * Generates PostData from a DOM element  
     * Only works on an individual post page (ex. `/posts/12345`)
     */
    export function fromDOM(): PostData {

        const $article = $("#image-container");

        const id = parseInt($article.attr("data-id")) || 0;
        const timeEl = $("#post-information").find("time");
        const time = timeEl.length != 0 ? timeEl.attr("title") : "0";

        // Children
        const children: Set<number> = new Set();
        for (const post of $("div#has-children-relationship-preview").find("article").get())
            children.add(parseInt($(post).attr("data-id")));

        // Tags
        const tagString = $article.attr("data-tags") || "";
        const artistTags = getTags("artist");

        // MD5
        let md5: string;
        if ($article.attr("data-md5")) md5 = $article.attr("data-md5");
        else if ($article.attr("data-file-url"))
            md5 = $article.attr("data-file-url").substring(36, 68);

        // Score
        let score = 0;
        if ($article.attr("data-score")) score = parseInt($article.attr("data-score"));
        else if ($article.find(".post-score-score").length !== 0)
            score = parseInt($article.find(".post-score-score").first().html().substring(1));

        // User score;
        let userScore = 0;
        if ($(".post-vote-up-" + id).first().hasClass("score-positive")) userScore = 1;
        else if ($(".post-vote-down-" + id).first().hasClass("score-negative")) userScore = -1;

        // Dimensions
        const width = parseInt($article.attr("data-width")),
            height = parseInt($article.attr("data-height"));

        return {
            id: id,
            flags: PostFlag.fromString($article.attr("data-flags") || ""),
            score: score,
            user_score: userScore,
            favorites: parseInt($article.attr("data-fav-count")) || 0,
            is_favorited: $article.attr("data-is-favorited") == "true",
            comments: -1,
            rating: PostRating.fromValue($article.attr("data-rating")),
            uploader: parseInt($article.attr("data-uploader-id")) || 0,

            page: "-1",

            date: {
                raw: time,
                ago: Util.Time.ago(time),
            },

            tagString: tagString,
            tags: {
                all: new Set(tagString.split(" ")),
                artist: artistTags,
                real_artist: new Set([...artistTags].filter(tag => Tag.isArtist(tag))),
                copyright: getTags("copyright"),
                species: getTags("species"),
                character: getTags("character"),
                general: getTags("general"),
                invalid: getTags("invalid"),
                meta: getTags("meta"),
                lore: getTags("lore"),
            },

            file: {
                ext: $article.attr("data-file-ext"),
                md5: md5,
                original: $article.attr("data-file-url") || null,
                sample: $article.attr("data-large-file-url") || null,
                preview: $article.attr("data-preview-file-url") || null,
                size: 0,
                duration: null,
            },
            loaded: undefined,

            img: {
                width: width,
                height: height,
                ratio: height / width,
            },

            has: {
                file: $article.attr("data-file-url") !== undefined,
                children: $article.attr("data-has-active-children") == "true",
                parent: $article.attr("data-parent-id") !== undefined,
            },

            rel: {
                children: children,
                parent: parseInt($article.attr("data-parent-id")) || null,
            },

        };

        function getTags(group: string): Set<string> {
            const result: Set<string> = new Set();
            for (const element of $(`#tag-list .${group}-tag-list`).children()) {
                result.add($(element).find(".search-tag").text().replace(/ /g, "_"));
            }
            return result;
        }
    }

    /**
     * Generates PostData from a DOM element  
     * Unlike `fromDOM()`, works on native thumbnails (ex. `<article>`)
     * @param $article Article to parse for data
     */
    export function fromThumbnail($article: JQuery<HTMLElement>): PostData {

        const id = parseInt($article.attr("data-id")) || 0;

        // Children
        const children: Set<number> = new Set();

        // Tags
        const tagString = $article.attr("data-tags") || "";

        // Dimensions
        const width = parseInt($article.attr("data-width")),
            height = parseInt($article.attr("data-height"));

        // MD5 and File URLs
        const extension = $article.attr("data-file-ext");
        let urls = {};
        let md5: string;
        if ($article.hasClass("post-preview")) {
            if ($article.attr("data-md5")) md5 = $article.attr("data-md5");
            else if ($article.attr("data-file-url"))
                md5 = $article.attr("data-file-url").substr(36, 32);

            urls = {
                preview: $article.attr("data-preview-file-url") || null,
                sample: $article.attr("data-large-file-url") || null,
                original: $article.attr("data-file-url") || null,
            };
        } else {
            if ($article.attr("data-md5")) md5 = $article.attr("data-md5");
            else if ($article.attr("data-preview-url"))
                md5 = $article.attr("data-preview-url").substr(44, 32);

            if (md5 == undefined) urls = {
                preview: `/images/deleted-preview.png`,
                sample: `/images/deleted-preview.png`,
                original: `/images/deleted-preview.png`,
            };
            else urls = {
                preview: $article.attr("data-preview-url") || null,
                sample: (width < 850 || height < 850)
                    ? `https://static1.e621.net/data/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.${extension}`
                    : `https://static1.e621.net/data/sample/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`,
                original: `https://static1.e621.net/data/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.${extension}`,
            }
        }

        // Date
        const rawDate = $article.attr("data-created-at") || "0";

        return {
            id: id,
            flags: PostFlag.fromString($article.attr("data-flags") || ""),
            score: parseInt($article.attr("data-score") || "0"),
            user_score: 0,
            favorites: parseInt($article.attr("data-fav-count")) || 0,
            is_favorited: $article.attr("data-is-favorited") == "true",
            comments: -1,
            rating: PostRating.fromValue($article.attr("data-rating")),
            uploader: parseInt($article.attr("data-uploader-id")) || 0,

            page: "-1",

            date: {
                raw: rawDate,
                ago: Util.Time.ago(rawDate),
            },

            tagString: tagString,
            tags: {
                all: new Set(tagString.split(" ")),
                artist: new Set(),
                real_artist: new Set(),
                copyright: new Set(),
                species: new Set(),
                character: new Set(),
                general: new Set(),
                invalid: new Set(),
                meta: new Set(),
                lore: new Set(),
            },

            file: {
                ext: extension,
                md5: md5,
                original: urls["original"],
                sample: urls["sample"],
                preview: urls["preview"],
                size: 0,
                duration: null,
            },
            loaded: undefined,

            img: {
                width: width,
                height: height,
                ratio: height / width,
            },

            has: {
                file: $article.attr("data-file-url") !== undefined,
                children: $article.attr("data-has-active-children") == "true",
                parent: $article.attr("data-parent-id") !== undefined,
            },

            rel: {
                children: children,
                parent: parseInt($article.attr("data-parent-id")) || null,
            },

        };
    }

    /**
     * Creates a thumbnail preview from an MD5 hash
     * @param md5 MD5 hash
     */
    export function createPreviewUrlFromMd5(md5: string): string {
        // Assume that the post is flash when no md5 is passed
        return md5 == ""
            ? "https://static1.e621.net/images/download-preview.png"
            : `https://static1.e621.net/data/preview/${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}.jpg`;
    }
}

export enum LoadedFileType {
    PREVIEW = "preview",
    SAMPLE = "sample",
    ORIGINAL = "original",
}
