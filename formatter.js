/**
 * Default formatter
 * Formatter must return a function that takes the following arguments:
 * - level label, eg: 'debug', 'error', etc
 * - scope, the current scope or module name that does the logging
 * - formatArgs, an array of arguments: a printf-like format text that can contain placeholder, followed by
 * - one or more arguments after the format wil be used as the value of the placeholder
 */
"use strict";

var util = require('util');

module.exports = function(opts_) {
  var opts = opts_ || {};
  if (opts.omitTimestamp) return formatNoTimestamp;
  else return format;
};

function format(levelLabel, scope, formatArgs) {
  var prefix = '[' + (new Date()).toISOString() + '] [' + levelLabel.toUpperCase() + '] [' + scope + '] - ';
  return prefix + util.format.apply(util, formatArgs) + '\n';
}

function formatNoTimestamp(levelLabel, scope, formatArgs) {
  var prefix = '[' + levelLabel.toUpperCase() + '] [' + scope + '] - ';
  return prefix + util.format.apply(util, formatArgs) + '\n';
}
