import { APIPostGroup } from "./APIPostGroup";

export interface APISet extends APIPostGroup {
    id: number;

    shortname: string;
    is_public: boolean;
    transfer_on_delete: boolean;
}
