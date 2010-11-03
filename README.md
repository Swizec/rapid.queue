
# WHAT

The general idea of rapid.queue is helping people write async API's.

The way it works is:
- listen for incoming http connections
- get tasks from http
- push tasks to queue
- multiple workers pull from queue
- once a worker is done, post result over http back to client


# USAGE

The settings.js file contains some basic configuration options.

Run a redis server with default configuration.
Run runner.js and you're set.

To get a list of tasks in a certain queue just access boss.js from
your browser with a queue argument, something like so:
    http://127.0.0.1:8124/?queue=testing

## API

To add a task to the server send a POST request to your configured listener address
with the following JSON data in the body:

    {callback: '<where to post result>',
     queue: '<name of queue>',
     parameters: <add any other parameters>}

The task will be passed to your chosen worker function.

When processing the task is complete the same task with an added result parameter:

    {callback: '<where to post result>',
     queue: '<name of queue>',
     parameters: <your parameters>,
     result: <output of your worker>}



# DEPENDANCIES
 * http://github.com/mranney/node_redis
 * http://github.com/Slashed/daemon.node
 * http://github.com/caolan/async
 * http://bitbucket.org/mazzarelli/js-opts/wiki/Home
 * http://github.com/mikeal/node-utils/tree/master/request/
 * http://github.com/weaver/node-mail (if you want error notifications)