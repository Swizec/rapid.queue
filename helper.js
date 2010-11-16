
var redis = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    logging = require('./logging'),
    settings = require('./settings');