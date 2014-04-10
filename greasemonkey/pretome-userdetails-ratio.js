// ==UserScript==
// @name        pretome - userdetails calculate ratio
// @namespace   http://vstone.eu/greasemonkey/pretome-userdetails-ratio/
// @description Displays the ratio on the userdetails page.
// @include     https://pretome.info/userdetails.php?id=*
// @version     0.1
// @grant       none
// ==/UserScript==

// find the element we need.
var snapTotalData = document.evaluate("//td[contains(text(),'Total Data')]/following-sibling::td",
		document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
var element = snapTotalData.snapshotItem(0);
var text = element.textContent;
var totalDataString = text.split('|')[0];

// regex pattern
var pattern = /([0-9.]+) ([TG]B) \(([0-9.]+) ([TG]B) total\)/;
var values = totalDataString.match(pattern);

// Add our new element into the dom.
var ratioSpan = document.createElement('span');
ratioSpan.setAttribute('id', 'custom_ratio_box');
if (! document.getElementById('custom_ratio_box')) {
  element.appendChild(ratioSpan);
}
var result = "Unknown";

if (values == null) {
  console.error("Could not find / parse the Total Data");
  result = "ERROR";
}
else {
  var sizeup = values[1];
  var upsize = values[2];
  if (upsize == 'TB') { realup = sizeup * 1024; }
  else { realup = sizeup; }

  var sizetotal = values[3];
  var totalsize = values[4];
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
ratioSpan.innerHTML = " | <b>Ratio: </b>" + result;
