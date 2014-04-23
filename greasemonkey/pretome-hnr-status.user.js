/*jslint browser: true */

// ==UserScript==
// @name        pretome - HnR status
// @namespace   http://vstone.eu/greasemonkey/
// @include     https://pretome.info/usertorrents.php*
// @include     https://pretome.info/my.php*
// @version     0.2.1
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

// minimum required ratio
var PRETOME_MIN_RATIO = 0.8;
// OR minimum required seed time.
var PRETOME_MIN_SEED = 60.0;

var PRETOME_THEME = "defaults";

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
        "seed_nok_text2":  null
    },
    "Bday": {
        "hnr_ok_text1":  "green",
        "hnr_ok_text2":  "green",
        "hnr_nok_text1": "red",
        "hnr_nok_text2": "red",
        "seed_ok_text1": "black",
        "seed_ok_text2": "black"
    },
    "Industrial": {
        "hnr_ok_text1":  "green",
        "hnr_ok_text2":  "green",
        "hnr_nok_text1": "red",
        "hnr_nok_text2": "red",
        "seed_ok_text1": "black",
        "seed_ok_text2": "black"
    }
};

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



function get_elements(xpath, parent) {
    "use strict";
    parent = parent === undefined ? document : parent;

    var snapResults = document.evaluate(xpath, parent, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    return snapResults;
}

// Detects the pretome theme in use by looking at loaded CSS stylesheets.
function detect_pretome_theme() {
    "use strict";
    var xpath = '//link[contains(@href, "/themes/") and @type= "text/css"]',
        snapResults = get_elements(xpath),
        css = snapResults.snapshotItem(0),
        re = /\/themes\/([^\/]+)\//;
    if (css) {
        return re.exec(css.href)[1];
    }
    return false;
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
function get_color(type, theme) {
    "use strict";
    theme = theme === undefined ? PRETOME_THEME : theme;
    var script_default, data, key = "pretome.theme." + theme + "." + type;

    if (RAINBOW[theme]) {
        data = RAINBOW[theme];
        script_default = (data[type] !== null ? data[type] : RAINBOW.defaults[type]);
    } else {
        script_default = RAINBOW.defaults[type];
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
    "use strict";
    if (status === true || status === false) {
        status = status ? "ok" : "nok";
    }
    var bgkey = column + "_" + status + "_row" + row,
        fgkey = column + "_" + status + "_text" + row,
        bgcolor = get_color(bgkey),
        fgcolor = get_color(fgkey);

    if (bgcolor !== null) {
        element.style.backgroundColor = bgcolor;
    }
    if (fgcolor !== null) {
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
    "use strict";
    var time_in_hours = 0,
        min = 0,
        sec = 0,
        day = 0,
        hour = 0,
        regex = /(?:([0-9]+)m and ([0-9]+)s)|(?:(?:([0-9]+)[d] )?([0-9]{1,2}):([0-9]{2}):([0-9]{2}))/,
        vals = regex.exec(time);

    if (vals === null) { return false; }


    if (vals[R_MIN]) {
        min = parseInt(vals[R_MIN], 10);
        sec = parseInt(vals[R_SEC], 10);
        time_in_hours = (60.0 * min + 1.0 * sec) / 3600.0;
    } else {
        min = parseInt(vals[R_MIN2], 10);
        sec = parseInt(vals[R_SEC2], 10);
        hour = parseInt(vals[R_HOUR], 10);
        day = parseInt(vals[R_DAY] === null ? vals[R_DAY] : "0", 10);
        time_in_hours = 24.0 * day + hour + (60.0 * min + (1.0 * sec)) / 3600.0;
    }
    return time_in_hours;
}

PRETOME_THEME = detect_pretome_theme();
var TABLE_COLUMNS = 3;

function hnr_rainbow() {
    "use strict";

    var i, r, s, h, row, row_style, hnr_ok, ratio, seed_running, seed_time, seed_hours, table, snapResults;

    snapResults = get_elements('//h1[contains(text(), "Download History for ")]/..//table|//h1[contains(text(), "Download History for ")]/../../..//table');

    if (snapResults === null) {
        unsafeWindow.console.error("Could not find the table to work on.", snapResults);
    } else {

        // Initialize Variables.

        table = snapResults.snapshotItem(0);

        if (table === null || table.nodeName !== "TABLE") {
            unsafeWindow.console.error("Could not find the table or found element is not a table.", table);
        } else {
            // Loop over the rows / Skip the first row (start with 1).
            for (i = 1; i < table.rows.length; i++) {
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
                hnr_ok = (h.textContent === "Fine") ? true : false;

                // Seed contains the time we are seeding and if we are currently seeding.
                seed_running = (s.firstChild.textContent === "Yes") ? true : false;
                seed_time = (s.lastChild.textContent);
                seed_hours = time_to_hours(seed_time);

                // apply style to the elements.
                color_element("ratio", r, (ratio > PRETOME_MIN_RATIO), row_style);
                color_element("seed",  s, (seed_hours > PRETOME_MIN_SEED), row_style);
                color_element("hnr",   h, (ratio > PRETOME_MIN_RATIO || seed_hours > PRETOME_MIN_SEED), row_style);

            }
        }
    }
}

// are we on the usertorrents page?
if (/\/usertorrents\.php\?id=[0-9]+/.exec(document.location.href) !== null) {
    hnr_rainbow();
}

function hnr_settings_link() {
    'use strict';
    var el, br, link, snapResults;

    snapResults = get_elements('//a[contains(@href, "show=all")]');
    if (snapResults !== null) {
        el = snapResults.snapshotItem(0);
        br = document.createElement("br");
        link = document.createElement("a");
        link.href = "/my.php?show=hnr";
        link.text = "Configure HnR Status (User script)";
        el.parentNode.insertBefore(br, el);
        el.parentNode.insertBefore(link, br);
    }

}

function hnr_settings_save(event) {
    'use strict';
    //var target = event ? event.target : this;
    unsafeWindow.console.log("Saving your settings BIATCH");
    // Store all the values using GM_setValue();

}

// generates a color picker element.
function hnr_settings_colorpick() {
    'use strict';
}

function hnr_settings_theme_rows(table, index, theme) {
    'use strict';
    index = index === undefined ? 1 : index;
    theme = theme === undefined ? "defaults" : theme;

    var type, row1, row2, row1_ok, row1_nok, row2_ok, row2_nok, type_cell, i,
        last_index = index,
        types = ['ratio', 'seed', 'hnr'];

    table.insertRow(index).innerHTML = "<td class='row2' colspan='" + TABLE_COLUMNS + "'><h3>Theme " + theme + "</h3></td>";

    for (i = 0; i < types.length; i = i + 1) {
        type = types[i];

        last_index += 1;
        row1 = table.insertRow(last_index);
        last_index += 1;
        row2 = table.insertRow(last_index);

        type_cell = row1.insertCell(0);
        type_cell.setAttribute('rowspan', 2);
        type_cell.innerHTML = "<b>" + type + "</b>";
        row1_ok = row1.insertCell(1);
        row1_nok = row1.insertCell(2);
        row2_ok = row2.insertCell(0);
        row2_nok = row2.insertCell(1);

        row1_ok.innerHTML = "ROW1_OK";
        row1_nok.innerHTML = "ROW1_NOK";
        row2_ok.innerHTML = "ROW2_OK";
        row2_nok.innerHTML = "ROW2_NOK";
    }

    /*for (var type in RAINBOW["defaults"]) {
      last_index += 1;
      var key = "pretome.theme." + theme + "." + type;
      var value = GM_getValue(key, false);
      table.insertRow(last_index).innerHTML = "<td>" + type + "</td><td>" + value + "</td>";
    }*/
    return last_index + 1;
}


function hnr_settings_display() {
    'use strict';
    unsafeWindow.console.log("Showing the configuration dialog");
    var snapResults, the_form, _table, table, _buttons,
        index, themes, i;


    snapResults = get_elements('//input[@value = "Update Profile"]/ancestor::form');
    if (snapResults !== null) {
        // Override the default form actions.
        the_form = snapResults.snapshotItem(0);
        the_form.method = "get";
        the_form.action = "javascript:;";
        the_form.addEventListener('submit', hnr_settings_save, true);
        HTMLFormElement.prototype._submit = HTMLFormElement.prototype.submit;
        HTMLFormElement.prototype.submit = hnr_settings_save;

        _table = get_elements('.//table', the_form);
        if (_table === null) { return false; }

        table = _table.snapshotItem(0);
        _buttons = get_elements('.//td[@colspan = 2]', table);
        if (_buttons === null) { return false; }
        _buttons.snapshotItem(0).setAttribute('colspan', TABLE_COLUMNS);

        table.insertRow(0).innerHTML = "<td class='row1' colspan='" + TABLE_COLUMNS + "'><h2>Hnr Settings</h2></td>";
        Object.defineProperty(Array.prototype, "filterValue", {
            enumerable: false,
            value: function (itemToRemove) {
                var filteredArray = this.filter(function (item) {
                    return item !== itemToRemove;
                });

                return filteredArray;
            }
        });
        index = 1;
        themes = Object.keys(RAINBOW).filterValue("defaults");
        unsafeWindow.console.log(themes);
        for (i = 0; i < themes.length; i = i + 1) {
            index = hnr_settings_theme_rows(table, index, themes[i]);
        }

    } else {
        unsafeWindow.console.error("Could not find the form");
    }

}

function hnr_settings(show) {
    'use strict';
    show = (show === undefined ? null : show);
    unsafeWindow.console.log("Show: " + show);

    // add the link
    hnr_settings_link();

    // show the settings!
    switch (show) {
    case "all":
    case "hnr":
        hnr_settings_display();
        break;
    }

}

var my_match = /my\.php\??(?:show=([a-z]+)(?:&.*)?)?(?:#.*)?$/.exec(document.location.href);
if (my_match !== null) {
    hnr_settings(my_match[1]);
}

//GM_setValue('foobar', null);
//var v = GM_getValue('foobar', 'DEFAULT_VALUE');
//var u = GM_getValue('doesnotexist', 'DEFAULT_VALUE');
//alert(v);
//alert(u);
