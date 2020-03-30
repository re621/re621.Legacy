import { UpdateData, UpdateDefinition } from "./SubscriptionManager";
import { RE6Module } from "../../components/RE6Module";

export interface Subscription extends RE6Module {
    /**
     * Returns the name of the tab
     */
    getName(): string;
    /**
     * Elements where a subscribe/unsubscribe button should be appended to
     * The elements will be passedt to getSubscriberId
     */
    getElementsToInsertAfter(): JQuery<HTMLElement>;
    createSubscribeButton(): JQuery<HTMLElement>;
    createUnsubscribeButton(): JQuery<HTMLElement>;
    /**
     * Returns all entries which are considered to be updated,
     * i.e the api update date is larger than the last updated date
     */
    getUpdatedEntries(): Promise<UpdateData[]>;
    /**
     * This function should return the information needed to identify a specific subscription item
     * for example the pool or forum_topic id
     * @param $element the element which matched the selector on which to append buttons to
     */
    getSubscriberId($element: JQuery<HTMLElement>): string;
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
