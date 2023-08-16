import { APIResponse } from "./APIResponse";

export interface APINote extends APIResponse {
    id: number;
    created_at: string;
    updated_at: string;
    creator_id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    version: number;
    is_active: boolean;
    post_id: number;
    body: string;
    creator_name: string;
}
