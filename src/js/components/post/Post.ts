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
import { PostViewer } from "../../modules/post/PostViewer";

export class Post implements PostData {

    public $ref: JQuery<HTMLElement>;       // reference to the post's DOM object

    public id: number;
    public flags: Set<PostFlag>;
    public score: {
        up: number;
        down: number;
        total: number;
    }
    public user_score: number;              // user's current vote. might be undefined if no vote has been registered this session
    public favorites: number;               // total number of favorites
    public is_favorited: boolean;           // true if the post is in the user's favorites
    public comments: number;                // total number of comments
    public rating: PostRating;              // rating in the one-letter lowercase format (s, q, e)
    public uploader: number;                // uploader ID
    public uploaderName: string;            // name of the uploader; probably not available
    public approver: number;                // approver ID, or -1 if there isn't one
    public page: string;                    // search page. can either be numeric, or in a- / b- format

    public date: {
        iso: string;                        // upload time, in `Fri Aug 21 2020 12:32:52 GMT-0700` format
        ago: string;                        // relative time, aka `5 minutes ago`
        obj: Date;                          // date object
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
    tagCategoriesKnown: boolean;            // false if the data is scraped from the page, and is thus missing tag category data

    public sources: string[];
    public description: string;

    public file: {
        ext: FileExtension;                 // file extension
        md5: string;
        original: string;                   // full-resolution image. `null` if the post is deleted
        sample: string;                     // sampled (~850px) image. for WEBM, same as original. for SWF, null or undefined
        preview: string;                    // thumbnail (150px). for SWF, null or undefined
        size: number;
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
        sample: boolean;                    // whether the post has a sampled version
    };

    public rel: {
        children: Set<number>;              // IDs of child posts
        parent: number;                     // ID of the parent post
    }

    public meta: {
        duration: number;                   // in seconds - for webm only, null for everything else
        animated: boolean;                  // file is animated in any way (gif, webm, swf, etc)
        sound: boolean;                     // file has sound effects of any kind
        interactive: boolean;               // file has interactive elements (webm / swf)
    }

    public warning: {
        sound: boolean;                     // file is marked with a sound warning
        epilepsy: boolean;                  // file is marked with epilepsy warning
    }

    private constructor(data: PostData, $ref: JQuery<HTMLElement>) {
        for (const [key, value] of Object.entries(data)) this[key] = value;
        this.$ref = $ref;
        this.$ref.data("wfpost", this);

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
            "imageLoadMethod", "hoverTags",                     // renderImage
            "autoPlayGIFs", "maxPlayingGIFs",
            "ribbonsFlag", "ribbonsRel",                        // renderRibbons
            "buttonsVote", "buttonsFav",                        // renderButtons
        ]);

        // Get upvoteOnFavorite setting from PostViewer
        conf.upvoteOnFavorite = ModuleController.get(PostViewer).fetchSettings("upvoteOnFavorite");

        // Clean up older events and data
        PostParts.cleanup(this);

        // Reset the article state
        this.$ref
            .attr({
                "fav": this.is_favorited == true ? "true" : undefined,
                "rendered": true,
            })
            .removeAttr("style")
            .removeAttr("error")
            .html("");

        // Render elements
        this.$ref
            .append(PostParts.renderImage(this, conf))       // Image
            .append(PostParts.renderRibbons(this, conf))     // Ribbons
            .append(PostParts.renderButtons(this, conf))     // Voting Buttons
            .append(PostParts.renderFlags(this))             // Custom Flags
            .append(PostParts.renderInfo(this))              // Post info

        if (!conf.imageRatioChange) this.$ref.css("--img-ratio", this.img.ratio);
        if (this.meta.duration) this.$ref.css("--duration", this.meta.duration);

        // Refresh blacklist state
        this.updateVisibility();

