
/**
 * Common interface for prepared DOM structures
 */
export interface DomStructure {

    /**
     * Builds and returns the DOM element
     * @param force If true, ignores any cached data and rebuilds the structure from scratch
     */
    get(): JQuery<HTMLElement>;

}
