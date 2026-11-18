import { APIPostBasic } from "./APIPost";
import { APIResponse } from "./APIResponse";

export interface APIIQDBResponse extends APIResponse {
  post_id: number;
  width: number;
  height: number;
  score: number;

  // Always in the `basic` output mode: tags are not sorted by category
  post: APIPostBasic;
}
