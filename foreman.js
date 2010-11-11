var settings = require('./settings'),
    spawn = require('child_process').spawn,
    daemon = require('daemon'),
    fs = require('fs');

var start = function () {
    if (settings.daemonize) {
	daemon.start();
	daemon.lock(settings.lockFile);
    }

    var start_worker = function (queue) {
	var child = spawn('node', ['worker.js', queue], {cwd: settings.path});
	child.on("exit", function (code) {
	    start_worker(queue);
	});
    }

    for (var j = 0; j < settings.workers.length; j++ ) {
	var work_conf = settings.workers[j];
	for (var i = 0; i < work_conf.n; i++) {
	    console.log("starting worker "+i+" for "+work_conf.queue);

	    start_worker(work_conf.queue);
	}
    }
}

var status = function () {
    console.log("No status reporting yet, try ps aux | grep node");
}

var stop = function () {
    process.kill(parseInt(fs.readFileSync(settings.lockFile)));
    process.exit(0);
}

if (process.argv.length < 3) {
    console.log("Usage: node foreman.js start|stop|status|restart");
}else{
    var task = process.argv[2].toLowerCase();
    
    if (task == 'start') start()
    else if (task == 'status') status()
    else if (task == 'restart') restart()
    else stop();
}
