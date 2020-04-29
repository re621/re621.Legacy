import { RE6Module } from "../../components/RE6Module";
import { UpdateContent, UpdateData } from "./SubscriptionManager";

export interface Subscription extends RE6Module {

    /**
     * Parameter that contains various functions used to format subscription updates properly.  
     * @see UpdateActions
     */
    updateActions: UpdateActions;

    /**
     * Returns a display name of the Subscription, to be used in the selection tab.  
     * This may or may not be unique, and thus should not be used to differentiate subscription modules.  
     */
    getName(): string;

    // ===== Buttons =====

    /** Creates and returns a "subscribe" button */
    makeSubscribeButton(): JQuery<HTMLElement>;
    /** Creates and returns an "unsubscribe" button */
    makeUnsubscribeButton(): JQuery<HTMLElement>;

    /** Returns a set of elements to which subscribe / unsubscribe buttons should be attached. */
    getButtonAttachment(): JQuery<HTMLElement>;
    /** Insert the passed button to an attachment point from `getButtonAttachment()` */
    insertButton($attachment: JQuery<HTMLElement>, $button: JQuery<HTMLElement>): void;

    /**
     * Returns an subscription ID (i.e. pool_id), derived from an element on the page
     * @param $element attachment point from `getButtonAttachment()`
     */
    getSubscriberId($element: JQuery<HTMLElement>): string;

    /**
     * Returns an subscription name (i.e. pool name), derived from an element on the page
     * @param $element attachment point from `getButtonAttachment()`
     */
    getSubscriberName($element: JQuery<HTMLElement>): string;

    // ===== Updates =====

    /**
     * Returns all entries which are considered to be updated,
     * i.e the api update date is larger than the last updated date
     * @param lastUpdate Timestamp of the previous update
     */
    getUpdatedEntries(lastUpdate: number): Promise<UpdateData>;

    /**
     * Clears the cached subscription data for the module.  
     * Uses pushSettings() internally, returns a promise that is fulfilled when the action is complete.
     */
    clearCache(): Promise<boolean>;
}

export interface UpdateActions {
    // What link should be opened when you click on the image? Leave empty for no action
    imageHref?: (data: UpdateContent) => string;
    // Image link which should be displayed on the left side of the entry
    imageSrc: (data: UpdateContent) => string;
    // Should the image be hidden, if it triggers the error event?
    imageRemoveOnError?: boolean;
    // Link to get to the update
    updateHref?: (data: UpdateContent) => string;
    // Text for the updatelink
    updateText: (data: UpdateContent) => string;
    // Text to display when clicking on sourceLink
    sourceHref?: (data: UpdateContent) => string;
    // Link to where the "first page" of the subscription
    sourceText: (data: UpdateContent) => string;
}
