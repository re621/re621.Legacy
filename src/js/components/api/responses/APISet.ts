export interface APISet extends APIResponse {
    id: number;
    created_at: string;
    updated_at: string;
    creator_id: number;
    is_public: boolean;
    name: string;
    shortname: string;
    description: string;
    post_count: number;
    transfer_on_delete: boolean;
    post_ids: number[];
}
