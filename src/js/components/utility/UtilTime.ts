export enum UtilTime {
  SECOND = 1000,
  MINUTE = 60 * UtilTime.SECOND,
  HOUR = 60 * UtilTime.MINUTE,
  DAY = 24 * UtilTime.HOUR,
  WEEK = 7 * UtilTime.DAY,
  MONTH = 30 * UtilTime.DAY,
  YEAR = 365 * UtilTime.DAY,
}

export namespace UtilTime {

  /** Returns current timestamp. Alias for `new Date().getTime();` */
  export function now (): number {
    return new Date().getTime();
  }

  /**
   * Converts time from absolute format to relative (i.e. "5 minutes ago")
   * @param time Time to process
   * @returns Relative time string
   */
  export function ago (time: number | string | Date): string {
    switch (typeof time) {
      case "string":
        time = +new Date(time);
        break;
      case "object":
        time = time.getTime();
        break;
    }

    const timeFormats = [
      [60, "seconds", 1], // 60
      [120, "1 minute ago", "1 minute from now"], // 60*2
      [3600, "minutes", 60], // 60*60, 60
      [7200, "1 hour ago", "1 hour from now"], // 60*60*2
      [86400, "hours", 3600], // 60*60*24, 60*60
      [172800, "Yesterday", "Tomorrow"], // 60*60*24*2
      [604800, "days", 86400], // 60*60*24*7, 60*60*24
      [1209600, "Last week", "Next week"], // 60*60*24*7*4*2
      [2419200, "weeks", 604800], // 60*60*24*7*4, 60*60*24*7
      [4838400, "Last month", "Next month"], // 60*60*24*7*4*2
      [29030400, "months", 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
      [58060800, "Last year", "Next year"], // 60*60*24*7*4*12*2
      [2903040000, "years", 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
      [5806080000, "Last century", "Next century"], // 60*60*24*7*4*12*100*2
      [58060800000, "centuries", 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
    ];
    let seconds = (+new Date() - time) / 1000,
      token = "ago",
      listChoice = 1;

    if (seconds >= 0 && seconds < 2) { return "Just now"; }
    if (seconds < 0) {
      seconds = Math.abs(seconds);
      token = "from now";
      listChoice = 2;
    }
    let i = 0,
      format;
    while (format = timeFormats[i++])
      if (seconds < format[0]) {
        if (typeof format[2] == "string")
          return format[listChoice];
        else
          return Math.floor(seconds / format[2]) + " " + format[1] + " " + token;
      }
    return time + "";
  }

  /**
   * Formats the provided date as a string in YYYY-MM-DD HH:SS format
   * @param date Date to format. If none is provided, formats current date
   */
  export function format (date: Date | number | string = new Date()): string {
    if (typeof date == "number" || typeof date == "string") date = new Date(date);
    const parts = {
      year: "" + date.getFullYear(),
      month: "" + (date.getMonth() + 1),
      day: "" + date.getDate(),
      hours: "" + date.getHours(),
      minutes: "" + date.getMinutes(),
      seconds: "" + date.getSeconds(),
    };

    for (const id in parts) {
      if (parts[id].length < 2) parts[id] = "0" + parts[id];
    }

    return parts.year + "-" + parts.month + "-" + parts.day + " " + parts.hours + ":" + parts.minutes + ":" + parts.seconds;
  }

  export function formatPeriod (input: number): string {
    if (input < UtilTime.MINUTE) return (input / UtilTime.SECOND).toFixed(1) + " seconds";
    if (input < UtilTime.HOUR) return (input / UtilTime.MINUTE).toFixed(1) + " minutes";
    if (input < UtilTime.DAY) return (input / UtilTime.HOUR).toFixed(1) + " hours";
    if (input < UtilTime.WEEK) return (input / UtilTime.DAY).toFixed(1) + " days";
    if (input < UtilTime.MONTH) return (input / UtilTime.WEEK).toFixed(1) + " weeks";
    if (input < UtilTime.YEAR) return (input / UtilTime.MONTH).toFixed(1) + " months";
    return (input / UtilTime.YEAR).toFixed(1) + " years";
  }

  /**
   * Returns the current date and time in a compressed format.
   * Used to make downloaded file names unique, i.e. download-200405-0350.zip instead of download.zip
   * @returns String with a date and time in YYMMDD-HHMM format.
   */
  export function getDatetimeShort (): string {
    function twoDigit (n: number): string { return (n < 10 ? "0" : "") + n; }

    const date = new Date();
    return (date.getFullYear() + "").substring(2) + twoDigit(date.getMonth() + 1) + twoDigit(date.getDate()) + "-" + twoDigit(date.getHours()) + twoDigit(date.getMinutes());
  }

  export function formatPlaytime (seconds: number): string {
    seconds = Math.ceil(seconds);
    const remainder = (seconds % 60);
    return Math.floor(seconds / 60) + ":" + (remainder < 10 ? "0" : "") + remainder;
  }

}
