// Dependencies.
/*jshint esversion: 6 *///
import express from 'express';
import http from 'http';
import path from 'path';
import socketIO from 'socket.io';
import Game from './game.mjs'

const __dirname = path.resolve(path.dirname(''));
const environment = process.env.ENV || "prod";
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const port_num = 3000;
const game = new Game();

app.set('port', port_num);
app.use('/public', express.static('../public'));

// Routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, '../index.html'));
});

server.listen(port_num, function () {
    console.log(`Running as ${environment} environment`);
    console.log('Starting server on port', port_num);
});

io.on('connection', function (socket) {
    socket.on('disconnect', function(){
        game.removePlayer(socket.id);
        io.emit('remove player', socket.id);
    });
    socket.on('new player', function () {
        game.newPlayer(socket.id);
        io.emit('new player', game.players[socket.id].getState())
    });
    socket.on('state', function (robot) {
        game.updatePlayerPos(robot);
    })
});

function playGame() {
    game.play();
    io.emit('state', game.getState());
}

setInterval(playGame, 1000 / 120);