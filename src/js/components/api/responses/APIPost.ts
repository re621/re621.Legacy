import { APIResponse } from "./APIResponse";

/** Fields shared by all output modes of the posts API */
export interface APIPostBase extends APIResponse {
  id: number;
  created_at: string;
  updated_at: string;
  change_seq: number;
  files: Files;
  uploader_id: number;
  uploader_name: string;
  approver_id: number | null;
  stats: Stats;
  flags: Flags;
  has: Has;
  relationships: Relationships;
  pools: number[];
  rating: PostRating;
  locked_tags: string[];
  sources: string[];
  description: string;
}

/** Post in the `extended` output mode: tags are sorted by category */
export interface APIPost extends APIPostBase {
  tags: Tags;
}

/** Post in the `basic` (default) output mode: tags are a flat list */
export interface APIPostBasic extends APIPostBase {
  tags: string[];
}

interface Files {
  meta: {
    md5: string;
    ext: string;
    size: number;
    duration: number | null;
    has_sample: boolean;
  };
  /** `url` is null if the user cannot see the post */
  original: {
    width: number;
    height: number;
    url: string | null;
  };
  preview: ImageVariant;
  /** Falls back to the original file if the post has no sample */
  sample: ImageVariant;
  /** Only present on video posts */
  video?: {
    has: boolean;
    original: VideoVariant;
    variants: Record<string, VideoVariant>;
    samples: Record<string, VideoVariant>;
  };
}

/** URLs are null if the user cannot see the post */
interface ImageVariant {
  width: number;
  height: number;
  jpg: string | null;
  webp: string | null;
}

interface VideoVariant {
  fps: number;
  codec: string;
  size: number;
  width: number;
  height: number;
  url: string;
}

interface Stats {
  score: Score;
  fav_count: number;
  is_favorited: boolean;
  /** Current user's vote: 1, 0, or -1 */
  vote: number;
  comment_count: number;
  hotness: number;
}

interface Has {
  parent: boolean;
  children: boolean;
  active_children: boolean;
  notes: boolean;
  sample: boolean;
}

interface Relationships {
  parent_id: number | null;
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
