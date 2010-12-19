
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

    var notify_client = function (task, callback) {
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
		
		callback(null, 'meow');
	    });
	}catch (e) {
	    logging.warning("Client callback unreachable "+task.id);
	    callback(null, 'meow');
	}
    };

    var recurse = function () {
	var inner_recurse = function () {
	    BUSY = false;
	    redis.llen("rapid.queue:"+queue, function (err, len) {
		if (len > 0) {
		    emitter.emit("inner-worker");
		}
	    });
	}
	
	if (redis.command_queue.length > 0) {
	    redis.once("idle", inner_recurse);
	}else{
	    inner_recurse();
	}
    };

    var inner_worker = function () {
	BUSY = true;

	var execute = function (tasks, callback) {
	    var callbacks = 0;
	    try {
		worker(tasks, function (result) {
		    callbacks++;
		    emitter.emit('notify-client', result, function () {
			if (callbacks >= tasks.length) {
			    callback();
			}
		    });
		});
	    }catch (e) {
		for (var i=0; i < tasks.length; i++) {
		    tasks[i].result = "ERROR: failing worker";
		    emitter.emit('notify-client', tasks[i], function () {
			if (callbacks >= tasks.length) {
			    callback();
			}
		    });
		}
	    }
	}

	async.mapSeries([1],
		  function (bla, callback) {
		      redis.lpop("rapid.queue:"+queue, function (err, task) {
			  if (task) {
			      task = JSON.parse(task+"");
			      
			      logging.info("Started task "+task.id);
			  
			      callback(null, task);
			  }else{
			      callback(null, null);
			  }
		      });
		  },
		  function (err, tasks) {
		      if (!err) {
			  var tmp = [], i=0;
			  for (; i < tasks.length; i++) {
			      if (tasks[i]) tmp[i] = tasks[i];
			  }
			  if (tmp.length > 0) {
			      execute(tmp, function () {
				  recurse();
			      })
			  }else {
			      recurse();
			  }
		      }
		  });
    }

    emitter.addListener('inner-worker', inner_worker);
    emitter.addListener('notify-client', notify_client);

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