import { APIPostGroup } from "./APIPostGroup";

export interface APIPool extends APIPostGroup {
    id: number;

    is_active: boolean;
    is_deleted: boolean;
    category: string;
    creator_name: string;
}
