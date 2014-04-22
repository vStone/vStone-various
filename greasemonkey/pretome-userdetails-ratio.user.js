// ==UserScript==
// @name        pretome - userdetails calculate ratio
// @namespace   http://vstone.eu/greasemonkey/
// @description Displays the ratio on the userdetails page.
// @include     https://pretome.info/userdetails.php?id=*
// @version     0.1.1
// @grant       none
// ==/UserScript==


function userdetails_calculate_ratio() {
    // find the element we need.
    var snapTotalData = document.evaluate("//td[contains(text(),'Total Data')]/following-sibling::td",
            document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

    if (snapTotalData) {
        var result = "Unknown";
        var ratio, downloaded;
        var realup, realtotal;
        var sizeup, upsize, sizetotal, totalsize;

        // regex pattern
        var pattern = /([0-9.]+) ([TG]B) \(([0-9.]+) ([TG]B) total\)/;

        var element = snapTotalData.snapshotItem(0);
        var text = element.textContent;
        var totalDataString = text.split('|')[0];

        var values = totalDataString.match(pattern);

        var ratioSpan;
        // Add our new element into the dom.
        if (! document.getElementById('custom_ratio_box')) {
            ratioSpan = document.createElement('span');
            ratioSpan.setAttribute('id', 'custom_ratio_box');
            element.appendChild(ratioSpan);
        }
        else {
            ratioSpan = document.getElementById('custom_ratio_box');
        }



        if (values == null) {
            unsafeWindow.console.error("Could not find / parse the Total Data");
            result = "ERROR";
        }
        else {
            sizeup = values[1];
            upsize = values[2];
            sizetotal = values[3];
            totalsize = values[4];

            if (upsize == 'TB') { realup = sizeup * 1024; }
            else { realup = sizeup; }
            if (totalsize == 'TB') { realtotal = sizetotal * 1024; }
            else { realtotal = sizetotal; }

            downloaded = realtotal - realup;
            ratio = Math.round((realup / downloaded) * 100) / 100;
            if (ratio >= 1) {
                result = "<span style='color: green;'>" + ratio + "</span>";
            }
            else {
                result = "<span style='color: red;'>" + ratio + "</span>";
            }
        }
        ratioSpan.innerHTML = " | <b>Ratio: </b>" + result;
    }
    else {
        unsafeWindow.console.error("Could not find the Total Data element");
    }
}

userdetails_calculate_ratio();
