import { BetterSearch } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { APIPost, PostRating } from "../api/responses/APIPost";
import { Blacklist } from "../data/Blacklist";
import { Tag } from "../data/Tag";
import { ModuleController } from "../ModuleController";
import { Util } from "../utility/Util";
import { PostParts } from "./PostParts";
import { PostSet } from "./PostSet";

export class Post implements PostData {

    public $ref: JQuery<HTMLElement>;

    public id: number;
    public flags: Set<string>;
    public score: number;
    public user_score: number;
    public favorites: number;
    public is_favorited: boolean;
    public comments: number;
    public rating: PostRating;
    public uploader: number;
    public page: number;

    public date: {
        raw: string;
        ago: string;
    };

    public tagString: string;
    public tags: {
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

    public file: {
        ext: string;
        md5: string;
        original: string;
        sample: string;
        preview: string;
        size: number;
    };
    public loaded: LoadedFileType;

    public img: {
        width: number;
        height: number;
        ratio: number;
    };

    public has: {
        children: boolean;
        parent: boolean;
        parent_id: number;
    };

    private constructor(data: PostData, $ref: JQuery<HTMLElement>) {
        for (const [key, value] of Object.entries(data)) this[key] = value;
        this.$ref = $ref;
        this.$ref.data("post", this);

        this.updateFilters();
    }

    public update(data: APIPost): Post {
        for (const [key, value] of Object.entries(PostData.fromAPI(data)))
            this[key] = value;

        this.updateFilters();

        return this;
    }

    public render(): Post {

        const conf = ModuleController.get(BetterSearch).fetchSettings([
            "imageRatioChange",                                 // renderArticle
            "clickAction", "zoomMode",                          // renderLink
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

        // Refresh blacklist state
        this.updateVisibility();

        return this;
    }

    public reset(): Post {
        this.$ref
            .attr({
                "rendered": false,
                "loading": false,
            })
            .html(this.id + "")
            .children().remove();

        if (this.$ref.data("gif-interval") !== undefined) {
            window.clearInterval(this.$ref.data("gif-interval"));
            this.$ref.data("gif-interval", undefined);
        }
        if (this.$ref.data("gif-freezefr") !== undefined) {
            this.$ref.data("gif-freezefr").destroy();
            this.$ref.data("gif-freezefr", undefined);
        }

        return this;
    }

    public updateFilters(): Post {
        CustomFlagger.addPost(this);
        Blacklist.addPost(this);

        return this;
    }

    public updateVisibility(): Post {
        if (Blacklist.checkPost(this.id))
            this.$ref.attr("blacklisted", "true");
        else this.$ref.removeAttr("blacklisted");

        return this;
    }

    public static get(post: number): Post;
    public static get(post: JQuery<Element>): Post;
    public static get(post: number | JQuery<Element>): Post {
        if (typeof post == "number") {
            post = $("#entry_" + post).first();
            if (post.length == 0) return null;
        }
        return post.data("post");
    }

    public static getViewingPost(): Post {
        const container = $("#image-container");
        if (container.data("post") !== undefined) return Post.get(container);
        return new Post(PostData.fromDOM(), container);
    }

    public static find(type: "rendered" | "blacklisted" | "all"): PostSet {
        const result = new PostSet();
        switch (type) {
            case "blacklisted":
            case "rendered": {
                for (const elem of $(`post[${type}=true]`).get())
                    result.push(Post.get($(elem)));
            }
            case "all": {
                for (const elem of $(`post`).get())
                    result.push(Post.get($(elem)));
            }
        }
        return result;
    }

    public static make(data: APIPost, page?: number, imageRatioChange?: boolean): Post {

        const tags = APIPost.getTagSet(data),
            flags = APIPost.getFlagSet(data),
            animated = tags.has("animated") || data.file.ext == "webm" || data.file.ext == "gif" || data.file.ext == "swf";

        if (imageRatioChange == undefined) imageRatioChange = ModuleController.get(BetterSearch).fetchSettings("imageRatioChange");

        // Image container and post data store
        const $article = $("<post>")
            .attr({
                "id": "entry_" + data.id,
                "fav": data.is_favorited == true ? "true" : undefined,
                "vote": undefined,
                "animated": animated ? "true" : undefined,
                "filetype": data.file.ext,
                "deleted": flags.has("deleted") ? "true" : undefined,
                "rendered": false,
                "page": page,
            })
            .html(data.id + "");

        if (!imageRatioChange) $article.css("--img-ratio", (data.file.height / data.file.width) + "");

        const result = new Post(PostData.fromAPI(data, page), $article);

        // Register for blacklist and custom flagger
        result.updateFilters();
        result.updateVisibility();

        return result;
    }

}

export interface PostData {

    id: number;
    flags: Set<string>;
    score: number;
    user_score: number;
    favorites: number;
    is_favorited: boolean;
    comments: number;
    rating: PostRating;
    uploader: number;

    page: number;

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
    };
    loaded: LoadedFileType;

    img: {
        width: number;
        height: number;
        ratio: number;
    };

    has: {
        children: boolean;
        parent: boolean;
        parent_id: number;
    };

}

export namespace PostData {

    export function fromAPI(data: APIPost, page?: number): PostData {

        const tags = APIPost.getTagSet(data),
            flags = APIPost.getFlagSet(data);

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
                ago: Util.Time.ago(data.created_at),
            },

            tagString: [...tags].sort().join(" "),
            tags: {
                all: tags,
                artist: new Set(data.tags.artist),
                real_artist: new Set(data.tags.artist.filter(tag => Tag.isArist(tag))),
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
                sample: data.sample.url,
                preview: data.preview.url,
                size: data.file.size,
            },
            loaded: undefined,

            img: {
                width: data.file.width,
                height: data.file.height,
                ratio: data.file.height / data.file.width,
            },

            has: {
                children: data.relationships.has_active_children,
                parent: data.relationships.parent_id !== undefined && data.relationships.parent_id !== null,
                parent_id: data.relationships.parent_id,
            },

        };
    }

    export function fromDOM(): PostData {

        const $article = $("#image-container");

        const id = parseInt($article.attr("data-id")) || 0;
        const timeEl = $("#post-information").find("time");
        const time = timeEl.length != 0 ? timeEl.attr("title") : "0";

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
            flags: new Set(($article.attr("data-flags") || "").split(" ")),
            score: score,
            user_score: userScore,
            favorites: parseInt($article.attr("data-fav-count")) || 0,
            is_favorited: $article.attr("data-is-favorited") == "true",
            comments: -1,
            rating: PostRating.fromValue($article.attr("data-rating")),
            uploader: parseInt($article.attr("data-uploader-id")) || 0,

            page: -1,

            date: {
                raw: time,
                ago: Util.Time.ago(time),
            },

            tagString: tagString,
            tags: {
                all: new Set(tagString.split(" ")),
                artist: artistTags,
                real_artist: new Set([...artistTags].filter(tag => Tag.isArist(tag))),
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
                original: $article.attr("data-file-url"),
                sample: $article.attr("data-large-file-url"),
                preview: $article.attr("data-preview-file-url"),
                size: 0,
            },
            loaded: undefined,

            img: {
                width: width,
                height: height,
                ratio: height / width,
            },

            has: {
                children: $article.attr("data-has-active-children") == "true",
                parent: $article.attr("data-parent-id") !== undefined,
                parent_id: parseInt($article.attr("data-parent-id")) || null,
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
