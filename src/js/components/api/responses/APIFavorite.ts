import { APIPost } from "./APIPost";

export interface APIFavorite extends APIPost {
  // The favorites endpoint uses the same format as the posts
  // If this changes, this interface will need to be updated.
  id: number;
}
