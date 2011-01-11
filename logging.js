
var redis = require('redis').createClient(),
    settings = require('./settings');

exports.log = function (level, payload) {
    if (settings.logging.log) {
	var now = new Date();
	var time = now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate()+' '+now.getHours()+':'+now.getMinutes()+':'+now.getSeconds()+'.'+now.getMilliseconds();

	redis.lpush("rapid.queue:logs", "["+time+"]::"+level+" "+payload);
	redis.ltrim("rapid.queue:logs", 0, settings.logging.max_length);
    }
}

exports.debug = function (payload) { exports.log('DEBUG', payload) }

exports.info = function (payload) { exports.log('INFO', payload) }

exports.warning = function (payload) { exports.log('WARNING', payload) }

exports.error = function (payload) { exports.log('ERROR', payload) }