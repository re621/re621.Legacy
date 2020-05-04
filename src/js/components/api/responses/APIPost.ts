export interface APIPost extends APIResponse {
    id: number;
    created_at: string;
    updated_at: string;
    file: File;
    preview: Preview;
    sample: Sample;
    score: Score;
    tags: Tags;
    locked_tags: string[];
    change_seq: number;
    flags: Flags;
    rating: PostRating;
    fav_count: number;
    sources: string[];
    pools: number[];
    relationships: Relationships;
    approver_id?: number;
    uploader_id: number;
    description: string;
    comment_count: number;
    is_favorited?: boolean;
}

interface Relationships {
    parent_id?: number;
    has_children: boolean;
    has_active_children: boolean;
    children: number[];
}

interface Flags {
    pending: boolean;
    flagged: boolean;
    note_locked: boolean;
    status_locked: boolean;
    rating_locked: boolean;
    deleted: boolean;
}

interface Tags {
    general: string[];
    species: string[];
    character: string[];
    copyright: string[];
    artist: string[];
    invalid: string[];
    lore: string[];
    meta: string[];
}

interface Score {
    up: number;
    down: number;
    total: number;
}

interface Sample {
    has: boolean;
    height: number;
    width: number;
    url: string;
}

interface Preview {
    width: number;
    height: number;
    url: string;
}

interface File {
    width: number;
    height: number;
    ext: string;
    size: number;
    md5: string;
    url: string;
}

export enum PostRating {
    Safe = "s",
    Questionable = "q",
    Explicit = "e"
}

export namespace PostRating {
    export function fromValue(value: string): PostRating {
        for (const key of Object.keys(PostRating)) {
            if (PostRating[key] === value) {
                return PostRating[key];
            }
        }
        return undefined;
    }

    export function toString(postRating: PostRating): string {
        for (const key of Object.keys(PostRating)) {
            if (PostRating[key] === postRating) {
                return key;
            }
        }
        return undefined;
    }
}

export namespace APIPost {

    export function getTags(post: APIPost): string[] {
        return [
            ...post.tags.artist,
            ...post.tags.character,
            ...post.tags.copyright,
            ...post.tags.general,
            ...post.tags.invalid,
            ...post.tags.lore,
            ...post.tags.meta,
            ...post.tags.species
        ];
    }

    export function getTagString(post: APIPost): string {
        return APIPost.getTags(post).join(" ");
    }

    export function getFlagString(post: APIPost): string {
        const flags = [];
        if (post.flags.deleted) {
            flags.push("deleted");
        }
        if (post.flags.flagged) {
            flags.push("flagged");
        }
        if (post.flags.pending) {
            flags.push("pending");
        }
        return flags.join(" ");
    }

    export function fromDomElement($element: JQuery<HTMLElement>): APIPost {
        let md5: string;
        const deletedUrl = "/images/deleted-preview.png";
        if ($element.attr("data-md5")) {
            md5 = $element.attr("data-md5");
        } else if ($element.attr("data-file-url")) {
            md5 = $element.attr("data-file-url").substring(36, 68);
        }
        const ext = $element.attr("data-file-ext");
        let score: number;
        if ($element.attr("data-score")) {
            score = parseInt($element.attr("data-score"));
        }
        else if ($element.find(".post-score-score").length !== 0) {
            score = parseInt($element.find(".post-score-score").first().html().substring(1));
        }
        const result: APIPost = {
            error: "",
            id: parseInt($element.attr("data-id")),
            change_seq: -1,
            comment_count: -1,
            created_at: "",
            description: "",
            fav_count: -1,
            file: {
                ext: ext,
                height: -1,
                width: -1,
                md5: md5,
                size: -1,
                url: md5 === undefined ? deletedUrl : `https://static1.e621.net/data/${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}.${ext}`
            },
            flags: {
                deleted: false,
                flagged: false,
                note_locked: false,
                pending: false,
                rating_locked: false,
                status_locked: false
            },
            locked_tags: [],
            pools: [],
            preview: {
                height: -1,
                width: -1,
                url: md5 === undefined ? deletedUrl : `https://static1.e621.net/data/preview/${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}.jpg`
            },
            rating: PostRating.fromValue($element.attr("data-rating")),
            relationships: {
                children: [],
                has_active_children: false,
                has_children: false
            },
            sample: {
                has: true,
                height: -1,
                width: -1,
                url: md5 === undefined ? deletedUrl : `https://static1.e621.net/data/sample/${md5.substring(0, 2)}/${md5.substring(2, 4)}/${md5}.jpg`
            },
            score: {
                down: 0,
                total: score,
                up: 0
            },
            sources: [],
            tags: {
                artist: [],
                character: [],
                copyright: [],
                general: $element.attr("data-tags").split(" "),
                invalid: [],
                lore: [],
                meta: [],
                species: []
            },
            updated_at: "",
            uploader_id: parseInt($element.attr("data-uploader-id")),
        }
        return result;
    }
}
