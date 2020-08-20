import { BetterSearch } from "../../modules/search/BetterSearch";
import { CustomFlagger } from "../../modules/search/CustomFlagger";
import { APIPost, PostRating } from "../api/responses/APIPost";
import { Blacklist } from "../data/Blacklist";
import { ModuleController } from "../ModuleController";
import { Util } from "../utility/Util";
import { PostParts } from "./PostParts";
import { PostSet } from "./PostSet";

export class Post implements PostData {

    public $ref: JQuery<HTMLElement>;

    public id: number;
    public flags: Set<string>;
    public score: number;
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
            .attr({ "rendered": false, })
            .html(this.id + "")
            .children().remove();

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
            animated = tags.has("animated") || data.file.ext == "webm" || data.file.ext == "gif";

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
            },

        };
    }

    export function fromDOM($article: JQuery<HTMLElement>): PostData {

        const timeEl = $("#post-information").find("time");
        const time = timeEl.length != 0 ? timeEl.attr("title") : "0";
        const tagString = $article.attr("data-tags") || "";

        const md5match = /\/\S{2}\/\S{2}\/(\S{32})\.\w+/g.exec($article.attr("data-file-url"));
        const md5 = md5match !== null ? md5match[1] : null;

        const width = parseInt($article.attr("data-width")),
            height = parseInt($article.attr("data-height"));

        return {
            id: parseInt($article.attr("data-id")) || 0,
            flags: new Set(($article.attr("data-flags") || "").split(" ")),
            score: parseInt($article.attr("data-score")) || 0,
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
                artist: new Set(),
                copyright: new Set(),
                species: new Set(),
                character: new Set(),
                general: new Set(),
                invalid: new Set(),
                meta: new Set(),
                lore: new Set(),
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
            },

        };
    }
}

export enum LoadedFileType {
    PREVIEW = "preview",
    SAMPLE = "sample",
    ORIGINAL = "original",
}
