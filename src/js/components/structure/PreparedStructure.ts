
/**
 * Common interface for prepared DOM structures
 */
export interface PreparedStructure {

    /**
     * Builds and returns the DOM element
     * @param force If true, ignores any cached data and rebuilds the structure from scratch
     */
    render(): JQuery<HTMLElement>;

}
