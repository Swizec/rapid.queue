
var redis = require("redis").createClient(),
    listener = require("redis").createClient(),
    http = require("http"),
    daemon = require('daemon'),
    settings = require('./settings'),
    logging = require('./logging'),
    request = require('request'),
    urllib = require('url'),
    async = require('async');

exports.listen = function (queue, worker, callback) {
    var BUSY = false;

    var inner_worker = function () {
	BUSY = true;

	var recurse = function () {
	    var inner_recurse = function () {
		BUSY = false;
		redis.llen("rapid.queue:"+queue, function (err, len) {
		    if (len > 0) {
			process.nextTick(inner_worker);
		    }
		});
	    }
	    
	    if (redis.command_queue.length > 0) {
		redis.once("idle", inner_recurse);
	    }else{
		inner_recurse();
	    }
	};

	var execute = function (tasks, callback) {
	    var notify_client = function (task, callback) {
		console.log("notifying");
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

	    var callbacks = 0;
	    worker(tasks, function (result) {
		callbacks++;
		notify_client(result, function () {
		    if (callbacks >= tasks.length) {
			console.log("going for more");
			callback();
		    }
		});
	    });
	}

	async.mapSeries([1,2,3,4,5],
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
			  console.log(tmp);
			  console.log('\n');
		      }
		  });
    }

    listener.subscribe("rapid.queue:"+queue+":pub");
    listener.on("message", function (channel, message) {
	console.log("message!");
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