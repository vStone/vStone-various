/*jslint browser: true */

// ==UserScript==
// @name        pretome - HnR status
// @namespace   http://vstone.eu/greasemonkey/
// @include     https://pretome.info/*
// @version     0.3.1
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

// minimum required ratio
var PRETOME_MIN_RATIO = 0.8;
// OR minimum required seed time.
var PRETOME_MIN_SEED = 60.0;

var PRETOME_THEME = "defaults";
var PRETOME_USERID = null;

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
        "hnr_ok_bg_row1":     "#A9E6A7",
        "hnr_ok_bg_row2":     "#93C490",
        "hnr_ok_fg_row1":     null,
        "hnr_ok_fg_row2":     null,
        "hnr_nok_bg_row1":    "#E6A8A7",
        "hnr_nok_bg_row2":    "#C49095",
        "hnr_nok_fg_row1":    null,
        "hnr_nok_fg_row2":    null,

        "ratio_ok_bg_row1":   "#A9E6A7",
        "ratio_ok_bg_row2":   "#93C490",
        "ratio_ok_fg_row1":   null,
        "ratio_ok_fg_row2":   null,
        "ratio_nok_bg_row1":  null,
        "ratio_nok_bg_row2":  null,
        "ratio_nok_fg_row1":  null,
        "ratio_nok_fg_row2":  null,

        "seed_ok_bg_row1":    "#A9E6A7",
        "seed_ok_bg_row2":    "#93C490",
        "seed_ok_fg_row1":    null,
        "seed_ok_fg_row2":    null,
        "seed_nok_bg_row1":   null,
        "seed_nok_bg_row2":   null,
        "seed_nok_fg_row1":   null,
        "seed_nok_fg_row2":   null
    },
    "Bday": {
        "hnr_ok_fg_row1":     "green",
        "hnr_ok_fg_row2":     "green",
        "hnr_nok_fg_row1":    "red",
        "hnr_nok_fg_row2":    "red",
        "seed_ok_fg_row1":    "black",
        "seed_ok_fg_row2":    "black"
    },
    "Industrial": {
        "hnr_ok_fg_row1":     "green",
        "hnr_ok_fg_row2":     "green",
        "hnr_nok_fg_row1":    "red",
        "hnr_nok_fg_row2":    "red",
        "seed_ok_fg_row1":    "black",
        "seed_ok_fg_row2":    "black"
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
    if (snapResults === null) {
        throw "Element not found with parent: " + parent + " / xpath:" + xpath;
    }
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
PRETOME_THEME = detect_pretome_theme();


function detect_pretome_userid() {
    'use strict';
    var node, href, regex,
        xpath = "//a[contains(@href, 'userdetails.php?id=')]";

    regex = /[0-9]+$/;
    node = get_elements(xpath);

    if (node === null || node.snapshotItem(0) === null) { return false; }
    node = node.snapshotItem(0);
    href = node.getAttribute('href');
    return regex.exec(href);
}
PRETOME_USERID = detect_pretome_userid();

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
        script_default = data[type] || RAINBOW.defaults[type];
    } else {
        script_default = RAINBOW.defaults[type];
    }
    return GM_getValue(key, script_default);
}

/**
 * Colors the given element depending on the status.
 *
 * @param type {string} - Name of the column.
 * @param element {HTMLElement} - DOM Object to operate on.
 * @param status {boolean} - Status (true, false) is converted to ok, nok. You can also use ok, nok directly.
 * @param row {integer} - Row number (1 or 2).
 */
function color_element(element, type, status, row) {
    "use strict";
    if (status === true || status === false) {
        status = status ? "ok" : "nok";
    }
    var bgkey = type + "_" + status + "_bg_row" + row,
        fgkey = type + "_" + status + "_fg_row" + row,
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
        time_in_hours = ((60.0 * min) + sec) / 3600.0;
    } else {
        min = parseInt(vals[R_MIN2], 10);
        sec = parseInt(vals[R_SEC2], 10);
        hour = parseInt(vals[R_HOUR], 10);
        day = parseInt(vals[R_DAY] || "0", 10);
        time_in_hours = 24.0 * day + hour + ((60.0 * min) + sec) / 3600.0;
    }
    return time_in_hours;
}


