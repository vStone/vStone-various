// ==UserScript==
// @name        YATA Hacks
// @namespace   http://vstone.eu/greasemonkey
// @include     https://yata.inuits.eu/timesheets/*
// @version     0.1
// @grant       none
// ==/UserScript==


function tweak_it() {
    var table,
        snapResults = document.evaluate('//table[@id = "task-list"]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    if (snapResults === null) { return false; }
    table = snapResults.snapshotItem(0);
    if (table === null) { return false; }
    tfooter = document.createElement('tfoot');
    tfooter.appendChild(document.getElementById('total'));
    tfooter.appendChild(document.getElementById('total-days'));
    table.appendChild(tfooter);
}

tweak_it();
