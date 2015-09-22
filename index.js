"use strict";
var path = require('path');
var util = require('util');
var fs = require('fs');

var fileStreams = {};
var defaultLevels = {trace: 100, debug:90, info:80, notice:70, warn:50, warning:50, error:30, critical:20, fatal:10};
var defaultThreshold = 100; //display all
var defaultErrorThreshold = 30; //output >error to stderr
var noop = function(){};

/**
 * Create a logger factory.
 * @param {Object} [options.levels] - pairs of log level name and value.
 *        Defaults to {trace: 100, debug:90, info:80, notice:70, warn:50, warning:50, error:30, critical:20, fatal:10}
 * @param {string|number} [options.threshold=100] - All levels lower than or equal to this value will be logged to out stream
 * @param {string|number} [options.errorThreshold=30] - All levels lower than or equal to this value will be additionally logged to err stream
 * @param {boolean} [showAbsolutePath] - Set to true to make the logger print an absolute path to the module. Default will print a shorter path relative to the main app.
 * @param {WritableStream|string} [out=process.stdout] - Specify a WritableStream or a path to a file to make the logger logs to that file
 * @param {WritableStream|string} [err=process.stderr] - Specify a WritableStream or a path to a file to make the logger logs errors to that file
 */
var Factory = module.exports = function(options) {
  if (!(this instanceof Factory)) {
    return new Factory(options);
  }
  
  var factory = this;
  options = options || {};
  
  var levels = options.levels || defaultLevels;
  this._threshold = resolveLevelValue(levels, options.threshold);
  if (typeof this._threshold !== 'number') this._threshold = defaultThreshold;
  this._errorThreshold = resolveLevelValue(levels, options.errorThreshold);
  if (typeof this._errorThreshold !== 'number') this._errorThreshold = defaultErrorThreshold;
  this._out = resolveStream(options.out) || process.stdout;
  this._err = resolveStream(options.err) || process.stderr;
  this.showAbsolutePath = options.showAbsolutePath;
  this._levelMap = {string:{}, number:{}};
  
  var Logger = this.Logger = function Logger(filename) {
    this.scope = filename || 'DEFAULT';
  };

  var processLevels = function(levelName, levelVal) {
    factory._levelMap.string[levelName] = factory._levelMap.number[levelVal] = {name: levelName, label:levelName.toUpperCase, val: levelVal};
    if (levelVal <= factory._threshold) {
      var out = factory._out;
      var err;
      if (levelVal <= factory._errorThreshold) err = factory._err;
      (function(streamout, streamerr, levelName, levelLabel){
        Logger.prototype[levelName] = function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(streamout, streamerr, levelLabel, this.scope);
          writelog.apply(this, args);
        };
      })(out, err, levelName, levelName.toUpperCase());
    } else {
      Logger.prototype[levelName] = noop;
    }
  };
  
  for (var key in levels) {
    processLevels(key.toLowerCase(), levels[key]);
  }

  Logger.prototype.log = function(level){
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift(factory, level, this.scope);
    log.apply(this, args);
  };
};

Object.defineProperties(Factory.prototype, {
  /** The log threshold. Any log request specified at lower level will not be displayed. */
  threshold : {
    get: function() { return this._threshold; },
    set: function(level) { this._threshold = resolveLevel(this._levelMap, level).val; }
  },
  /** 
   * The current error threshold level. Error threshold specifies a level that is considered as an error or worse. 
   * A log request with specified level equal to or more than the error level will be sent to STDERR 
   */
  errorThreshold : {
    get: function() { return this._errorThreshold; },
    set: function(level) { this._errorThreshold = resolveLevel(this._levelMap, level).val; }
  }
});

/**
 * Create a logger. Specify a particular module to include the module path in the log information.
 * @param {Module|string} [module] - Built-in node module (i.e.: use `module`) or the name of a module
 */
Factory.prototype.createLogger = 
Factory.prototype.getLogger =
Factory.prototype.create = function(nodeModule) {
  var filename = '';
  if (nodeModule) {
    if (typeof nodeModule == 'string') filename = nodeModule;
    else if (nodeModule.filename) filename = nodeModule.filename;
  }
  if (this.useRelativePath) filename = path.relative(path.dirname(require.main.filename), filename);
  //if (this.useRelativePath) filename = path.join(path.relative(process.cwd(), path.dirname(filename)), path.basename(filename));
  return new this.Logger(filename);
};

function getProp(obj, key) {
  var prop = obj[key];
  if (prop) return prop;
  else throw new TypeError('Invalid log level.');
}

function resolveLevel(levelMap, level) {
  var ltype = typeof level;
  return getProp(resolveLevel, ltype)(levelMap[ltype], level);
}

resolveLevel.string = function(levelMapStr, levelName) {
  return getProp(levelMapStr, levelName.toLowerCase());
};

resolveLevel.number = function(levelMapNum, levelVal) {
  var level = levelMapNum[levelVal];
  if (!level) level = {label:'LEVEL-'+levelVal, val:levelVal};
  return level;
};

function resolveLevelValue(levels, level) {
  if (typeof level !== 'string') return level;
  var val = levels[level.toLowerCase()];
  if (val) return val;
  else throw new TypeError('Invalid log level.');
}

function log(factory, level, scope) {
  level = resolveLevel(factory._levelMap, level);
  if (level.val <= factory._threshold) return;
  var streamout = factory._out;
  var streamerr;
  if (level.val <= factory._errorThreshold) streamerr = factory._err;
  var args = Array.prototype.slice.call(arguments, 2);
  args.unshift(streamout, streamerr, level.label);
  writelog.apply(null, args);
}

function writelog(streamout, streamerr, levelLabel, scope) {
  var prefix = '[' + (new Date()).toJSON() + '] [' + levelLabel + '] [' + scope + '] - ';
  var args = Array.prototype.slice.call(arguments, 4);
  args[0] = prefix + args[0];
  var msg = util.format.apply(util, args) + '\n';
  if (streamout) streamout.write(msg);
  if (streamerr) streamerr.write(msg);
}

function resolveStream(obj) {
  if (typeof obj !== 'string') return obj;
  var stream = fileStreams[obj];
  if (!stream) {
    fileStreams[obj] = stream = fs.createWriteStream(obj, { flags: 'a' });
    stream.on("error", function (err) {
      console.error('logi - ', err);
    });
  }
  return stream;
}

process.on('exit', function() {
  for (var key in fileStreams) {
    fileStreams[key].end();
  }
});