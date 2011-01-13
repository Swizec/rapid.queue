

exports.daemonize = true;

exports.lockfile = '/tmp/rapid.queue.foreman.lock';

exports.path = '/home/swizec/Documents/preona-code/Plateboiler/rapid.queue';

exports.workers = [
    {n: 5, queue: 'scraping'}
]

exports.worker_mapping = {
    // make sure your worker accepts a callback as the last argument and calls it with result
    //'scraping': require('scraper').scrape
    'testing': function () {},
    'scraping': require('../plateboiler').scrape
}

exports.listen_on = [{port: 8124,
		      host: "127.0.0.1"}]

exports.notify_errors = true;

exports.mail = { 
    smtp : {
	host: 'smtp.gmail.com',
	port: 465,
	username: '',
	password: ''
    },
    message : {
	from: '',
	to: [''],
	subject: 'rapid.queue worker error'
    }
}

exports.logging = {log: true,
		   max_length: 5000}

// how long to wait before polling when no tasks are fetched
exports.poll_wait = 5000;