export class RequestQueue {
    // how long should be waited between each api request, in ms
    private requestSleepDuration: number;

    //used to notify the original request function of the requests completion
    private emitter = $({});

    //Holds request data which has yet to be processed. Content will be filled, once the request is done
    private requestQueue = new Map<number, RequestEntry>();

    //True, if the queue is currently being emptied
    private workingQueue = false;

    //Incrementing id to uniquely identify each request, used to emit done event
    private requestCounter = 0;

    public constructor(requestSleepDuration: number) {
        this.requestSleepDuration = requestSleepDuration;
    }

    /**
     * @returns the next id to uniquely identify a request
     */
    public getRequestId(): number {
        return this.requestCounter++;
    }

    /**
     * Starts working through the queue and notify listeners on completion
     */
    private async workQueue(requestMethod: Function): Promise<void> {
        //If queue is already being worked on, don't start another round
        if (this.workingQueue === true) {
            return;
        }
        //prevent entry till finish
        this.workingQueue = true;
        //work through everything in the queue up intl now
        for (const entry of this.requestQueue.entries()) {
            entry[1].content = await requestMethod(entry[1].url, entry[1].method, entry[1].data);
            console.log(`Finished ${entry[0]} on lane ${this.requestSleepDuration}`);
            this.emitter.trigger("request-" + entry[0]);
            //sleep
            await new Promise(resolve => setTimeout(() => resolve(), this.requestSleepDuration));
        }
        this.workingQueue = false;
    }

    /**
     * 
     * @param requestMethod function which takes url, method and data as parameters and returns the result
     * @param id Unique request id
     * @param url 1st requestMethod parameter
     * @param method 2nd requestMethod parameter
     * @param data 3rd requestMethod paramter
     */
    public async add(requestMethod: Function, id: number, url: string, method: string, data = {}): Promise<void> {
        this.requestQueue.set(id, {
            url: url,
            method: method,
            data: data,
            content: ""
        });
        //start the queue, if it's not already going
        this.workQueue(requestMethod);
        console.log("Queue size: " + this.requestQueue.size);
    }

    public async getRequestResult(id: number): Promise<string> {
        return new Promise(resolve => {
            //Wait until the queue worker finishes the request
            this.emitter.on("request-" + id, () => {
                const result = this.requestQueue.get(id).content;
                this.requestQueue.delete(id);
                resolve(result);
            });
        });
    }
}

interface RequestEntry {
    url: string;
    method: string;
    data: {};
    content: string;
}