        return this;
    }

    /** Resets the previously rendered post element back to placeholder state */
    public reset(): Post {

        // Clean up attached events and data
        PostParts.cleanup(this);

        // Remove structure
        this.$ref
            .attr({
                "rendered": false,
                "loading": false,
            })
            .removeAttr("error")
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
        const state = Blacklist.checkPostAlt(this.id);
        if (state) {
            if (state == 1) {
                this.$ref.attr("blacklisted", "true");
                if (this.isRendered()) this.reset();
            } else this.$ref.attr("blacklisted", "maybe");
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
    public static get(post: Element): Post;
    public static get(post: JQuery<Element>): Post;
    public static get(type: "first" | "last" | "random"): Post;
    public static get(post: number | Element | JQuery<Element> | string): Post {
        if (typeof post == "number") {
            post = $("#entry_" + post).first();
            if (post.length == 0) return null;
        } else if (typeof post == "string") {
            switch (post) {
                case "first": {
                    post = $("post").first();
                    if (post.length == 0) return null;
                    break;
                }
                case "last": {
                    post = $("post").last();
                    if (post.length == 0) return null;
                    break;
                }
                case "random": {
                    const posts = $("post");
                    if (posts.length == 0) return null;
                    const index = Math.floor(Math.random() * posts.length);
                    post = posts.eq(index);
                    break;
                }
                default: { return null; }
            }
        }
        return $(post).data("wfpost");
    }

    /**
     * Returns the currently visible post.  
     * Only applicable on the individual post page (i.e. `/posts/12345`).
     */
    public static getViewingPost(): Post {
        const container = $("#image-container");
        if (container.data("wfpost") !== undefined) return Post.get(container);
        return new Post(PostData.fromDOM(), container);
    }

    /**
     * Returns all Post elements of the specified type
     * @param type Type to look for
     */
    public static find(type: "rendered" | "blacklisted" | "hovering" | "visible" | "existant" | "all" | number): PostSet {
        const result = new PostSet();

        // Return posts up to specified ID
        if (typeof type == "number") {
            for (const elem of $(`post`).get()) {
                const post = Post.get($(elem));
                if (post.id == type) break;
                result.push(post);
            }
            return result;
        }

        // Normal types
        switch (type) {
            case "hovering":
            case "blacklisted":
            case "rendered": {
                for (const elem of $(`post[${type}=true]`).get())
                    result.push(Post.get($(elem)));
                break;
            }
            case "visible": {
                for (const elem of $(`post:not([blacklisted=true])`).get())
                    result.push(Post.get($(elem)));
                break;
            }
            case "existant": {
                for (const elem of $(`post:not([deleted=true])`).get())
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

        const post = PostData.fromAPI(data, page);

        // Fallback for a rare error where post data fails to load
        // In that case, the post gets sent into the shadow realm
        if (!post.file.original && !post.flags.has(PostFlag.Deleted)) {
            Debug.log(`Post #${post.id} skipped: no file`);
            return null;
        }

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "entry_" + post.id,
                "fav": post.is_favorited == true ? true : undefined,
                "vote": undefined,
                "animated": post.meta.animated ? "true" : undefined,
                "sound": post.meta.sound ? "true" : undefined,
                "filetype": post.file.ext,
                "deleted": post.flags.has(PostFlag.Deleted) ? true : undefined,
                "rendered": false,
                "page": page,
            })
            .data({
                // Backwards compatibility for HoverZoom
                "id": post.id,
                "large-file-url": post.file.sample,
                "file-ext": post.file.ext,
            })
            .html(post.id + "");

        if (imageRatioChange == undefined) imageRatioChange = ModuleController.get(BetterSearch).fetchSettings("imageRatioChange");
        if (!imageRatioChange) $article.css("--img-ratio", post.img.ratio + "");

        const result = new Post(post, $article);

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
    score: {
        up: number;
        down: number;
        total: number;
    };
    user_score: number;
    favorites: number;
    is_favorited: boolean;
    comments: number;
    rating: PostRating;
    uploader: number;
    uploaderName: string;
    approver: number;

    page: string;

    date: {
        iso: string;
        ago: string;
        obj: Date;
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
    tagCategoriesKnown: boolean;

    sources: string[];
    description: string;

    file: {
        ext: FileExtension;
        md5: string;
        original: string;
        sample: string;
        preview: string;
        size: number;
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
        sample: boolean;
    };

    rel: {
        children: Set<number>;
        parent: number;
    };

    meta: {
        duration: number;
        animated: boolean;
        sound: boolean;
        interactive: boolean;
    };

    warning: {
        sound: boolean;
        epilepsy: boolean;
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
            score: {
                up: data.score.up,
                down: data.score.down,
                total: data.score.total
            },
            user_score: undefined,
            favorites: data.fav_count,
            is_favorited: data.is_favorited == true,
            comments: data.comment_count,
            rating: PostRating.fromValue(data.rating),
            uploader: data.uploader_id,
            uploaderName: data["uploader_name"] || "",
            approver: data.approver_id ? data.approver_id : -1,

            page: page,

            date: {
                iso: data.created_at == null ? data.updated_at : data.created_at,
                ago: Util.Time.ago(data.created_at == null ? data.updated_at : data.created_at),
                obj: new Date(data.created_at == null ? data.updated_at : data.created_at),
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
            tagCategoriesKnown: true,

            sources: data.sources,
            description: data.description,

            file: {
                ext: FileExtension.fromString(data.file.ext),
                md5: data.file.md5,
                original: data.file.url,
                sample: data.sample.has ? data.sample.url : data.file.url,
                preview: data.preview.url,
                size: data.file.size,
            },
            loaded: undefined,

            img: {
                width: data.file.width,
                height: data.file.height,
                ratio: Util.Math.round(data.file.height / data.file.width, 2),
            },

            has: {
                file: data.file.url !== null,
                children: data.relationships.has_active_children,
                parent: data.relationships.parent_id !== undefined && data.relationships.parent_id !== null,
                sample: data.sample.has,
            },

            rel: {
                children: new Set(data.relationships.children),
                parent: data.relationships.parent_id,
            },

            meta: {
                duration: data.duration,
                animated: tags.has("animated") || data.file.ext == "webm" || data.file.ext == "gif" || data.file.ext == "swf",
                sound: tags.has("sound"),
                interactive: data.file.ext == "webm" || data.file.ext == "swf",
            },

            warning: {
                sound: tags.has("sound_warning"),
                epilepsy: tags.has("epilepsy_warning"),
            },

        };
    }

    /**
     * Generates PostData from a DOM element  
     * Only works on an individual post page (ex. `/posts/12345`)
     */
    export function fromDOM(): PostData {

        const $article = $("#image-container");
        const data: APIPost = JSON.parse($article.attr("data-post"));

        // Fetch tags - the existant ones are insufficient
        data["tags"] = {
            artist: getTags("artist"),
            character: getTags("character"),
            copyright: getTags("copyright"),
            general: getTags("general"),
            invalid: getTags("invalid"),
            lore: getTags("lore"),
            meta: getTags("meta"),
            species: getTags("species"),
        };
        data["uploader_name"] = $article.attr("data-uploader");

        // Sources formatting is incorrect
        // All sources are dumped into the first element, separated by newlines
        if (data.sources.length > 0)
            data.sources = data.sources[0].split("\n");

        // Rating is missing from the data
        data.rating = PostRating.fromValue($article.attr("data-rating"));

        // Restore the preview image. Not used anywhere, but avoids an error.
        const md5 = data["file"]["md5"],
            md52 = md5.substr(0, 2);
        data["preview"] = {
            "width": -1,
            "height": -1,
            "url": `https://static1.e621.net/data/preview/${md52}/${md52}/${md5}.jpg`
        };

        return PostData.fromAPI(data);

        function getTags(group: string): string[] {
            const result: string[] = [];
            for (const element of $(`#tag-list .${group}-tag-list`).children()) {
                result.push($(element).find(".search-tag").text().replace(/ /g, "_"));
            }
            return result;
        }
    }

    /**
     * Generates PostData from a DOM element  
     * Unlike `fromDOM()`, works on native thumbnails (ex. `<article>`)
     * @param $article Article to parse for data
     */
    export function fromThumbnail($article: JQuery<HTMLElement>, cached = true): PostData {

        // Cache the data, since the calculations below cause some lag that is
        // noticeable when this has to be done on the fly, like in HoverZoom.
        // TODO Actually optimize the code below
        if (cached && $article.data("wfpost"))
            return $article.data("wfpost");

        const id = parseInt($article.attr("data-id")) || 0;

        // Children
        const children: Set<number> = new Set();

        // Tags
        const tagString = $article.attr("data-tags") || "",
            tagSet = new Set(tagString.split(" "));

        // Uploader
        // This is slightly nuts
        const approverLink = $("#post-information li a.user-post-approver");
        const approver = approverLink.length > 0
            ? (parseInt(approverLink.attr("href").replace("/users/", "")) || -1)
            : -1;

        // Dimensions
        const width = parseInt($article.attr("data-width")),
            height = parseInt($article.attr("data-height"));

        // MD5 and File URLs
        const extension: FileExtension = FileExtension.fromString($article.attr("data-file-ext"));
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
            else {
                urls = {
                    preview: $article.attr("data-preview-url")
                        ? $article.attr("data-preview-url")
                        : `https://static1.e621.net/data/preview/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`,
                    sample: $article.attr("data-large-file-url")    // This is horrifying.
                        ? $article.attr("data-large-file-url")      // I am truly sorry...
                        : ((width < 850 || height < 850 || extension == "gif")
                            ? `https://static1.e621.net/data/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.${extension}`
                            : `https://static1.e621.net/data/sample/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.jpg`),
                    original: `https://static1.e621.net/data/${md5.substr(0, 2)}/${md5.substr(2, 2)}/${md5}.${extension}`,
                };
            }
        }

        // Date
        const rawDate = $article.attr("data-created-at") || "0";

        // Score
        const score = parseInt($article.attr("data-score") || "0");

        const result = {
            id: id,
            flags: PostFlag.fromString($article.attr("data-flags") || ""),
            score: {
                up: score > 0 ? score : 0,
                down: score < 0 ? score : 0,
                total: score,
            },
            user_score: 0,
            favorites: parseInt($article.attr("data-fav-count")) || 0,
            is_favorited: $article.attr("data-is-favorited") == "true",
            comments: -1,
            rating: PostRating.fromValue($article.attr("data-rating")),
            uploader: parseInt($article.attr("data-uploader-id")) || 0,
            uploaderName: $article.attr("data-uploader") || "Unknown",
            approver: approver,

            page: "-1",

            date: {
                iso: rawDate,
                ago: Util.Time.ago(rawDate),
                obj: new Date(rawDate),
            },

            tagString: tagString,
            tags: {
                all: tagSet,
                artist: new Set<string>(),
                real_artist: new Set<string>(),
                copyright: new Set<string>(),
                species: new Set<string>(),
                character: new Set<string>(),
                general: new Set<string>(),
                invalid: new Set<string>(),
                meta: new Set<string>(),
                lore: new Set<string>(),
            },
            tagCategoriesKnown: false,

            sources: [],
            description: "",

            file: {
                ext: extension,
                md5: md5,
                original: urls["original"],
                sample: urls["sample"],
                preview: urls["preview"],
                size: parseInt($article.attr("data-filesize") || "0"),
            },
            loaded: undefined,

            img: {
                width: width,
                height: height,
                ratio: height / width,
            },

            has: {
                file: $article.attr("data-file-url") !== undefined,
                children: $article.hasClass("post-status-has-children") || $article.attr("data-has-active-children") == "true",
                parent: $article.hasClass("post-status-has-parent") || $article.attr("data-parent-id") !== undefined,
                sample: urls["original"] !== urls["sample"],
            },

            rel: {
                children: children,
                parent: parseInt($article.attr("data-parent-id")) || null,
            },

            meta: {
                duration: null,
                animated: tagSet.has("animated") || extension == "webm" || extension == "gif" || extension == "swf",
                sound: tagSet.has("sound"),
                interactive: extension == "webm" || extension == "swf",
            },

            warning: {
                sound: tagSet.has("sound_warning"),
                epilepsy: tagSet.has("epilepsy_warning"),
            },

        };
        $article.data("wfpost", result);
        return result;
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

export enum FileExtension {
    JPG = "jpg",
    PNG = "png",
    GIF = "gif",
    SWF = "swf",
    WEBM = "webm",
}

export namespace FileExtension {
    export function fromString(input: string): FileExtension {
        switch (input) {
            case "jpeg":
            case "jpg": return FileExtension.JPG;
            case "png": return FileExtension.PNG;
            case "gif": return FileExtension.GIF;
            case "swf": return FileExtension.SWF;
            case "webm": return FileExtension.WEBM;
        }
        return null;
    }
}
