
var redis = require("redis").createClient(),
    notify = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    settings = require('./settings');

exports.push = function (task, queue) {
    redis.rpush("rapid.queue:"+queue, JSON.stringify(task));
    notify.publish("rapid.queue:"+queue+":pub", "task!");
}

exports.listen = function (port, host) {
    port = port || 8124, host = host || "127.0.0.1";
    
    http.createServer(function (req, res) {
	var queue = function () {
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
	}

	var list_tasks = function () {
	    var query = require('url').parse(req.url, true).query;
	    if (query) {
		var queue = query['queue'];
	    }

	    if (!queue) {
		res.writeHead(400, {'Content-Type': 'text; encoding=utf-8'});
		res.end("No queue");
	    }else{
		redis.llen(queue, function (err, len) {
		    redis.lrange(queue, 0, len, function (err, tasks) {
			res.writeHead(200);
			for (var i=0; i < len; i++) {
			    res.write(tasks[i]+"\n");
			}
			if (len == 0) {
			    res.write("No tasks in "+queue);
			}
			res.end();
		    });
		});
	    }
	}
	
	if (req.method == 'POST') {
	    queue();
	}else{
	    list_tasks();
	}

	
    }).listen(port, host);
}

if (process.argv[0] == 'node') {
    if (settings.daemonize) {
	daemon.start();
    }
    exports.listen(process.argv[2], process.argv[3])
}
