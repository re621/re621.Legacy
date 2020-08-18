import { PostRating } from "../api/responses/APIPost";

export interface PostData {

    $ref: JQuery<HTMLElement>;

    id: number;
    flags: Set<string>;
    score: number;
    user_vote: number;
    favorites: number;
    is_favorited: boolean;
    comments: number;
    rating: PostRating;
    uploader: number;

    date: {
        raw: string;
        ago: string;
    };

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
}

export enum LoadedFileType {
    PREVIEW = "preview",
    SAMPLE = "sample",
    ORIGINAL = "original",
}
