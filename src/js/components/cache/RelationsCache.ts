import { ParsedTag } from "../../modules/misc/SmartAlias";

export default class RelationsCache {

    private data: RelationsDataSet = {};

    private static instance: RelationsCache;

    private static get(): RelationsCache {
        if(!this.instance) this.instance = new RelationsCache();
        return this.instance;
    }

    public static resolve(tag: string): RelationsData {
        return this.get().data[tag];
    }

    public static has(tag: string): boolean {
        return typeof this.get().data[tag] !== "undefined";
    }

    public static intersect(tags: ParsedTag[]): RelIntersection {
        const data = this.get().data;
        const has: RelationsDataSet = {};
        const lacks: string[] = [];

        for(const tag of tags) {
            const tagData = data[tag.name];
            if(typeof tagData == "undefined") lacks.push(tag.name);
            else has[tag.name] = tagData;
        }

        return {
            has: has,
            lacks: lacks,
        };
    }

    public static add(tag: string, data: RelationsData): void {
        this.get().data[tag] = data;
    }

}

interface RelationsData {
    becomes?: string;
    adds: string[];
}
interface RelationsDataSet {
    [name: string]: RelationsData;
}

interface RelIntersection {
    has: RelationsDataSet;
    lacks: string[];
}