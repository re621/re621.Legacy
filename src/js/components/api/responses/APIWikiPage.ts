import { APIResponse } from "./APIResponse";

export interface APIWikiPage extends APIResponse {
  id: number;
  created_at: Date;
  updated_at: Date;
  title: string;
  body: string;
  creator_id: number;
  is_locked: boolean;
  updater_id?: number;
  is_deleted: boolean;
  other_names: string[];
  creator_name: string;
  category_name: number;
}
