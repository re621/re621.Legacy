import { PostRating } from "./APIPost";

// This. This is the worst thing.
export interface APIIQDBResponse extends APIResponse {
    post_id: number;
    width: number;
    height: number;
    score: number;
    post: {
        // I do not know why this does not follow the normal APIPost structure
        posts: {
            id: number;
            created_at: string;
            updated_at: string;

            uploader_id: number;
            approver_id: number;
            is_favorited: boolean;
            fav_count: number;
            score: number;
            up_score: number;
            down_score: number;
            rating: PostRating;
            comment_counter: number;
            last_comment_bumped_at: string;
            last_commented_at: string;
            last_noted_at: string;
            descriptioni: string;

            change_seq: number;
            duration: any; // ???
            pixiv_id: any; // ???
            bit_flags: number;
            bg_color: any; // ???

            pool_ids: number[];

            is_deleted: boolean;
            is_pending: boolean;
            is_flagged: boolean;
            is_note_locked: boolean;
            is_status_locked: boolean;
            is_rating_locked: boolean;

            parent_id: number;
            children_ids: string;
            has_children: boolean;
            has_active_children: boolean;
            has_visible_children: boolean;

            tag_count: number;
            tag_count_artist: number;
            tag_count_copyright: number;
            tag_count_character: number;
            tag_count_species: number;
            tag_count_general: number;
            tag_count_invalid: number;
            tag_count_meta: number;
            tag_count_lore: number;

            tag_string: string;
            tag_string_artist: string;
            tag_string_copyright: string;
            tag_string_character: string;
            tag_string_species: string;
            tag_string_general: string;
            tag_string_invalid: string;
            tag_string_meta: string;
            tag_string_lore: string;

            locked_tags: string;

            file_url: string;
            large_file_url: string;
            preview_file_url: string;
            has_large: boolean;

            md5: string;
            file_ext: string;
            image_width: number;
            image_height: number;
            source: string;
            file_size: number;
        };
    };
}
