// ==UserScript==
// @name        pretome - HnR status
// @namespace   http://vstone.eu/greasemonkey/
// @include     https://pretome.info/usertorrents.php?id=*
// @version     0.2.0
// @grant       GM_getValue
// ==/UserScript==

// minimum required ratio
var PRETOME_MIN_RATIO = 0.8;
// OR minimum required seed time.
var PRETOME_MIN_SEED = 60.0;

var PRETOME_THEME = "defaults"

/**
 * The RAINBOW tree.
 *
 * This object contains the defaults and default overrides per theme.
 * Colors here are only used if nothing has been stored locally (not yet implemented).
 *
 * The keys use the following form:
 *    `<column>_<ok|nok>_row<#>`:   Defines the background color.
 *    `<column>_<ok|nok>_text<#>`:  Defines the foreground color.
 *
 * column:
 *    * hnr (hit and run)
 *    * ratio
 *    * seed (only the time will change color. The status (Yes/No) is NOT modified)
 *
 * row/text:
 *    row defines the background color (row1 or row2) while
 *    text defines the foreground color (text1 or text2).
 *
 *
 *  See below for a list of defined defaults.
 *  null values indicates to leave the color alone: does NOT remove colors.
*/
var RAINBOW = {
    "defaults": { /* do not remove any keys here */
        "hnr_ok_row1":     "#A9E6A7",
        "hnr_ok_row2":     "#93C490",
        "hnr_ok_text1":    null,
        "hnr_ok_text2":    null,
        "hnr_nok_row1":    "#E6A8A7",
        "hnr_nok_row2":    "#C49095",
        "hnr_nok_text1":   null,
        "hnr_nok_text2":   null,

        "ratio_ok_row1":   "#A9E6A7",
        "ratio_ok_row2":   "#93C490",
        "ratio_ok_text1":  null,
        "ratio_ok_text2":  null,
        "ratio_nok_row1":  null,
        "ratio_nok_row2":  null,
        "ratio_nok_text1": null,
        "ratio_nok_text2": null,

        "seed_ok_row1":    "#A9E6A7",
        "seed_ok_row2":    "#93C490",
        "seed_ok_text1":   null,
        "seed_ok_text2":   null,
        "seed_nok_row1":   null,
        "seed_nok_row2":   null,
        "seed_nok_text1":  null,
        "seed_nok_text2":  null,
    },
    "Bday": {
        "hnr_ok_text1":  "green",
        "hnr_ok_text2":  "green",
        "hnr_nok_text1": "red",
        "hnr_nok_text2": "red",
        "seed_ok_text1": "black",
        "seed_ok_text2": "black",
    },
    "Industrial": {
        "hnr_ok_text1":  "green",
        "hnr_ok_text2":  "green",
        "hnr_nok_text1": "red",
        "hnr_nok_text2": "red",
        "seed_ok_text1": "black",
        "seed_ok_text2": "black",
   },
}

// Column indexes for the table
var C_RATIO = 3;
var C_SEED = 7;
var C_HNR = 8;

// Field indexes for the regex that matches time.
// See time_to_hours();
var R_MIN = 1;
var R_SEC = 2;
var R_DAY = 3;
var R_HOUR = 4;
var R_MIN2 = 5;
var R_SEC2 = 6;

// Detects the pretome theme in use by looking at loaded CSS stylesheets.
function detect_pretome_theme() {
  var xpath = '//link[contains(@href, "/themes/") and @type= "text/css"]';
  var snapResults = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  var css = snapResults.snapshotItem(0);
  var re = /\/themes\/([^\/]+)\//;
  if (css) {
    var theme = re.exec(css.href)
    return theme[1];
  }
  else {
    return false
  }
}

/**
 * Gets the color defined for a certain key. First tries to use GM_getValue and defaults
 * to whatever is specified in the RAINBOW.
 * @param {string} type - The color key code.
 * @param {string} theme - The theme to use. Defaults to the current PRETOME_THEME.
 *
 * The key used with GM_getValue looks like:
 *   `pretome.theme.<NAME>.<type>
 *
 * Example: for `hnr_ok_row1` and theme `foobar` the key will be:
 *   `pretome.theme.foobar.hnr_ok_row1`
 *
 */
