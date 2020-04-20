// Dependencies.
/*jshint esversion: 6 *///
import express from 'express';
import http from 'http';
import path from 'path';
import socketIO from 'socket.io';

const __dirname = path.resolve(path.dirname(''));
const environment = process.env.ENV || "prod";
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const port_num = 3000;

app.set('port', port_num);
app.use('/', express.static('./'));

// Routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, '/index.html'));
});

server.listen(port_num, function () {
    console.log(`Running as ${environment} environment`);
    console.log('Starting server on port', port_num);
});

io.on('connection', function (socket) {
    socket.on('new player', function () {
        socket.emit('testing socket', 'test');
        console.log("new player");
    });
});

var x = "testing socket";
setInterval(function(){
    io.emit('testing socket', x);
})