
var redis = require("redis").createClient(),
    listener = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    settings = require('./settings'),
    logging = require('./logging'),
    request = require('request'),
    urllib = require('url');

exports.listen = function (queue, worker, callback) {
    var BUSY = false;

    var inner_worker = function () {
	BUSY = true;

	var recurse = function () {
	    var inner_recurse = function () {
		BUSY = false;
		process.nextTick(inner_worker);
	    }
	    
	    if (redis.command_queue.length > 0) {
		redis.once("idle", inner_recurse);
	    }else{
		inner_recurse();
	    }
	};

	redis.lpop("rapid.queue:"+queue, function (err, task) {
	    if (!err && task) {
		task = JSON.parse(task+"");

		logging.info("Started task "+task.id);

		var notify_client = function (result) {
		    task.result = result;
		    try {
			var url = urllib.parse(task.callback);
			//var body = JSON.stringify(task);

			var client = http.createClient(url.port || 80, url.hostname);
			var request = client.request('POST', 
						     url.pathname || '/',
						     {'host': url.hostname});
			request.write(JSON.stringify(task));
			request.end();
			request.on("response", function (response) {
			    if (response.statusCode != 200) {
				logging.warning("Client responded with error "+task.id);
			    }else{
				logging.info("Served task "+task.id);
			    }
			    recurse();
			});
		    }catch (e) {
			logging.warning("Client callback unreachable "+task.id);
			recurse();
		    }
		};

		try {
		    worker(task, notify_client);
		}catch (e) {
		    if (settings.notify_errors) {
			var mail = require('mail').Mail(settings.mail.smtp);
			mail.message(settings.mail.message)
			    .body("Task: "+JSON.stringify(task)+"\n\n\n"+e.message+"\n\n"+e.stack)
			    .send(function(err) {});
		    }

		    logging.warning("Error serving task "+task.id);
		    notify_client("ERROR: Big fail\n\nMessage: "+e.message+"\nStack: "+e.stack);
		}
	    }else{
		setTimeout(recurse, 500);
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

var queue = process.argv[2];
exports.listen(queue, settings.worker_mapping[queue], function () {
    var poke = require("redis").createClient();
    poke.publish("rapid.queue:"+queue+":pub", "task!");
});