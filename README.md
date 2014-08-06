logi
====

Logi is a simple logger for Node.js

First, create a logger factory that defines the common settings:

    // For an example, these are the default options that will be used if they are not specified:
    var options = {}
    // define the log levels
    options.levels = {debug:10, info:20, notice:30, warn:50, warning:50, error:70, critical:80, fatal:100}; 
    // output all levels
    options.threshold = 0;
    //output error, critical, and fatal to stderr
    options.errorThreshold = 70; 
    // make the logger print a shorter path relative to the main app
    options.useRelativePath = true;
    
    var loggerFactory = require('logi')(options);

Using the factory, a logger instance can be created for each module:

    var logger = loggerFactory.create(module);

    var firstName = 'John';
    logger.debug('firstName=%s', firstName);
    
This will output something like this to the stdout:

    [2014-02-07T04:35:23.534Z] [DEBUG] [example.js] - firstName=John
    
All logger instances created from the same factory shares the common settings of the log levels and threshold.

