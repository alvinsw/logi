/**
 * File Appender, supporting rolling of log files
 * appenders only need to implement one method: write(String|Buffer)
 */
"use strict";

var fs = require('fs');
var WritableStream = require('stream').Writable;
var util = require('util');
var path = require('path');
var dateutil = require('./dateutil.js');

//var DEF_SIZE = 1024*1024;
var DEF_COUNT = 1;
var instances = {};

module.exports = function(opts_) {
  var opts = {};
  if (typeof opts_ === 'string') {
    opts.path = opts_;
  } else if (typeof opts_ === 'object') {
    opts = opts_;
  }
  if (!opts.path) throw new Error('File appender requires a path to the log file.');
  var instance = instances[opts.path];
  if (!instance) instance = instances[opts.path] = new FileAppender(opts);
  return instance;
};

/**
 * Create a file appender.
 * File Appender writing the logs to a text file. Supports rolling of logs by size.
 *
 * @param path - path to the file log messages will be written to
 * @param pattern - date pattern to be addedd as the suffix to the log file,
 * @param count - the maximum number of old log files to kept, if unset, no rotation is made.
 * @param size=1MB - the maximum size (in bytes) for a log file,
 *   Set to 0 to allow unlimited log size and disable rotation.
 * @param [compress = false] - flag that controls log file compression
 * @param timezoneOffset - optional timezone offset in minutes (default system local)
 */
 function FileAppender(options) {
   if (!(this instanceof FileAppender)) {
     return new FileAppender(options);
   }

   WritableStream.call(this, options);

   var self = this;
   this._errorCallback = function(err){
     if (err) self.emit('error', err);
   };
   self.on('error', function (err) {
     /*eslint no-console:0*/
     console.error('[logi][FileAppender] %s', err.stack);
   });
   this.path = options.path;
   this.initFileStream();

   if (typeof options.size === 'number' && options.size > 0) {
     this.maxSize = options.size;
     this.mustRotate = SizeBasedTriggerPolicy;
     this.append = PolicyBasedAppend;
     if (typeof options.count !== 'number' || options.count <= 0) options.count = DEF_COUNT;
   }
   this.count = 1;
   if (typeof options.count === 'number' && options.count > 0) {
     this.count = options.count;
     this.rotatePolicy = CountBasedRotatePolicy;
   }
   this.pattern = options.pattern || '.yyyyMMdd.hhmmss.ms';
   if (this.maxSize && this.count) this.trimBackups();
}
util.inherits(FileAppender, WritableStream);

FileAppender.prototype.initFileStream = function() {
  this._writeStream = fs.createWriteStream(this.path, { flags: 'a', defaultEncoding: 'utf8' });
  this._writeStream.on("error", this._errorCallback);
  this.currentSize = -1;
}

FileAppender.prototype._write = function(data, encoding, callback) {
//  if (!(data instanceof Buffer)) {
//    return this.emit('error', new Error('Invalid data'));
//  }
  this.append(data, encoding, callback);
};

FileAppender.prototype.append = function(data, encoding, callback){
  this._writeStream.write(data, encoding, callback);
};

FileAppender.prototype.rotate = function(cb) {
  var fa = this;
  fa._writeStream.end(function() {
    var backupPath = getBackupPath(fa.path, fa.lastRotateTime);
    fs.rename(fa.path, backupPath, function(){
      fa.initFileStream();
      fa.trimBackups();
      cb();
    });
  });
  fa._writeStream = null;
};

FileAppender.prototype.trimBackups = function() {
  var fa = this;
  var filepath = fa.path;
  var prefix = path.basename(filepath);
  var dirpath = path.dirname(filepath);
  fs.readdir(dirpath, function(err, files){
    if (err) return fa.emit('error', err);

    var backups = []
    files.forEach(function(name){
      if (name !== prefix && name.startsWith(prefix)) {
        var d = dateutil.parse(name, fa.pattern);
        if (d) backups.push([d, path.join(dirpath, name)]);
      }
    });
    backups.sort(handleSortDatePath);
    fa.rotatePolicy(backups);
  });
}

FileAppender.prototype.rotatePolicy = function() {
  // do nothing
};

function handleSortDatePath(a, b) {
  if (a[0] > b[0]) return 1;
  else if (a[0] < b[0]) return -1;
  else return 0;
}

var PolicyBasedAppend = function(data, encoding, callback){
  var fa = this;
  function writeToFile() {
    fa._writeStream.write(data, encoding, callback);
    fa.currentSize += data.length;
  }

  fa.mustRotate(function(mustRotate) {
    if (!mustRotate) {
      writeToFile();
    } else {
      //roll over log
      fa.rotate(writeToFile);
    }
  });
};

var SizeBasedTriggerPolicy = function(cb) {
  var fa = this;
  if (fa.currentSize >= 0) {
    return cb(fa.currentSize >= fa.maxSize);
  } else {
    fs.stat(fa.path, function(err, stats) {
      if (!err && stats) fa.currentSize = stats.size;
      else fa.currentSize = 0;
      return cb(fa.currentSize >= fa.maxSize);
    });
  }
};

var CountBasedRotatePolicy = function(backups){
  var fa = this;
  var count = fa.count;
  while (backups.length > count) {
    fs.unlink((backups.shift())[1], fa._errorCallback);
  }
  var lastBackup = backups.pop();
  if (lastBackup) fa.lastRotateTime = lastBackup[0];
};

function getBackupPath(oldPath, lastTime) {
  var d = new Date();
  var newPath = oldPath + '.' + dateutil.formatDate(d);
  if (lastTime && d.getUTCDate() === lastTime.getUTCDate() && d.getUTCMonth() === lastTime.getUTCMonth() && d.getUTCFullYear() === lastTime.getUTCFullYear()) {
    newPath = newPath + '_' + dateutil.formatTime(d);
    if (d.getUTCHours() === lastTime.getUTCHours() && d.getUTCMinutes() === lastTime.getUTCMinutes() && d.getUTCSeconds() === lastTime.getUTCSeconds()) {
      newPath = newPath + '_' + dateutil.formatMis(d);
    }
  }
  return newPath;
}

/*
function escapePattern(str) {
  return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
}

process.on('exit', function() {
  for (var key in fileStreams) {
    fileStreams[key].end();
  }
});
*/
