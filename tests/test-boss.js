
var boss = require('../boss.js'),
    redis = require('redis').createClient(),
    listener = require('redis').createClient(),
    http = require('http'),
    async = require('async');


exports.push = function (test) {
    var test_task = {'test': 'test-task'};
    var messaged = false;

    listener.on("message", function (channel, message) {
	test.equal(message, "task!", "wrong message");
	messaged = true;
    });
    listener.subscribe("rapid.queue:testing:pub");

    listener.on("subscribe", function (channel) {
	redis.llen("rapid.queue:testing", function (err, old_len) {
	    boss.push(test_task, "testing");
	    
	    redis.llen("rapid.queue:testing", function (err, new_len) {
		test.equal(new_len-old_len, 1, "didn't push");
	    });
    
	    redis.lpop("rapid.queue:testing", function (err, res) {
		test.equal(res+"", test_task, "wrong task");
		test.equal(messaged, true, "no message");
		
		test.done();
	    });
	});
    });
}

exports.listen = function (test) {
    boss.listen(8124, "127.0.0.1");

    var request = http.createClient(8124, "127.0.0.1").request('POST', '/');
    request.write(JSON.stringify({parameters: "http://github.com/caolan/async",
				  callback: 'http://127.0.0.1:8126',
				  queue: 'testing'}));
    request.end();
    request.on("response", function (response) {
	response.on("data", function (chunk) {
	    test.equal(chunk+"", "queued");
	    
	    test.done();
	});
    });
}

exports.listen_fail = function (test) {
    boss.listen(8125, "127.0.0.1");

    var request = http.createClient(8125, "127.0.0.1").request('GET', '/');
    request.end();
    request.on("response", function (response) {
	test.equal(response.statusCode, 400, "expected error");

    });

    var bad_data = function (data, callback) {
	var request = http.createClient(8125, "127.0.0.1").request('POST', '/');
	request.write(data);
	request.end();
	request.on("response", function (response) {
	    test.equal(response.statusCode, 400, "expected error");

	    callback();
	});
    }

    var count = 0;
    async.map(["baldla", JSON.stringify({}),
	       JSON.stringify({parameters: []}),
	       JSON.stringify({queue: 'testing'}),
	       JSON.stringify({queue: 'testing', parameters: []}),
	       JSON.stringify({callback: 'http://example.com'}),
	       JSON.stringify({callback: 'http://example.com', parameters: []}),
	       JSON.stringify({callback: 'http://example.com', queue: 'testing'})],
	      bad_data, 
	      function () { test.done() });
}