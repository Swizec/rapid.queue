
var worker = require('../worker.js'),
    boss = require('../boss.js');


exports.listen = function (test) {
    var task = {callback: 'http://example.com',
           	parameters: [],
        	queue: 'testing'}
    var do_work = function(fixture) {
	test.equal(fixture, task);

	test.done();
    };

    worker.listen('testing', do_work, function () {
	boss.push(task, 'testing');
    });
}