
var redis = require("redis").createClient(),
    notify = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    logging = require('./logging'),
    settings = require('./settings');

exports.push = function (task, queue) {
    task.id = (new Date()).getTime();

    redis.rpush("rapid.queue:"+queue, JSON.stringify(task), function () {
	if (Math.floor(Math.random()*101) < 20) {
	    notify.publish("rapid.queue:"+queue+":pub", "task!");
	}
    });
    logging.info("Task "+task.id+" received: \n"+JSON.stringify(task));
}

exports.listen = function (port, host, callback) {
    port = port || 8124, host = host || "127.0.0.1";
    callback = callback || function () {};
    
    http.createServer(function (req, res) {
	if (req.method == 'POST') {
	    handlers.queue(req, res);
	}else{
	    res.writeHead(400);
	    res.end("Bad request, boss only accepts POST requests");
	}

	
    }).listen(port, host, callback);
}

var handlers = {
    queue: function (req, res) {
	var data = "";
	req.on("data", function (chunk) { data+=chunk });
	req.on("end", function () {
	    try {
		data = JSON.parse(data);
	    }catch (e) {
		res.writeHead(400);
		res.end("Bad Request, JSON not deserializable");
		return;
	    }
	    
	    if (data.callback && data.queue && data.parameters) {
		exports.push(data, data.queue);
		
		res.writeHead(200, {'Content-Type': 'text'});
		res.end("queued");
	    }else{
		res.writeHead(400);
		res.end("Bad Request, some parameters missing in JSON");
	    }
	})}
}

if (process.argv[0] == 'node') {
    if (settings.daemonize) {
	daemon.start();
    }
    exports.listen(process.argv[2], process.argv[3])
}
