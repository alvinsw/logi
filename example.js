/*eslint no-console:0*/
"use strict";
// require index.js because this example file is part of logi
// Use this line instead for normal usage:
// var logi = require('logi');
var logi = require('./index.js');

// Use default settings, logs everything to std streams
var logi1 = logi();

// logs only debug with warning or above levels.
// outputs error and above levels to stderror
// outputs other levels to file
//var logi2 = logi();
var logi2 = logi({threshold:'warning', out:'example2.log'});

// logs to file and roll over.
// outputs error and above levels to stderror
var logi3 = logi({
  formatOptions : { omitTimestamp: true },
  out : {
    file : { path : 'example3.log', size : 100, compress : true }
  }
});

var logger1 = logi1.create(module);
var logger2 = logi2.create(module);
var logger3 = logi3.create(module);

console.log('logger1');
logger1.trace('trace %d', 1);
logger1.debug('debug %d', 1);
logger1.info('info %d', 1);
logger1.warn('warn %d', 1);
logger1.error('error %d', 1);
logger1.fatal('hello %s', 'world');

console.log('logger2');
logger2.trace('trace %d', 2);
logger2.debug('debug %d', 2);
logger2.info('info %d', 2);
logger2.warn('warn %d', 2);
logger2.error('error %d', 2);
logger2.fatal('hello %s', 'world');

console.log('logger3');
logger3.debug('debug %d', 3);
logger3.info('info %d', 3);
logger3.notice('notice %d', 3);
logger3.warn('warn %d', 3);
logger3.error('error %d', 3);
logger3.fatal('hello %s', 'world');
