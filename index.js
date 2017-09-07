"use strict";

var path = require('path');
var formatter = require('./formatter');
var appenders = {
  stdout : process.stdout,
  stderr : process.stderr
};

var defaultLevels = {trace: 100, debug:90, info:80, notice:70, warn:50, warning:50, error:30, critical:20, fatal:10};
var defaultThreshold = 100; //display all
var defaultErrorThreshold = 30; //output >error to stderr
var noop = function(){};

/**
 * Create a logger factory.
 * One or more appenders can be supplied to the out and err options. An appender is an object that implements one method: write(String|Buffer)
 * @param {Object} [opts.levels] - pairs of log level name and value.
 *        Defaults to {trace: 100, debug:90, info:80, notice:70, warn:50, warning:50, error:30, critical:20, fatal:10}
 * @param {string|number} [opts.threshold=100] - All levels lower than or equal to this value will be logged to out stream
 * @param {string|number} [opts.errorThreshold=30] - All levels lower than or equal to this value will be additionally logged to err stream
 * @param {boolean} [opts.errorOut=false] - If false, appends error exclusively only to error appenders (err) which defaults to stderr
 * @param {boolean} [opts.showAbsolutePath=false] - Set to true to make the logger print an absolute path to the module. Default will print a shorter path relative to the main app.
 * @param {string|[Object]|Object} [opts.out=process.stdout] - Specify an appender (WritableStream instance) or a path to a file to make the logger logs to that file
 * @param {string|[Object]|Object} [opts.err=process.stderr] - Same as out but for logging of error types log (levels less or equal than the errorThreshold)
 */
var Factory = module.exports = function(opts) {
  if (!(this instanceof Factory)) {
    return new Factory(opts);
  }

  var factory = this;
  this._loggers = {};
  var Logger = this.Logger = function Logger(filename) {
    this.scope = filename || 'DEFAULT';
  };

  var options = opts || {};

  var levels = options.levels || defaultLevels;
  this._levelMap = processLevels(levels);
  this.showAbsolutePath = options.showAbsolutePath;
  var format = this._format = options.format || formatter(options.formatOptions);
  var outAppender = this._outAppender = resolveAppenders(options.out || [appenders.stdout]);
  var errAppender = this._errAppender = resolveAppenders(options.err || [appenders.stderr]);
  this._appendOut = function(msg){
    appendLog(outAppender, msg);
  };
  if (options.errorOut) {
    this._appendErr = function(msg){
      appendLog(outAppender, msg);
      appendLog(errAppender, msg);
    };
  } else {
    this._appendErr = function(msg){
      appendLog(errAppender, msg);
    };
  }

  if (options.errorThreshold == null) options.errorThreshold = defaultErrorThreshold;
  if (options.threshold == null) options.threshold = defaultThreshold;
  this.errorThreshold = options.errorThreshold;
  this.threshold = options.threshold;

  var LoggerProto = Logger.prototype;
  LoggerProto._log = function(level, formatArgs){
    var msg = format(level.name, this.scope, formatArgs);
    level._append(msg);
  };
  LoggerProto.log = function(level_){
    var level = factory.resolveLevel(level_);
    if (level.val <= factory._threshold) return;
    var i=arguments.length, args=new Array(i);while(i--){args[i]=arguments[i];}
    this._log(level, args);
  };
};

var proto = Factory.prototype;

Object.defineProperties(proto, {
  /** The log threshold. Any log request specified at lower level will not be displayed. */
  threshold : {
    get: function() { return this._threshold; },
    set: function(level) {
      this._threshold = this.resolveLevel(level).val;
      this._generateLoggerMethods();
    }
  },
  /**
   * The current error threshold level. Error threshold specifies a level that is considered as an error or worse.
   * A log request with specified level equal to or more than the error level will be sent to STDERR
   */
  errorThreshold : {
    get: function() { return this._errorThreshold; },
    set: function(level) {
      var et = this.resolveLevel(level).val;
      this._errorThreshold = et;

      var levels = this._levelMap.string;
      var appendOut = this._appendOut;
      var appendErr = this._appendErr;
      for (var name in levels) {
        levels[name]._append = ((levels[name].val <= et) ? appendErr : appendOut);
      }
    }
  }
});

/**
 * Create a logger. Specify a particular module to include the module path in the log information.
 * @param {Module|string} [module] - Built-in node module (i.e.: use `module`) or the name of a module
 */
