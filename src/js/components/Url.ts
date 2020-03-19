export class Url {

    /**
     * Checks if the url the user is currently on satisfies the filter
     * @param filter Pipe seperated list of filters the current location has to satisfy
     *               Matches are by default on a startsWith basis, but if the url must match
     *               you can prepend =
     * @returns true if at least on filter is fullfilled
     */
    public static matches(filter: string) {
        const domain = document.location.protocol + "//" + document.location.host;
        let result = false;
        for (const constraint of filter.split("|")) {
            if (constraint.startsWith("=")) {
                result = result || document.location.href === domain + constraint.substring(1);
            } else {
                result = result || document.location.href.startsWith(domain + constraint);
            }
        }
        return result;
    }
}
