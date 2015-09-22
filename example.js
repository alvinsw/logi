var loggerFactory1 = require('logi')();

var loggerFactory2 = require('logi')({threshold:true});

var logger1 = loggerFactory1.create(module);
var logger2 = loggerFactory2.create(module);

console.log('logger1');
logger1.debug('test123');
logger1.info('test123');
logger1.error('test123');
logger1.debug('hello %s', 'world');

console.log('logger2');
logger2.debug('test123');
