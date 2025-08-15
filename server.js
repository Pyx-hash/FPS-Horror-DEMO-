const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..')));
let players = {};

io.on('connection', (socket) => {
    console.log('connect', socket.id);
    players[socket.id] = {
        pos: [0, 1.6, 0],
        rotY: 0,
        health: 100
    };
    socket.broadcast.emit('playerJoined', socket.id);
    socket.on('join', (payload) => {
        socket.on('update', (data) => {
            players[socket.id] = {
                pos: data.pos,
                rotY: data.rotY,
                health: data.health
            };
        });
        socket.on('shoot', (payload)=> {
            socket.broadcast.emit('shoot', {
                id: socket.id,
                pos: payload.pos,
                dir: payload.dir
            });
        });
        socket.on('disconnect', () => {
            delete players[socket.id];
            socket.broadcast.emit('playerLeft', socket.id);
        });
    });
    setInterval(() => {
        io.emit('state', { players });
    }, 100);

    server.listen(PORT, () => console.log('Server running on', PORT));
});