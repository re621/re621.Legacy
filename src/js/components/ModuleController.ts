import { RE6Module } from "./RE6Module";
import { ErrorHandler } from "./utility/ErrorHandler";

export class ModuleController {

    private static modules: Map<string, RE6Module> = new Map();

    /**
     * Registers the module list
     * @param module Modules to register
     * @todo any parameter is not correct here but I couldn't figure the right types out
     *  { new(): RE6Module } works to access constructor name but not static methods
     */
    public static async register(moduleList: any | any[]): Promise<number> {
        if (!Array.isArray(moduleList)) moduleList = [moduleList];

        let activeModules = 0;
        for (const moduleClass of moduleList) {
            try {
                const moduleInstance = moduleClass.getInstance();
                this.modules.set(moduleClass.prototype.constructor.name, moduleInstance);
                await moduleInstance.prepare();
                if (moduleInstance.canInitialize()) {
                    moduleInstance.create();
                    activeModules++;
                }
            } catch (error) { ErrorHandler.error(moduleClass, error.stack, "init"); }
        }

        return Promise.resolve(activeModules);
    }

    /**
     * Returns a module singleton instance corresponding to the specified name.  
     * Module name may be either a string or a class name, but the latter is preferred.  
     * All modules must extend the RE6Module class, and need to be registered beforehand.
     * @param moduleClass Module name
     * @returns Module instance
     */
    public static get<T extends RE6Module>(module: string): T;
    public static get<T extends RE6Module>(module: { new(): T }): T;
    public static get<T extends RE6Module>(module: string | { new(): T }): T {
        if (typeof module === "string") return this.modules.get(module) as T;
        return this.get<T>(module.prototype.constructor.name);
    }

    /**
     * Returns a map of currently registered modules
     * @returns List of modules
     */
    public static getAll(): Map<string, RE6Module> {
        return this.modules;
    }
}
