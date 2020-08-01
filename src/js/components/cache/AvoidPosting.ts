import { E621 } from "../api/E621";
import { APITagImplication } from "../api/responses/APITagImplication";
import { Util } from "../utility/Util";

export class AvoidPosting {

    private static cache: Set<string>;

    private static getCache(): Set<string> {
        if (typeof AvoidPosting.cache === "undefined")
            AvoidPosting.cache = new Set<string>(JSON.parse(window.localStorage.getItem("re621.dnpcache.data") || "[]"))
        return AvoidPosting.cache;
    }

    private static save(): void {
        window.localStorage.setItem("re621.dnpcache.data", JSON.stringify(Array.from(AvoidPosting.getCache())));
    }

    private static clear(): void {
        AvoidPosting.cache = new Set();
        AvoidPosting.save();
    }

    public static size(): number {
        return AvoidPosting.getCache().size;
    }

    public static has(tag: string): boolean {
        return AvoidPosting.getCache().has(tag);
    }

    private static add(tag: string): void {
        AvoidPosting.getCache().add(tag);
        AvoidPosting.save();
    }

    public static async update(status?: JQuery<HTMLElement>): Promise<number> {
        if (!status) status = $("<span>");

        AvoidPosting.clear();
        let result: APITagImplication[] = [],
            page = 0;

        do {
            page++;
            status.html(`<i class="fas fa-circle-notch fa-spin"></i> Processing favorites: batch ${page} / ?`)
            result = await E621.TagImplications.get<APITagImplication>({ "search[consequent_name]": "avoid_posting", page: page, limit: 320 }, 500);
            for (const entry of result) AvoidPosting.add(entry["antecedent_name"]);
        } while (result.length == 320);

        status.html(`<i class="far fa-check-circle"></i> Cache reloaded: ${AvoidPosting.size()} entries`);

        window.localStorage.setItem("re621.dnpcache.update", Util.Time.now() + "")

        return Promise.resolve(AvoidPosting.size());
    }

    public static getUpdateTime(): number {
        return parseInt(window.localStorage.getItem("re621.dnpcache.update")) || 0;
    }

    public static isUpdateRequired(): boolean {
        return AvoidPosting.getUpdateTime() + Util.Time.DAY < Util.Time.now();
    }

}
