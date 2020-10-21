import { APIResponse } from "./APIResponse";

export interface APIForumPost extends APIResponse {
    id: number;
    created_at: string;
    updated_at: string;
    body: string;
    creator_id: number;
    updater_id: number;
    topic_id: number;
    is_hidden: boolean;
}
