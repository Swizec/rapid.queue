var settings = require('./settings'),
    spawn = require('child_process').spawn;

console.log("spawning boss at "+settings.listen_on.host+":"+settings.listen_on.port);
spawn('node', ['./boss.js', settings.listen_on.port, settings.listen_on.host]);

for (var j = 0; j < settings.workers.length; j++ ) {
    var work_conf = settings.workers[j];
    for (var i = 0; i < work_conf.n; i++) {
	console.log("starting worker "+i+" for "+work_conf.queue);
	spawn('node', ['./worker.js', work_conf.queue]);
    }
}