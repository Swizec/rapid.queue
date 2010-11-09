
var redis = require("redis").createClient(),
    notify = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    logging = require('./logging'),
    settings = require('./settings');

exports.push = function (task, queue) {
    task.id = (new Date()).getTime();

    redis.rpush("rapid.queue:"+queue, JSON.stringify(task));
    notify.publish("rapid.queue:"+queue+":pub", "task!");

    logging.info("Task "+task.id+" received: \n"+JSON.stringify(task));
}

exports.listen = function (port, host) {
    port = port || 8124, host = host || "127.0.0.1";
    
    http.createServer(function (req, res) {
	if (req.method == 'POST') {
	    handlers.queue(req, res);
	}else{
	    var query = require('url').parse(req.url, true).query;
	    var list = query && query['list'];
	    if (!query || !list){
		res.writeHead(400, {'Content-Type': 'text; encoding=utf-8'});
		res.end("No query");
		return;
	    }
	    
	    if (list == 'tasks') handlers.list_tasks(req, res, query)
	    else if (list == 'logs') handlers.list_logs(req, res, query)
	    else {
		res.writeHead(400);
		res.end("Unknown list");
	    }
	}

	
    }).listen(port, host);
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
	})},

    list_tasks: function (req, res, query) {
	var queue = query['queue'];

	if (!queue) {
	    res.writeHead(400, {'Content-Type': 'text; encoding=utf-8'});
	    res.end("No queue");
	}else{
	    queue = 'rapid.queue:'+queue;
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
    },

    list_logs: function (req, res) {
	redis.llen("rapid.queue:logs", function (err, len) {
	    redis.lrange("rapid.queue:logs", 0, len, function (err, entries) {
		res.writeHead(200);
		for (var i=0; i < len; i++) {
		    res.write(entries[i]+"\n\n");
		}
		res.end();
	    });
	});
    }
}

if (process.argv[0] == 'node') {
    if (settings.daemonize) {
	daemon.start();
    }
    exports.listen(process.argv[2], process.argv[3])
}
