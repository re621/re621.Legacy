import { Update } from "./SubscriptionManager";
import { RE6Module } from "../../components/RE6Module";

export interface Subscriber extends RE6Module {
    /**
     * Returns the name of the tab
     */
    getName(): string;
    /**
     * Adds the buttons responsible for adding subs to the settings
     */
    addSubscribeButtons();
    /**
     * Creates an element which will be added to the tab when there are updates
     * @param data Data Object created with getUpdateEntries
     * @param extra Optional extra info you want to pass to the function
     * @returns the element to append
     */
    createUpdateEntry(data: Update, extra?: any): JQuery<HTMLElement>;
    /**
     * Returns all entries which are considered to be updated,
     * i.e the api update date is larger than the last updated date
     */
    getUpdatedEntries(): Promise<Update[]>;
    /**
     * Holds the last time checked for updates in ms since epoch
     */
    lastUpdate: number;
    /**
     * Tab which will hold the updates. Updates are automatically added by the SubscriptionManager
     */
    tab: JQuery<HTMLElement>;
}

export interface UpdateCallback {
    (updates: Update[]): void;
}
