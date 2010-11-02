
var redis = require("redis").createClient(),
    notify = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    settings = require('./settings');

exports.push = function (task, queue) {
    redis.rpush("rapid.queue:"+queue, JSON.stringify(task));
    redis.publish("rapid.queue:"+queue+":pub", "task!");
}

exports.listen = function (port, host) {
    port = port || 8124, host = host || "127.0.0.1";
    
    http.createServer(function (req, res) {
	if (req.method != 'POST') {
	    res.writeHead(400);
	    res.end();
	}

	var data = "";
	req.on("data", function (chunk) { data+=chunk });
	req.on("end", function () {
	    try {
		data = JSON.parse(data);
	    }catch (e) {
		res.writeHead(400);
		res.end("Bad Request");
		return;
	    }
	    
	    if (data.callback && data.queue && data.parameters) {
		exports.push(data, data.queue);

		res.writeHead(200, {'Content-Type': 'text'});
		res.end("queued");
	    }else{
		res.writeHead(400);
		res.end("Bad Request");
	    }
	});
    }).listen(port, host);
}

if (process.argv[0] == 'node') {
    if (settings.daemonize) {
	daemon.start();
    }
    exports.listen(process.argv[2], process.argv[3])
}

//if (settings.daemonize) {
//    daemon.start();
//}