// Common method to find the Download history table.
function hnr_findtable() {
    'use strict';
    var snapResults, table;

    snapResults = get_elements('//h1[contains(text(), "Download History for ")]/..//table|//h1[contains(text(), "Download History for ")]/../../..//table');
    if (snapResults === null) {
        unsafeWindow.console.error("Could not find the table to work on.", snapResults);
        throw "Could not find the table on this page.";
    }
    table = snapResults.snapshotItem(0);
    if (table === null || table.nodeName !== 'TABLE') {
        unsafeWindow.console.error("Could not find the table to work on.", snapResults);
        throw "Could not find the table on this page.";
    }
    return table;

}

// Place headers in thead.
function hnr_fixheader() {
    'use strict';

    var table, thead, rowhead;

    table = hnr_findtable();
    thead = document.createElement('thead');
    rowhead = table.rows[0];
    thead.appendChild(rowhead);
    table.insertBefore(thead, table.firstChild);

}

// Colorify the table.
function hnr_rainbow() {
    "use strict";

    var i, r, s, h, row, row_style, ratio, seed_time, seed_hours, table;
    table = hnr_findtable();

    // Loop over the rows / Skip the first row (start with 1).
    for (i = 1; i < table.rows.length; i += 1) {
        row = table.rows[i];
        if (row.cells.length === 9) {
            r = row.cells[C_RATIO];
            s = row.cells[C_SEED];
            h = row.cells[C_HNR];

            // row styles alternate.
            row_style = (r.classList.contains("row1") ? 1 : 2);

            // parse the ratio.
            ratio = parseFloat(r.textContent);

            // unused for now. this is what the site reports as fine. But fine is only fine when its done imho.
            //var hnr_ok       = (h.textContent === "Fine") ? true : false;

            // Seed contains the time we are seeding and if we are currently seeding.
            //var seed_running = (s.firstChild.textContent === "Yes") ? true : false;
            seed_time    = (s.lastChild.textContent);
            seed_hours   = time_to_hours(seed_time);

            // apply style to the elements.
            color_element(r, "ratio", (ratio > PRETOME_MIN_RATIO), row_style);
            color_element(s, "seed",  (seed_hours > PRETOME_MIN_SEED), row_style);
            color_element(h, "hnr",   (ratio > PRETOME_MIN_RATIO || seed_hours > PRETOME_MIN_SEED), row_style);
        }
    }
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

function hnr_settings_colorpickers(type, row, ok) {
    'use strict';
}

// generates a color picker element.
function hnr_settings_colorblock(type, row) {
    'use strict';
    var element, lefty, righty;

    element = document.createElement('div');
    element.setAttribute('class', row);
    element.style.marginTop = 0;
    element.style.marginBottom = 0;
    element.style.marginLeft = 0;
    element.style.marginRight = 0;
    element.style.width = '100%';

    lefty = document.createElement('div');
    lefty.style.width = '50%';
    lefty.style.cssFloat = "left";
    lefty.innerHTML = "lefty";

    righty = document.createElement('div');
    righty.style.width = '50%';
    righty.style.overflow = "hidden";

    righty.innerHTML = "righty";

    //righty.style.backgroundColor = '#f0f';
    //lefty.style.backgroundColor = '#0ff';

    element.appendChild(lefty);
    element.appendChild(righty);
    return element;
}

function hnr_settings_theme_rows(table, index, theme) {
    'use strict';
    index = index === undefined ? 1 : index;
    theme = theme === undefined ? "defaults" : theme;

    var type, row1, row2, cell_row1, cell_row2, cell_type, i,
        last_index = index,
        types = ['ratio', 'seed', 'hnr'];

    table.insertRow(index).innerHTML = "<td class='row2' colspan='2'><h3>Theme " + theme + "</h3></td>";

    for (i = 0; i < types.length; i = i + 1) {
        type = types[i];

        last_index += 1;
        row1 = table.insertRow(last_index);
        last_index += 1;
        row2 = table.insertRow(last_index);

        cell_type = row1.insertCell(0);
        cell_type.setAttribute('rowspan', 2);
        cell_type.setAttribute('class', 'rowhead');
        cell_type.innerHTML = type;

        cell_row1 = row1.insertCell(1);
        cell_row1.appendChild(hnr_settings_colorblock(type, 'row1'));

        cell_row2 = row2.insertCell(0);
        cell_row2.appendChild(hnr_settings_colorblock(type, 'row2'));

    }

    /*for (var type in RAINBOW["defaults"]) {
      last_index += 1;
      var key = "pretome.theme." + theme + "." + type;
      var value = GM_getValue(key, false);
      table.insertRow(last_index).innerHTML = "<td>" + type + "</td><td>" + value + "</td>";
    }*/
    return last_index + 1;
}

function hnr_settings_save_intercept(event) {
    'use strict';
    var frm = event ? event.target : this;
    unsafeWindow.console.log("Saving your settings BIATCH");

    // Store all the values using GM_setValue();

    // Remove them from the form.

    // Call original submit.
    unsafeWindow.console.log("Call original form");
    HTMLFormElement.prototype._submit.apply(frm);
}

function hnr_settings_display(show) {
    'use strict';
    unsafeWindow.console.log("Showing the configuration dialog");
    var snapResults, the_form, _table, table, _buttons,
        index, themes, i;

    //Intercept the form
    //Save our data stuffs on submit
    //Remove our elements from the data stuffs

    snapResults = get_elements('//input[@value = "Update Profile"]/ancestor::form');
    if (snapResults !== null) {
        // Override the default form actions.
        the_form = snapResults.snapshotItem(0);

        if (show === "hnr") {
            unsafeWindow.console.log("No other settings, make sure we dont submit :)");
            the_form.method = "get";
            the_form.action = "javascript:;";
        }

        the_form.addEventListener('submit', hnr_settings_save_intercept, true);
        HTMLFormElement.prototype._submit = HTMLFormElement.prototype.submit;
        HTMLFormElement.prototype.submit = hnr_settings_save_intercept;

        _table = get_elements('.//table', the_form);
        if (_table === null) { return false; }
        table = _table.snapshotItem(0);
        _buttons = get_elements('.//td[@colspan = 2]', table);

        if (_buttons === null) { return false; }
        //_buttons.snapshotItem(0).setAttribute('colspan', TABLE_COLUMNS);

        table.insertRow(0).innerHTML = "<td class='row1' colspan='2'><h2>Hnr Settings</h2></td>";
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
        //unsafeWindow.console.log(themes);
        hnr_settings_theme_rows(table, index, PRETOME_THEME);
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
        hnr_settings_display(show);
        break;
    }

}

function hnr_find_first_matching_parent(element, type) {
    'use strict';

    var parent = element.parentNode;
    while (parent.nodeName !== type.toUpperCase()) {
        parent = parent.parentNode;
        if (parent.nodeName === 'HTML') {
            return null;
        }
    }
    return parent;

}


function hnr_add_link_to_userstuff() {
    'use strict';

    if (PRETOME_USERID === null) { return false; }

    var xpath, table, el, tr, row, cell, klass, i;
    xpath = "//a[text() = 'Inbox' and contains(@href, '/messages.php')]";
    el = get_elements(xpath).snapshotItem(0);

    tr = hnr_find_first_matching_parent(el, 'tr');
    if (tr === null) { return false; }
    table = hnr_find_first_matching_parent(tr, 'tbody');
    if (table === null) { return false; }

    row = document.createElement('tr');
    cell = document.createElement('td');
    cell.setAttribute("style", "text-align: center;");
    cell.innerHTML = "<a style='display:block;' href='/usertorrents.php?id=" +  PRETOME_USERID + "'>History</a>";
    row.appendChild(cell);
    table.insertBefore(row, tr);
    // fix row highlighting
    for (i = 0; i < table.rows.length; i += 1) {
        klass = "row" + (i % 2 === 0 ? '1' : '2');
        table.rows[i].cells[0].setAttribute('class', klass);
    }
}

// are we on the usertorrents page?
if (/\/usertorrents\.php\?id=[0-9]+/.exec(document.location.href) !== null) {
    hnr_fixheader();
    hnr_rainbow();
}
// Add direct link to the history in the user menu.
hnr_add_link_to_userstuff();

// SETTINGS
var my_match = /my\.php\??(?:show=([a-z]+)(?:&.*)?)?(?:#.*)?$/.exec(document.location.href);
if (my_match !== null) {
    hnr_settings(my_match[1]);
}

//GM_setValue('foobar', null);
//var v = GM_getValue('foobar', 'DEFAULT_VALUE');
//var u = GM_getValue('doesnotexist', 'DEFAULT_VALUE');
//alert(v);
//alert(u);
