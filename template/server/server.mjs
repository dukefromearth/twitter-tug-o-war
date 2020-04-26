import express from 'express';
import http from 'http';
import path from 'path';
import socketIO from 'socket.io';
import Game from './game.mjs';

const __dirname = path.resolve(path.dirname(''));
const environment = process.env.ENV || "prod";
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const port_num = 3000;
const game = new Game();

app.set('port', port_num);
app.use('/client', express.static('../client'));

// Routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, '../index.html'));
});

server.listen(port_num, function () {
    console.log(`Running as ${environment} environment`);
    console.log('Starting server on port', port_num);
});

io.on('connection', function (socket) {
    socket.on('new player', function () {
        console.log(socket.id);
    });
});

function runGame() {
    io.emit('state', game.getState());
}

setInterval(runGame, 1000 / 30);