#!/usr/bin/env node

/**
* Module dependencies.
*/

var app = require('../app');
var debug = require('debug')('semka1:server');
var http = require('http');

/**
* Get port from environment and store in Express.
*/

<<<<<<< HEAD
var port = normalizePort(process.env.PORT || '8000');
=======
var port = normalizePort(process.env.PORT || '2323');
>>>>>>> fceb21c4ae363268b1f34bce91f2f2c21cd14811
app.set('port', port);

/**
* Create HTTP server.
*/

var server = http.createServer(app);

/**
* Listen on provided port, on all network interfaces.
*/

//server.listen(port);
server.listen(port, "185.209.30.90" || "semka-2000.ru");
server.on('error', onError);
server.on('listening', onListening);

/**
* Normalize a port into a number, string, or false.
*/

function normalizePort(val) {
var port = parseInt(val, 10);

if (isNaN(port)) {
// named pipe
return val;
}

if (port >= 0) {
// port number
return port;
}

return false;
}

/**
* Event listener for HTTP server "error" event.
*/

function onError(error) {
if (error.syscall !== 'listen') {
throw error;
}

var bind = typeof port === 'string'
? 'Pipe ' + port
: 'Port ' + port;

// handle specific listen errors with friendly messages
switch (error.code) {
case 'EACCES':
console.error(bind + ' requires elevated privileges');
process.exit(1);
break;
case 'EADDRINUSE':
console.error(bind + ' is already in use');
process.exit(1);
break;
default:
throw error;
}
}

/**
* Event listener for HTTP server "listening" event.
*/

function onListening() {
var addr = server.address();
var bind = typeof addr === 'string'
? 'pipe ' + addr
: 'port ' + addr.port;
debug('Listening on ' + bind);
}