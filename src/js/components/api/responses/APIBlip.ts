export interface APIBlip extends APIResponse {
    id: number;
    creator_id: number;
    body: string;
    response_to: number;
    created_at: string;
    updated_at: string;
    is_hidden: boolean;
    creator_name: string;
}