proto.createLogger =
proto.getLogger =
proto.create = function(nodeModule) {
  //if (this.useRelativePath) filename = path.join(path.relative(process.cwd(), path.dirname(filename)), path.basename(filename));
  var filename = resolveKey(nodeModule, this.showAbsolutePath);
  if (!this._loggers[filename]) this._loggers[filename] = new this.Logger(filename);
  return this._loggers[filename];
};

/** Clear the cache of the logger associated with the module */
proto.release = proto.releaseLogger = function(nodeModule) {
  var filename = resolveKey(nodeModule, this.showAbsolutePath);
  delete this._loggers[filename];
}

function resolveKey(nodeModule, showAbsolutePath) {
  var filename = 'DEFAULT';
  if (nodeModule) {
    if (typeof nodeModule == 'string') filename = nodeModule;
    else if (nodeModule.filename) filename = nodeModule.filename;
  }
  if (!showAbsolutePath) filename = path.relative(path.dirname(require.main.filename), filename);
  return filename;
}

function resolveAppenders(opts_) {
  var result = [];
  var opts = (typeof opts_ === 'string') ? [opts_] : opts_;
  if (Array.isArray(opts)) {
    opts.forEach(function(appender){
      if (typeof appender === 'string') {
        result.push(resolveAppender('file', appender));
      } else if (typeof appender.write === 'function') {
        result.push(appender);
      }
    });
  } else if (typeof opts === 'object') {
    Object.keys(opts).forEach(function(name){
      result.push(resolveAppender(name, opts[name]));
    });
  }
  return result;
}

function tryRequireAppenders(names) {
  for (var i = 0; i < names.length; ++i) {
    try {
      return require(names[i]);
    } catch (err) {
      // do nothing
    }
  }
}

function resolveAppender(appender_, opts) {
  var appender = appender_;
  if (typeof appender === 'string') {
    var createAppender = appenders[appender];
    if (!createAppender) createAppender = tryRequireAppenders(['./appender-' + appender, appender]);
    if (createAppender) appender = createAppender(opts);
    else throw new TypeError('Appender ' + appender + ' cannot be found.');
  }
  if (typeof appender !== 'object') throw new TypeError('Incorrect appender used.');
  return appender;
}

proto.addAppender = function(appender, opts) {
  this._outAppenders.push(resolveAppender(appender, opts));
};

proto.addErrAppender = function(appender, opts) {
  this._errAppenders.push(resolveAppender(appender, opts));
};

proto.resolveLevel = function(level_) {
  var ltype = typeof level_;
  return getProp(resolveLevel, ltype)(this, level_);
};

var resolveLevel = {
  'string' : function(factory, levelName) {
    return getProp(factory._levelMap.string, levelName.toLowerCase());
  },
  'number' : function(factory, levelVal) {
    var level = factory._levelMap.number[levelVal];
    if (!level) {
      level = {
        name:'level-' + levelVal,
        val:levelVal,
        _append : ((levelVal <= factory._errorThreshold) ? factory._appendErr : factory._appendOut)
      };
    }
    return level;
  }
};

proto._generateLoggerMethods = function() {
  var threshold = this._threshold;
  var LoggerProto = this.Logger.prototype;
  var levels = this._levelMap.string;
  Object.keys(levels).forEach(function(levelName){
    var level = levels[levelName];
    if (level.val <= threshold) {
      LoggerProto[levelName] = function() {
        var i=arguments.length, args=new Array(i);while(i--){args[i]=arguments[i];}
        this._log(level, args);
      };
    } else {
      LoggerProto[levelName] = noop;
    }
  });
}

function appendLog(appenders_, msg){
  for (var i=0,len=appenders_.length; i<len; ++i) {
    appenders_[i].write(msg);
  }
}

function processLevels(levels) {
  var levelMap = {string:{}, number:{}};
  var levelName, levelVal;
  for (levelName in levels) {
    levelVal = levels[levelName];
    var level = {
      name : levelName,
      val : levelVal,
      _append : noop
    };
    levelMap.string[levelName] = levelMap.number[levelVal] = level;
  }
  return levelMap;
}

function getProp(obj, key) {
  var prop = obj[key];
  if (prop) return prop;
  else throw new TypeError('Invalid log level.');
}
