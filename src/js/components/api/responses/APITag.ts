export interface APITag extends APIResponse {
    id: number;
    name: string;
    post_count: number;
    related_tags: string;
    related_tags_updated_at: Date;
    category: number;
    is_locked: boolean;
    created_at: Date;
    updated_at: Date;
}
