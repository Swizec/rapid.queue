var settings = require('./settings'),
    spawn = require('child_process').spawn,
    daemon = require('daemon'),
    fs = require('fs');

var start = function () {
    if (settings.daemonize) {
	daemon.start();
	daemon.lock(settings.lockFile);
    }

    var start_boss = function (port, host) {
	var child = spawn('node', ['boss.js', port, host], {cwd: settings.path});
	child.on("exit", function (code) {
	    start_worker(queue);
	});
    }

    for (var j = 0; j < settings.listen_on.length; j++ ) {
	var boss_conf = settings.listen_on[j];
	for (var i = 0; i < boss_conf.n; i++) {
	    console.log("starting boss "+i+" at "+boss_conf.host+":"+boss_conf.port);

	    start_boss(boss_conf.port, boss_conf.host);
	}
    }
}

var status = function () {
    console.log("No status reporting yet, try ps aux | grep node");
}

var stop = function () {
    process.kill(parseInt(fs.readFileSync(settings.lockFile)));
}

var restart = function () {
    stop();
    start();
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