function get_color(type, theme = PRETOME_THEME) {
    var key = "pretome.theme." + theme + "." + type;
    if (RAINBOW[theme]) {
        var theme = RAINBOW[theme];
        script_default = (theme[type] ? theme[type] : RAINBOW["defaults"][type])
    } else {
       script_default = RAINBOW["defaults"][type] ;
    }
    return GM_getValue(key, script_default);
}

/**
 * Colors the given element depending on the status.
 *
 * @param column {string} - Name of the column.
 * @param element {HTMLElement} - DOM Object to operate on.
 * @param status {boolean} - Status (true, false) is converted to ok, nok. You can also use ok, nok directly.
 * @param row {integer} - Row number (1 or 2).
 */
function color_element(column, element, status, row) {
    if (status === true || status === false) {
        status = status ? "ok" : "nok";
    }
    var bgkey = column + "_" + status + "_row" + row;
    var fgkey = column + "_" + status + "_text" + row;
    var bgcolor = get_color(bgkey);
    var fgcolor = get_color(fgkey);

    if (bgcolor != null) {
        element.style.backgroundColor = bgcolor;
    }
    if (fgcolor != null) {
        element.style.color = fgcolor;
    }
}

/**
 * Converts seed time format to hours.
 *
 * Supported formats are:
 *     * 20m and 30s
 *     * 21:21:21
 *     * 3d 21:21:21
 *
 * @param time {string} - Time to convert.
 */
function time_to_hours(time) {
    var regex = /(?:([0-9]+)m and ([0-9]+)s)|(?:(?:([0-9]+)[d] )?([0-9]{1,2}):([0-9]{2}):([0-9]{2}))/;
    var vals = regex.exec(time);
    if (!vals) { return 0; }
    var time_in_hours = 0;
    var min = 0;
    var sec = 0;
    var day = 0; var _day = "0";
    var hour = 0;

    if (vals[R_MIN]) {
        min = parseInt(vals[R_MIN]);
        sec = parseInt(vals[R_SEC]);
        time_in_hours = (60.0 * min + 1.0 * sec) / 3600.0;
    } else {
        min = parseInt(vals[R_MIN2]);
        sec = parseInt(vals[R_SEC2]);
        hour = parseInt(vals[R_HOUR]);
        _day = vals[R_DAY] ? vals[R_DAY] : "0";
        day = parseInt(_day);
        time_in_hours = 24.0 * day + hour + (60.0 * min + 1.0 * sec) / 3600.0;
    }
    return time_in_hours;
}

PRETOME_THEME = detect_pretome_theme();

var snapResults = document.evaluate('//h1[contains(text(), "Download History for ")]/..//table|//h1[contains(text(), "Download History for ")]/../../..//table',
	document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

if (snapResults == null) {
    unsafeWindow.console.error("Could not find the table to work on.", snapResults);
} else {

    // Initialize Variables.
    var r,s,h;
    var row, row_style, ratio, hnr_ok;
    var seed_running, seed_time, seed_hours;

    // Get the table.
    var table = snapResults.snapshotItem(0);

    if (table == null || table.nodeName != "TABLE") {
       unsafeWindow.console.error("Could not find the table or found element is not a table.", table);
    } else {
        // Loop over the rows / Skip the first row (start with 1).
        for (var i = 1; i < table.rows.length; i++) {
            row = table.rows[i];
            if (row.cells.length < 9) {
                continue;
            }

            r = row.cells[C_RATIO];
            s = row.cells[C_SEED];
            h = row.cells[C_HNR];

            // row styles alternate.
            row_style = (r.classList.contains("row1") ? 1 : 2);

            // parse the ratio.
            ratio = parseFloat(r.textContent);

            // unused for now. this is what the site reports as fine. But fine is only fine when its done imho.
            hnr_ok = (h.textContent == "Fine") ? true : false;

            // Seed contains the time we are seeding and if we are currently seeding.
            seed_running = (s.firstChild.textContent == "Yes") ? true : false;
            seed_time = (s.lastChild.textContent);
            seed_hours = time_to_hours(seed_time);

            // apply style to the elements.
            color_element("ratio", r, (ratio > PRETOME_MIN_RATIO), row_style);
            color_element("seed",  s, (seed_hours > PRETOME_MIN_SEED), row_style);
            color_element("hnr",   h, (ratio > PRETOME_MIN_RATIO || seed_hours > PRETOME_MIN_SEED), row_style);

        }
    }
}
