export interface ApiPost extends APIResponse {
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
    rating: string;
    fav_count: number;
    sources: string[];
    pools: number[];
    relationships: Relationships;
    approver_id?: number;
    uploader_id: number;
    description: string;
    comment_count: number;
    is_favorited: boolean;
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
