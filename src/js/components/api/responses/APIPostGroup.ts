import { APIResponse } from "./APIResponse";

export interface APIPostGroup extends APIResponse {
  id: number;
  name: string;

  created_at: string;
  updated_at: string;
  creator_id: number;

  description: string;
  post_ids: number[];
  post_count: number;
}
