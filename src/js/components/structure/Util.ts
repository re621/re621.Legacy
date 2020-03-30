/**
 * Common utilities used in other modules
 */
export class Util {


    /**
     * Converts time from absolute format to relative (i.e. "5 minutes ago")
     * @param time Time to process
     * @returns Relative time string
     */
    public static timeAgo(time: number | string | Date): string {
        switch (typeof time) {
            case 'string':
                time = +new Date(time);
                break;
            case 'object':
                time = time.getTime();
                break;
        }

        const timeFormats = [
            [60, 'seconds', 1], // 60
            [120, '1 minute ago', '1 minute from now'], // 60*2
            [3600, 'minutes', 60], // 60*60, 60
            [7200, '1 hour ago', '1 hour from now'], // 60*60*2
            [86400, 'hours', 3600], // 60*60*24, 60*60
            [172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
            [604800, 'days', 86400], // 60*60*24*7, 60*60*24
            [1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
            [2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
            [29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
            [2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
            [58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        let seconds = (+new Date() - time) / 1000,
            token = 'ago',
            listChoice = 1;

        if (seconds == 0) { return 'Just now'; }
        if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = 'from now';
            listChoice = 2;
        }
        let i = 0,
            format;
        while (format = timeFormats[i++])
            if (seconds < format[0]) {
                if (typeof format[2] == 'string')
                    return format[listChoice];
                else
                    return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
            }
        return time + "";
    }

    /**
     * Downloads the provided object as a JSON file
     * @param exportObj Object to download
     * @param exportName File name
     */
    public static downloadJSON(exportObj, exportName): void {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 4));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

}
