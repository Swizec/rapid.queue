
var redis = require("redis").createClient(),
    listener = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    settings = require('./settings'),
    request = require('request');

exports.listen = function (queue, worker, callback) {
    var BUSY = false;
    var inner_worker = function () {
	BUSY = true;

	redis.lpop("rapid.queue:"+queue, function (err, task) {
	    if (!err && task) {
		task = JSON.parse(task+"");
		worker(task, function (result) {
		    task.result = result;
		    request({uri: task.callback,
			     method: 'POST',
			     body: JSON.stringify(task)},
			    function (error, response, body) {
				inner_worker();
			    });
		});
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
	callback = callback || function () {};
	callback();
    });
}

if (process.argv[0] == 'node') {
    if (settings.daemonize) {
	daemon.start();
    }
    var queue = process.argv[2];
    exports.listen(queue, settings.worker_mapping[queue])
}