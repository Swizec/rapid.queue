

exports.daemonize = true;

exports.workers = [
    {n: 2, queue: 'testing'},
]

exports.worker_mapping = {
    // make sure your worker accepts a callback as the last argument and calls it with result
    //'scraping': require('scraper').scrape
    'testing': function () {}
}

exports.listen_on = {port: 8124,
		     host: "127.0.0.1"}