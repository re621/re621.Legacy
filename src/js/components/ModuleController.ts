import { RE6Module } from "./RE6Module";
import { Debug } from "./utility/Debug";
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

        Debug.perfStart("re621.total");

        // Prepare and setup modules
        let activeModules = 0;
        for (const moduleClass of moduleList) {
            Debug.perfStart(moduleClass.prototype.constructor.name);
            try {
                const instance = moduleClass.getInstance();
                this.modules.set(moduleClass.prototype.constructor.name, instance);
                await instance.prepare();
            } catch (error) { ErrorHandler.error(moduleClass.prototype.constructor.name, error.stack, "prepare"); }
        }

        for (const instance of this.modules.values()) {
            try {
                if (instance.canInitialize()) {
                    if (instance.isWaitingForDOM()) {
                        $(() => {
                            window.setTimeout(() => {
                                try { instance.create(); }
                                catch (error) { ErrorHandler.error(instance, error.stack, "init"); }
                            }, 50);
                        });
                    } else instance.create();

                    activeModules++;
                }
            } catch (error) { ErrorHandler.error(instance, error.stack, "init"); }
            Debug.perfEnd(instance.constructor.name);
        }

        Debug.perfEnd("re621.total");

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
