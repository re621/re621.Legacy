import { APIResponse } from "./APIResponse";
import { TagCategory } from "./APITag";

export interface APITagPreview extends APIResponse {
  a: string;
  b?: string;
  type: "tag" | "implication";
  tagTypeA: TagCategory;
  tagTypeB: TagCategory;
}
