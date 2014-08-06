var path = require('path');

var defaultLevels = {debug:10, info:20, notice:30, warn:50, warning:50, error:70, critical:80, fatal:100};
var defaultThreshold = 0; //display all
var defaultErrorThreshold = 70; //output >error to stderr

/**
 * Create a logger factory.
 * @param {Object} [options.levels] - pairs of log level name and value.
 *        Defaults to {debug:10, info:20, notice:30, warn:50, warning:50, error:70, critical:80, fatal:100}
 * @param {string|number} [options.threshold] - Minimum level to be logged
 * @param {string|number} [options.errorThreshold] - Minimum level to be sent to stderr
 * @param {boolean} [useRelativePath=true] - Set to true to make the logger print a shorter path relative to the main app
 */
var Factory = module.exports = function(options) {
  if (!(this instanceof Factory)) {
    return new Factory(options);
  }
  
  var factory = this;
  options = options || {};
  var levels = options.levels || defaultLevels;
  var val, levelObj, key;
  
  if (options.dummy) {
    this.Logger = function(){};
    for (key in levels) this.Logger.prototype[key.toLowerCase()] = function(){};
    return;
  }
  
  this._levelsDict = {string:{}, number:{}};
  for (key in levels) {
    val = levels[key];
    levelObj = {s: key.toLowerCase(), n: val};
    this._levelsDict.string[key.toLowerCase()] = levelObj;
    this._levelsDict.number[val] = levelObj;
  }
  
  this._threshold = options.threshold || defaultThreshold;
  if (typeof this._threshold === 'string') {
    this._threshold = getLevel(this._levelsDict, this._threshold).n;
  }
  this._errorThreshold = options.errorThreshold || defaultErrorThreshold;
  if (typeof this._errorThreshold === 'string') {
    this._errorThreshold = getLevel(this._levelsDict, this._errorThreshold).n;
  }
  /** Set to true to make the logger print a shorter path relative to the main app. Default is true */
  this.useRelativePath = options.useRelativePath || true;
  
  var Logger = this.Logger = function Logger(filename) {
    this.filename = filename;
  };

  Logger.prototype.log = function(){
    var args = Array.prototype.slice.call(arguments);
    args.unshift(factory, this.filename);
    log.apply(this, args);
  };

  for (key in levels) {
    (function(level){
      Logger.prototype[level] = function() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(factory, this.filename, level);
        log.apply(this, args);
      };
    })(key.toLowerCase());
  }

};

Object.defineProperties(Factory.prototype, {
  /** The log threshold. Any log request specified at lower level will not be displayed. */
  threshold : {
    get: function() { return this._threshold; },
    set: function(level) { this._threshold = getLevel(this._levelsDict, level).n; }
  },
  /** 
   * The current error threshold level. Error threshold specifies a level that is considered as an error or worse. 
   * A log request with specified level equal to or more than the error level will be sent to STDERR 
   */
  errorThreshold : {
    get: function() { return this._errorThreshold; },
    set: function(level) { this._errorThreshold = getLevel(this._levelsDict, level).n; }
  }
});

/**
 * Create a logger. Specify a particular module to include the module path in the log information.
 * @param {Module|string} [module] - Built-in node module (i.e.: use `module`) or the name of a module
 */
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

Factory.prototype.createLogger = Factory.prototype.create;


function getLevel(levelsDict, level) {
  var levelType = levelsDict[typeof level];
  if (levelType) {
    if (typeof level === 'string') level = level.toLowerCase();
    var levelObj = levelType[level];
    if (levelObj == null) throw new Error('Invalid log level.');
    return levelObj;
  } else {
    throw new Error('Log level must be string or number.');
  }
}

function log(factory, filename, level, data) {
  var l = getLevel(factory._levelsDict, level);
  if (l.n >= factory._threshold) {
    var out = console.log;
    if (l.n >= factory._errorThreshold) out = console.error;
    var msg = '[' + (new Date()).toJSON() + '] [' + l.s.toUpperCase() + '] [' + filename + '] - ' + data;
    var args = Array.prototype.slice.call(arguments, 4);
    args.unshift(msg);
    out.apply(console, args);
    if (typeof data === 'object' && data != null) {
      console.log('object');
      if (data instanceof Error) out.call(console, data.stack);
      else out.call(console, data);
      out.call(console, '');
    }
  }
}


