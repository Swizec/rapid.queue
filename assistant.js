
var redis = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    logging = require('./logging'),
    settings = require('./settings');

var handlers = {

    list_tasks: function (req, res, query) {
	var queue = query['queue'];

	if (!queue) {
	    res.writeHead(400, {'Content-Type': 'text; encoding=utf-8'});
	    res.end("No queue");
	}else{
	    queue = 'rapid.queue:'+queue;
	    redis.llen(queue, function (err, len) {
		if (len > 2000) len = 2000;

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
	    if (len > 2000) len = 2000;

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

exports.listen = function (port, host) {
    port = port || 8125, host = host || "127.0.0.1";

    http.createServer(function (req, res) {
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
    }).listen(port, host);
}

if (process.argv[0] == 'node') {
    if (settings.daemonize) {
	daemon.start();
    }
    exports.listen(process.argv[2], process.argv[3])
}
