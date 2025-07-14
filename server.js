const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const users = {}; // username -> socket.id

io.on('connection', (socket) => {
  let currentUsername = '';

  socket.on('join', (username) => {
    currentUsername = username;
    users[username] = socket.id;

    // Notify others
    socket.broadcast.emit('user-online', username);

    // Send current list to new user
    const onlineUsers = Object.keys(users).filter((user) => user !== username);
    socket.emit('user-list', onlineUsers);

    // Notify new user to others
    io.emit('user-list', Object.keys(users));
  });

  socket.on('private-message', ({ to, text, from }) => {
    const targetSocketId = users[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('private-message', { from, text });
    }
  });

  socket.on('disconnect', () => {
    for (const [username, id] of Object.entries(users)) {
      if (id === socket.id) {
        delete users[username];
        break;
      }
    }

    // Update all users with new list
    io.emit('user-list', Object.keys(users));
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
