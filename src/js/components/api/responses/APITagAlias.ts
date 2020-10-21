import { APIResponse } from "./APIResponse";

export interface APITagAlias extends APIResponse {
    id: number;
    antecedent_name: string;
    consequent_name: string;
    reason: string;
    creator_id: number;
    created_at: string;
    updated_at: string;
    forum_post_id: number;
    forum_topic_id: number;
    status: string;
    post_count: number;
    approver_id: number;
}
