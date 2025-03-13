/**
 * Replaces the variables in the provided string with those from the package.json
 * @param {*} input String to process
 */

module.exports = {

  /**
   * @returns Current time, in YYMMDD:HHMM format
   */
  getBuildTime () {
    function twoDigit (n) { return (n < 10 ? "0" : "") + n; }

    const date = new Date();
    return (date.getFullYear() + "").substring(2) + twoDigit(date.getMonth() + 1) + twoDigit(date.getDate()) + ":" + twoDigit(date.getHours()) + twoDigit(date.getMinutes());
  },

  /**
   * Replaces the variables in the provided string with those from the package.json
   * @param {*} input String to process
   * @param {*} package package.json
   */
  parseTemplate (input, packageJSON) {
    // const version = process.env.GIT_TAG_NAME === undefined ? package.version : process.env.GIT_TAG_NAME;
    const version = process.env.GIT_TAG_NAME === undefined ? packageJSON.version.substring(0, packageJSON.version.lastIndexOf(".")) + ".dev0" : process.env.GIT_TAG_NAME;
    return input
      .replace(/%NAME%/g, "re621")
      .replace(/%DISPLAYNAME%/g, packageJSON.displayName)
      .replace(/%NAMESPACE%/g, packageJSON.namespace)
      .replace(/%DESCRIPTION%/g, packageJSON.description)
      .replace(/%AUTHOR%/g, packageJSON.author)
      .replace(/%VERSION%/g, version.split("-")[0])
      .replace(/%VERSIONREPO%/, version)
      .replace(/%VERSHORT%/g, packageJSON.version.replace(/\.\d+$/g, ""))
      .replace(/%BUILD%/g, this.getBuildTime())
      .replace(/%HOMEPAGE%/g, packageJSON.homepage)
      .replace(/%GITHUB%/g, packageJSON.github)
      .replace(/%SUPPORT%/g, packageJSON.bugs.url)
      .replace(/%HOMEPAGE%/g, packageJSON.homepage);
  },

};
