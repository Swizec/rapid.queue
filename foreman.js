var settings = require('./settings'),
    spawn = require('child_process').spawn,
    daemon = require('daemon'),
    fs = require('fs');

var start = function () {
    if (settings.daemonize) {
	daemon.start();
	daemon.lock(settings.lockFile);
    }

    var children = [];

    for (var j = 0; j < settings.workers.length; j++ ) {
	var work_conf = settings.workers[j];
	for (var i = 0; i < work_conf.n; i++) {
	    console.log("starting worker "+i+" for "+work_conf.queue);

	    //var child = spawn('node ', ['/home/swizec/Documents/preona-code/Plateboiler/rapid.queue/worker.js', work_conf.queue]);
	    	var child = spawn('node', ['worker.js'], {cwd: settings.path});
		child.on("exit", function (code) { console.log("worker exited with "+code)});
	}
    }
}

var status = function () {
}

var stop = function () {
    process.kill(parseInt(fs.readFileSync(config.lockFile)));
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
