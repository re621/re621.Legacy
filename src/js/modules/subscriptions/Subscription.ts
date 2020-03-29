import { UpdateData, UpdateDefinition } from "./SubscriptionManager";
import { RE6Module } from "../../components/RE6Module";

export interface Subscription extends RE6Module {
    /**
     * Returns the name of the tab
     */
    getName(): string;
    /**
     * Adds the buttons responsible for adding subs to the settings
     */
    addSubscribeButtons();
    /**
     * Returns all entries which are considered to be updated,
     * i.e the api update date is larger than the last updated date
     */
    getUpdatedEntries(): Promise<UpdateData[]>;
    /**
     * Holds the last time checked for updates in ms since epoch
     */
    lastUpdate: number;
    /**
     * Tab which will hold the updates. Updates are automatically added by the SubscriptionManager
     */
    tab: JQuery<HTMLElement>;
    updateDefinition: UpdateDefinition;
}
