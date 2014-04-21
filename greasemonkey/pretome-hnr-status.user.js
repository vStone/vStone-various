// ==UserScript==
// @name        pretome - HnR status
// @namespace   http://vstone.eu/greasemonkey/
// @include     https://pretome.info/usertorrents.php?id=*
// @version     0.1.2
// @grant       GM_getValue
// ==/UserScript==

// minimum required ratio
var PRETOME_MIN_RATIO = 0.8;
// OR minimum required seed time.
var PRETOME_MIN_SEED = 60.0;

var RAINBOW = {"defaults": {
       "hnr_ok_row1": "#A9E6A7",
       "hnr_nok_row1": "#E6A8A7",
       "hnr_ok_row2": "#93C490",
       "hnr_nok_row2": "#C49095"
    },
    "WinterHoliday08": {
       "hnr_ok_row1": "#A9E6A7",
       "hnr_nok_row1": "#E6A8A7",
       "hnr_ok_row2": "#93C490",
       "hnr_nok_row2": "#C49095"
    }
}

var R_MIN = 1;
var R_SEC = 2;
var R_DAY = 3;
var R_HOUR = 4;
var R_MIN2 = 5;
var R_SEC2 = 6;

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
var pretome_theme = detect_pretome_theme();

function get_color(type, theme) {
    var key = "pretome.theme." + theme + "." + type;
    if (RAINBOW[theme]) {
        var theme = RAINBOW[theme];
        script_default = (theme[type] ? theme[type] : RAINBOW["defaults"][type])
    } else {
       script_default = RAINBOW["defaults"][type] ;
    }
    return GM_getValue(key, script_default);
}


var HNR_OK_ROW1 = get_color("hnr_ok_row1", pretome_theme);
var HNR_OK_ROW2 = get_color("hnr_ok_row2", pretome_theme);
var HNR_NOT_OK_ROW1 = get_color("hnr_nok_row1", pretome_theme);
var HNR_NOT_OK_ROW2 = get_color("hnr_nok_row2", pretome_theme);

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

var snapResults = document.evaluate('//h1[contains(text(), "Download History for ")]/..//table|//h1[contains(text(), "Download History for ")]/../../..//table',
	document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

var C_RATIO = 3;
var C_SEED = 7;
var C_HNR = 8;

var r = null;
var s = null;
var h = null;
var row = null;

var is_hnr = true;
var row_style = 1;

var ok_color = "";
var nok_color = "";

var table = snapResults.snapshotItem(0);

for (var i = 1; i < table.rows.length; i++) {
    is_hnr = true;
    row = table.rows[i];
    if (row.cells.length < 9) {
        continue;
    }
    r = row.cells[C_RATIO];
    s = row.cells[C_SEED];
    h = row.cells[C_HNR];

    row_style = (r.classList.contains("row1") ? 1 : 2);
    ok_color = (row_style == 1) ? HNR_OK_ROW1 : HNR_OK_ROW2;
    nok_color = (row_style == 1) ? HNR_NOT_OK_ROW1 : HNR_NOT_OK_ROW2;

    ratio = parseFloat(r.textContent);
    hnr_ok = (h.textContent == "Fine") ? true : false;
    seed_running = (s.firstChild.textContent == "Yes") ? true : false;
    seed_time = (s.lastChild.textContent);
    seed_hours = time_to_hours(seed_time);


    if (ratio > PRETOME_MIN_RATIO) {
        is_hnr = false;
        r.style.backgroundColor = ok_color;
    }
    if (seed_hours > PRETOME_MIN_SEED) {
        is_hnr = false;
        s.style.backgroundColor = ok_color;
    }
    if (is_hnr == true) {
        h.style.backgroundColor = nok_color;
    } else {
        h.style.backgroundColor = ok_color;
    }
//    unsafeWindow.console.log("HNR ok: '" + hnr_ok + "'");
//    unsafeWindow.console.log("Seed_running: '" + seed_running + "'");
//    unsafeWindow.console.log("Seed_time: '" + seed_time + "' => " + seed_hours);

}
