import { RE6Module } from "./RE6Module";

export class ModuleController {

    private static modules: Map<string, RE6Module> = new Map();

    /**
     * Registers the module so that its settings could be changed
     * @param module Module to register
     * @todo any parameter is not correct here but I couldn't figure the right types out
     *  { new(): RE6Module } works to access constructor name but not static methods
     */
    public static register(moduleClass: any): void {
        const moduleInstance = moduleClass.getInstance();
        moduleInstance.create();
        this.modules.set(moduleClass.prototype.constructor.name, moduleInstance);
    }

    /**
     * Returns a previously registered module with the specified class
     * This simply calls the non static variant, making the use in this class a bit more convinien
     * @param moduleClass Module class
     * @returns the module interpreted as T (which must extend the RE6Module class)
     */
    public static getWithType<T extends RE6Module>(moduleClass: { new(): T }): T {
        return this.getByName(moduleClass.prototype.constructor.name) as T;
    }

    /**
     * Same as getModuleWithType except that it returns it as a RE6Module
     * This simply calls the non static variant, making the use in this class a bit more convinien
     * @param moduleClass 
     * @returns RE6Module instance
     */
    public static get(moduleClass: { new(): RE6Module }): RE6Module {
        return this.getByName(moduleClass.prototype.constructor.name);
    }

    /**
     * Gets a module without a specific tpye from the passed class name
     */
    public static getByName(name: string): RE6Module {
        return this.modules.get(name);
    }

    /**
     * @returns a map of all registered modules
     */
    public static getAll() {
        return this.modules;
    }
}
