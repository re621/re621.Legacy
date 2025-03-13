import { APIResponse } from "./APIResponse";

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
    duration: number;
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
    contributor: string[];
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
    Explicit = "e",
}

enum PostRatingAliases {
    "s" = PostRating.Safe,
    "safe" = PostRating.Safe,
    "q" = PostRating.Questionable,
    "questionable" = PostRating.Questionable,
    "e" = PostRating.Explicit,
    "explicit" = PostRating.Explicit,
}

export enum PostFlag {
    /** Post in the modqueue that has not been approved / disapproved yet */
    Pending = "pending",
    /** Post that has been flagged for moderation - duplicate, DNP, etc */
    Flagged = "flagged",
    /** Post that has been deleted. Indicates that the image file will return `null` */
    Deleted = "deleted",

    // Not working correctly
    // NoteLocked = "note_locked",
    // StatusLocked = "status_locked",
    // RatingLocked = "rating_locked",
}

export namespace PostFlag {

    export function get (post: APIPost): Set<PostFlag> {
        const flags: Set<PostFlag> = new Set();
        if (post.flags.deleted) flags.add(PostFlag.Deleted);
        if (post.flags.flagged) flags.add(PostFlag.Flagged);
        if (post.flags.pending) flags.add(PostFlag.Pending);
        return flags;
    }

    export function getString (post: APIPost): string {
        return [...PostFlag.get(post)].join(" ");
    }

    export function fromSingle (input: string): PostFlag {
        input = input.toLowerCase().trim();
        switch (input) {
            case "pending": return PostFlag.Pending;
            case "flagged": return PostFlag.Flagged;
            case "deleted": return PostFlag.Deleted;
        }
        return null;
    }

    export function fromString (input: string): Set<PostFlag> {
        const parts = new Set(input.split(" "));
        const flags: Set<PostFlag> = new Set();
        if (parts.has("deleted")) flags.add(PostFlag.Deleted);
        if (parts.has("flagged")) flags.add(PostFlag.Flagged);
        if (parts.has("pending")) flags.add(PostFlag.Pending);
        return flags;
    }

}

export namespace PostRating {
    export function fromValue (value: string): PostRating {
        return PostRatingAliases[value];
    }

    export function toString (postRating: PostRating): string {
        for (const key of Object.keys(PostRating)) {
            if (PostRating[key] === postRating) {
                return key;
            }
        }
        return undefined;
    }

    export function toFullString (postRating: PostRating): string {
        switch (postRating.toLowerCase()) {
            case "s": return "safe";
            case "q": return "questionable";
            case "e": return "explicit";
        }
        return null;
    }
}

export namespace APIPost {

    export function getTags (post: APIPost): string[] {
        return [
            ...post.tags.artist,
            ...post.tags.contributor,
            ...post.tags.character,
            ...post.tags.copyright,
            ...post.tags.general,
            ...post.tags.invalid,
            ...post.tags.lore,
            ...post.tags.meta,
            ...post.tags.species,
        ];
    }

    export function getTagString (post: APIPost): string {
        return APIPost.getTags(post).join(" ");
    }

    export function getTagSet (post: APIPost): Set<string> {
        return new Set(APIPost.getTags(post));
    }

}
