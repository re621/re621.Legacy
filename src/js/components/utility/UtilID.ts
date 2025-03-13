import { Util } from "./Util";

export class UtilID {

    private static uniqueIDs: Set<string> = new Set();

    /**
     * Creates a random string of letters, to be used as an ID.
     * @param length String length. Defaults to 8
     * @param unique If false, simply returns a randomized string
     */
    public static make (length = 8, unique = true): string {
        if (!unique) return getRandomString(length);

        let uniqueID: string;
        do { uniqueID = getRandomString(length); }
        while (UtilID.uniqueIDs.has(uniqueID));
        UtilID.uniqueIDs.add(uniqueID);
        return uniqueID;

        function getRandomString (length: number): string {
            let result = "";
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", charLength = chars.length;
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * charLength));
            }
            return result;
        }

    }

    /**
     * Checks whether the specified ID has been registered
     * @param id String ID to check
     */
    public static has (id: string): boolean {
        return UtilID.uniqueIDs.has(id);
    }

    /**
     * Remove the provided ID from the records.
     * Make sure that the corresponding element has also been removed, to avoid possible collisions
     * @param id String ID to remove
     * @returns true if the ID existed, false otherwise
     */
    public static remove (id: string): boolean {
        if (!UtilID.has(id)) return false;
        UtilID.uniqueIDs.delete(id);
        return true;
    }

    /** Returns a pseudo-random number. Don't use for anything serious, please. */
    public static rand (): string {
        return (Util.Time.now() + "").slice(-5);
    }

}
