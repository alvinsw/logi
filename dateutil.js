"use strict";

module.exports = {
  parse : parseDate,
  formatDate : formatDate,
  formatTime : formatTime,
  formatMis : formatMis
};
/*
var rePattern = [
  [/yyyy/i, '(\d{4})'],
  [/yy/i, '(\d{2})'],
  [/MM/, '(\d{2})'],
  [/dd/i, '(\d{2})'],
  [/hh/i, '(\d{2})'],
  [/mm/i, '(\d{2})'],
  [/ss/i, '(\d{2})'],
  [/ms/i, '(\d{3})']
];
*/
var parseRegex = /.+\.(\d{4})(\d{2})(\d{2})(?:_(\d{2})(\d{2})(\d{2}))?(?:_(\d{3}))?/;
function parseDate(datestr){
  var matches = datestr.match(parseRegex);
  var params = [];
  if (matches && matches.length === 8) {
    for (var i=0; i<7; ++i) {
      params[i] = parseInt(matches[i+1]) || 0;
    }
    // month starts from 0
    params[1]--;
    return new Date(Date.UTC.apply(Date, params));
  }
}

//function createRegexPattern(format) {
  // replace all date related patterns with regex capture group and record the sequence
  //var chuncks = [];

//}

function formatDate(date/*, format*/) {
  var yyyy = date.getUTCFullYear();
  var MM = date.getUTCMonth() + 1;
  var dd = date.getUTCDate();
  MM = (MM < 10) ? ('0' + MM) : MM;
  dd = (dd < 10) ? ('0' + dd) : dd;
  return '' + yyyy + MM + dd;
}

function formatTime(date) {
  var hh = date.getUTCHours();
  var mm = date.getUTCMinutes();
  var ss = date.getUTCSeconds();
  hh = (hh < 10) ? ('0' + hh) : hh;
  mm = (mm < 10) ? ('0' + mm) : mm;
  ss = (ss < 10) ? ('0' + ss) : ss;
  return '' + hh + mm + ss;
}

function formatMis(date) {
  var mis = date.getUTCMilliseconds();
  mis = (mis < 10) ? ('00' + mis) : ((mis < 100) ? '0' + mis : mis);
  return '' + mis;
}

//var pattern = new RegExp('(' + escapePattern(fa.pattern) + ')\-?(\d*)');

//console.log(parseDate('tomcat.20150102.log'));
