
var redis = require("redis").createClient(),
    listener = require("redis").createClient(),
    http = require("http");

var BUSY = false;

exports.listen = function (queue, worker, callback) {
    var inner_worker = function () {
	BUSY = true;

	redis.lpop("rapid.queue:"+queue, function (err, task) {
	    if (!err && task) {
		worker(task+"", inner_worker);
	    }else{
		BUSY = false;
	    }
	});
    }

    listener.subscribe("rapid.queue:"+queue+":pub");
    listener.on("message", function (channel, message) {
	if (message == 'task!' && !BUSY) {
	    inner_worker();
	}
    });
    listener.on("subscribe", function (channel) {
	callback();
    });
}