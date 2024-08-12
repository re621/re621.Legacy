import { XM } from "./XM";

export default class LocalStorage {

    public static LS = XM.Window.localStorage;

    private static Index = {
        d0: "r6.dnp.expires",
        d1: "r6.dnp.version",
        d2: "r6.dnp.created",
        d3: "r6.dnp.cache",
    }

    private static get = (name: string): string => this.LS.getItem(name);
    private static set = (name: string, value: string): void => this.LS.setItem(name, value);
    private static remove = (name: string): void => this.LS.removeItem(name);

    // DNP cache
    public static DNP = {
        get Expires(): number {
            return parseInt(LocalStorage.get(LocalStorage.Index.d0)) || 0;
        },
        set Expires(value: number) {
            if (value == 0) LocalStorage.remove(LocalStorage.Index.d0);
            else LocalStorage.set(LocalStorage.Index.d0, value + "");
        },
        get Version(): number {
            return parseInt(LocalStorage.get(LocalStorage.Index.d1)) || 0;
        },
        set Version(value: number) {
            if (value == 0) LocalStorage.remove(LocalStorage.Index.d1);
            else LocalStorage.set(LocalStorage.Index.d1, value + "");
        },
        get CreatedAt(): number {
            return parseInt(LocalStorage.get(LocalStorage.Index.d2)) || 0;
        },
        set CreatedAt(value: number) {
            if (value == 0) LocalStorage.remove(LocalStorage.Index.d2);
            else LocalStorage.set(LocalStorage.Index.d2, value + "");
        },
        get Cache(): Set<string> {
            let data: any;
            try { data = JSON.parse(LocalStorage.get(LocalStorage.Index.d3) || "[]"); }
            catch (error) {
                console.error("Unable to parse DNP cache (1)");
                LocalStorage.DNP.clear();
                return new Set();
            }

            if (!Array.isArray(data)) {
                console.error("Unable to parse DNP cache (2)");
                LocalStorage.DNP.clear();
                return new Set();
            }

            return new Set(data);
        },
        set Cache(value: Set<string>) {
            const text = JSON.stringify(Array.from(value));
            if (text == "[]") LocalStorage.remove(LocalStorage.Index.d3);
            else LocalStorage.set(LocalStorage.Index.d3, text);
        },

        clear(): void {
            LocalStorage.remove(LocalStorage.Index.d0);
            LocalStorage.remove(LocalStorage.Index.d1);
            LocalStorage.remove(LocalStorage.Index.d2);
            LocalStorage.remove(LocalStorage.Index.d3);
        },
    }

    public static Blacklist = {
        get Collapsed(): boolean {
            return LocalStorage.get("e6.blk.collapsed") !== "false";
        },
        set Collapsed(value: boolean) {
            if (value) LocalStorage.remove("e6.blk.collapsed");
            else LocalStorage.set("e6.blk.collapsed", "false");
        },

        /**
         * List of disabled blacklist filters
         * @returns {Set<string>}
         */
        get FilterState(): Set<string> {
            if (!LocalStorage.Blacklist._filterCache) {
                try {
                    LocalStorage.Blacklist._filterCache = new Set(
                        JSON.parse(localStorage.getItem("e6.blk.filters") || "[]"),
                    );
                } catch (e) {
                    console.error(e);
                    localStorage.removeItem("e6.blk.filters");
                    LocalStorage.Blacklist._filterCache = new Set();
                }

                patchBlacklistFunctions();
            }
            return LocalStorage.Blacklist._filterCache;
        },

        set FilterState(value: Set<string>) {
            if (!value.size) {
                localStorage.removeItem("e6.blk.filters");
                LocalStorage.Blacklist._filterCache = new Set();
                return;
            }

            LocalStorage.Blacklist._filterCache = value;
            patchBlacklistFunctions();
            localStorage.setItem("e6.blk.filters", JSON.stringify([...value]));
        },

        _filterCache: undefined,
    }

    /**
     * Determines the current size of data in LocalStorage.  
     * @see https://stackoverflow.com/a/15720835/
     * @returns Data size, in bytes
     */
    public static size(): number {
        let _lsTotal = 0, _xLen: number, _x: string;
        for (_x in localStorage) {
            _xLen = (((localStorage[_x].length || 0) + (_x.length || 0)) * 2);
            _lsTotal += _xLen;
        }
        return _lsTotal;
    }

}

function patchBlacklistFunctions(): void {
    LocalStorage.Blacklist._filterCache.add = function (...args: any[]): void {
        Set.prototype.add.apply(this, args);
        localStorage.setItem(
            "e6.blk.filters",
            JSON.stringify([...LocalStorage.Blacklist._filterCache]),
        );
    };
    LocalStorage.Blacklist._filterCache.delete = function (...args: any[]): void {
        Set.prototype.delete.apply(this, args);
        if (LocalStorage.Blacklist._filterCache.size == 0)
            localStorage.removeItem("e6.blk.filters");
        else
            localStorage.setItem(
                "e6.blk.filters",
                JSON.stringify([...LocalStorage.Blacklist._filterCache]),
            );
    };
    LocalStorage.Blacklist._filterCache.clear = function (...args: any[]): void {
        Set.prototype.clear.apply(this, args);
        localStorage.removeItem("e6.blk.filters");
    };
}
