import { APITagAlias } from "./APITagAlias";

export interface APITagImplication extends APITagAlias {
    // Both aliases and implications use the same format.
    // If this changes, this interface will need to be updated.
    id: number;
}
