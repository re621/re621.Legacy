import { APIPost, PostRating } from "../api/responses/APIPost";
import { Util } from "../utility/Util";

export interface PostData {

    $ref: JQuery<HTMLElement>;

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

    export function get($article: JQuery<HTMLElement>): PostData {
        const output = $article.data();
        output["$ref"] = $article;
        return output as PostData;
    }

    export function save(data: PostData): void {
        const output = jQuery.extend(true, {}, data);
        delete output.$ref;
        data.$ref.data(output);
    }

    export function set(data: PostData, element: string, value: any): void {
        data.$ref.data(element, value);
    }

    export function fromAPI(data: APIPost, page?: number): PostData {

        const tags = APIPost.getTagSet(data),
            flags = APIPost.getFlagSet(data);

        return {
            $ref: undefined,

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
                raw: data.created_at,
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
                parent: data.relationships.parent_id !== undefined,
            },

        };
    }

    export function fromDOM($article: JQuery<HTMLElement>): PostData {

        const timeEl = $("#post-information").find("time");
        const time = timeEl.length != 0 ? timeEl.attr("title") : "0";
        const tagString = $article.attr("data-tags") || "";

        const width = parseInt($article.attr("data-width")),
            height = parseInt($article.attr("data-height"));

        return {
            $ref: undefined,

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
