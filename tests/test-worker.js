
var worker = require('../worker.js'),
    boss = require('../boss.js'),
    http = require('http');


exports.listen = function (test) {
    var task = {callback: 'http://example.com',
                parameters: 'bla',
        	queue: 'testing5'}
    var do_work = function(fixture, callback) {
	for (var k in fixture) {
	    test.equal(fixture[k], task[k]);
	}

	test.done();
    };

    worker.listen('testing5', do_work, function () {
	boss.push(task, 'testing5');
    });
}

exports.callback = function (test) {
    var task = {callback: 'http://127.0.0.1:8127',
         	parameters: [],
 	        queue: 'testing4'};

    var server = http.createServer(function (req, res) {
	var data = "";
	req.on("data", function (chunk) { data+=chunk });
	req.on("end", function () {
	    data = JSON.parse(data);
	    test.equal(data.result, 'called back');

	    test.done();
	});
    }).listen(8127, '127.0.0.1');

    var do_work = function(task, callback) {
	callback("called back");
    };

    worker.listen('testing4', do_work, function () {
	boss.push(task, 'testing4');
    });
}