logi
====

Logi is a simple logger for Node.js

First, create a logger factory that defines the common settings:

    // For an example, these are the default options that will be used if they are not specified:
    var options = {}
    // define the log levels
    options.levels = {trace: 100, debug:90, info:80, notice:70, warn:50, warning:50, error:30, critical:20, fatal:10};
    // output all levels
    options.threshold = 100;
    //output error, critical, and fatal to stderr
    options.errorThreshold = 30; 
    // make the logger print a shorter path relative to the main app
    options.showAbsolutePath = false;
    
    var logi = require('logi')(options);

To log to a file specify the path to the file as options.out. Any directory in the path must exist. By default any output will be sent to stdout. 
Directing the output to any other target is possible by specifying a writable stream.

    options.out = 'app.log';
    
Using the factory, a logger instance can be created for each module:

    var logger = logi.create(module);

    var firstName = 'John';
    logger.debug('firstName=%s', firstName);
    
This will output something like this to the stdout:

    [2014-02-07T04:35:23.534Z] [DEBUG] [example.js] - firstName=John
    
All logger instances created from the same factory shares the common settings of the log levels and threshold.