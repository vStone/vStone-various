// ==UserScript==
// @name        pretome - user info - calculate ratio
// @namespace   http://vstone.eu/greasemonkey/
// @description Displays the ratio in the User Info box.
// @include     https://pretome.info/*
// @version     0.1
// @grant       none
// ==/UserScript==

// find the element we need.
//
//
var snapTotalData = document.evaluate('//b[text() = "STATS"]/../..|//h2[text() = "User Info"]/following-sibling::table//td[contains(text(), "Total:")]',
		document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);


function create_ratiospan() {
    ratioSpan = document.createElement('span');
    ratioSpan.setAttribute('id', 'custom_info_ratio_box');
    return ratioSpan;
}

if (snapTotalData) {

    var color_ok = "green";
    var color_nok = "red";
    var ratioSpan = null;
    var ratioParent = null;
    var element = snapTotalData.snapshotItem(0);
    var textPattern = /(?:total:|stats\/\/ total) ([0-9.]+) ([GT]B)[ ]*(?:\(|[.]+)([0-9.]+) ([GT]B) up\)?/i


    switch (element.nodeName) {
        // Theme grKosta uses this.
        case "LI":
            ratioParent = element;
            resultPrefix = " //RATIO: ";
            color_ok = "#98ED5A";
            color_nok = "#DA0000";
            break;
        // Most other themes.
        case "TD":
            if (! document.getElementById('custom_info_ratio_parent')) {
               var row = document.createElement('tr');
               ratioParent = document.createElement('td');
               ratioParent.setAttribute("class", "row2");
               ratioParent.setAttribute('id','custom_info_ratio_parent');
               row.appendChild(ratioParent);
               element.parentNode.parentNode.appendChild(row);
            }
            resultPrefix = "Ratio: ";
            break;
        default:
            return;
            break;
    }


    // Add our new element into the dom.

    if (! document.getElementById('custom_info_ratio_box')) {
      ratioSpan = create_ratiospan();
      ratioParent.appendChild(ratioSpan);
    }
    else {
      ratioSpan = document.getElementById('custom_info_ratio_box');
    }

    var result = "Unknown";

    // regex pattern
    var text = element.textContent;
    var values = textPattern.exec(text);

    if (values == null) {
       unsafeWindow.console.error("Could not find / parse the data");
       result = "ERROR";
    }
    else {
      unsafeWindow.console.log("Doing fine");
      var sizeup = values[3];
      var upsize = values[4];
      if (upsize == 'TB') { realup = sizeup * 1024; }
      else { realup = sizeup; }

      var sizetotal = values[1];
      var totalsize = values[2];
      if (totalsize == 'TB') { realtotal = sizetotal * 1024; }
      else { realtotal = sizetotal; }

      var downloaded = realtotal - realup;
      var ratio = Math.round((realup / downloaded) * 100) / 100;
      if (ratio >= 1) {
        result = "<span style='color: " + color_ok + ";'>" + ratio + "</span>";
      }
      else {
        result = "<span style='color: " + color_nok + ";'>" + ratio + "</span>";
      }
    }
    ratioSpan.innerHTML = resultPrefix + "<b>" + result + "</b>";
}
