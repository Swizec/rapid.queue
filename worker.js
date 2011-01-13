
var redis = require("redis").createClient(),
    listener = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    settings = require('./settings'),
    logging = require('./logging'),
    request = require('request'),
    urllib = require('url'),
    EventEmitter = require('events').EventEmitter,
    async = require('async');

exports.listen = function (queue, worker, callback) {
    var BUSY = false;
    var emitter = new EventEmitter();

    var notify_client = function (task) {
	try {
	    var url = urllib.parse(task.callback);
	    var body = JSON.stringify(task);
	    
	    var client = http.createClient(url.port || 80, url.hostname);
	    var request = client.request('POST', 
		url.pathname || '/',
		{'host': url.hostname,
		'Content-Length': body.length});
	    request.write(body);
	    request.end();
	    request.on("response", function (response) {
		if (response.statusCode != 200) {
		    logging.warning("Client responded with error "+task.id);
		}else{
		    logging.info("Served task "+task.id);
		}
	    });
	}catch (e) {
	    logging.warning("Client callback unreachable "+task.id);
	}
    };

    var recurse = function () {
	var inner_recurse = function () {
	    BUSY = false;
	    emitter.emit("inner-worker");
	}
	
	if (redis.command_queue.length > 0) {
	    redis.once("idle", inner_recurse);
	}else{
	    inner_recurse();
	}
    };

    var execute = function (task, callback) {
	try {
	    worker(task, function (result) {
		emitter.emit('notify-client', result);
		callback();
	    })
	}catch (e) {
	    task.result = "ERROR: faling worker";
	    emitter.emit('notify-client', task);
	    callback();
	}
    }

    var index = 0;

    var inner_worker = function () {
	BUSY = true;

	redis.lpop("rapid.queue:"+queue, function (err, task) {
	    if (!err && task) {
		task = JSON.parse(task+"");

		task.index = index++;
			      
		logging.info("Started task "+task.id);
		
		execute(task, function () {
		    emitter.emit('recurse');
		});
	    }else{
		BUSY = false;
		setTimeout(function () {
		    emitter.emit('recurse');
		}, settings.poll_wait);
	    }
	});
    }

    emitter.addListener('inner-worker', inner_worker);
    emitter.addListener('notify-client', notify_client);
    emitter.addListener('recurse', recurse);
	

    listener.subscribe("rapid.queue:"+queue+":pub");
    listener.on("message", function (channel, message) {
	if (message == 'task!' && !BUSY) {
	    emitter.emit('inner-worker');
	}
    });
    listener.on("subscribe", function (channel) {
	callback = callback || function () {};
	callback();
    });
}

var queue = process.argv[2];
exports.listen(queue, settings.worker_mapping[queue], function () {
    var poke = require("redis").createClient();
    poke.publish("rapid.queue:"+queue+":pub", "task!");
});