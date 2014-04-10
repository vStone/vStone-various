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
var snapTotalData = document.evaluate('//h2[text() = "User Info"]/following-sibling::table//td[contains(text(), "Total:")]',
		document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
var element = snapTotalData.snapshotItem(0);
var text = element.textContent;

// Add our new element into the dom.
var ratioSpan;

if (! document.getElementById('custom_info_ratio_box')) {
  ratioSpan = document.createElement('span');
  ratioSpan.setAttribute('id', 'custom_info_ratio_box');

  var row = document.createElement('tr');
  var cell = document.createElement('td');
  cell.setAttribute("class", "row2");
  row.appendChild(cell);
  cell.appendChild(ratioSpan);

  element.parentNode.parentNode.appendChild(row);
}
else {
  ratioSpan = document.getElementById('custom_info_ratio_box')
}

var result = "Unknown";

// regex pattern
var pattern = /Total: ([0-9.]+) ([GT]B) \(([0-9.]+) ([GT]B) up\)/;
var values = text.match(pattern);

if (values == null) {
  console.error("Could not find / parse the Total Data");
  result = "ERROR";
}
else {
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
    result = "<span style='color: green;'>" + ratio + "</span>";
  }
  else {
    result = "<span style='color: red;'>" + ratio + "</span>";
  }
}
ratioSpan.innerHTML = "Ratio: <b>" + result + "</b>";
