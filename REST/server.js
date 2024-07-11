const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const ProVideoServerController = require('../ProVideoServerController');
const initializeWebSocket = require('./websocket');
const playlistRoutes = require('./routes/playlistRoutes');
const timelineRoutes = require('./routes/timelineRoutes');
const transportRoutes = require('./routes/transportRoutes');
const transportTimeRoutes = require('./routes/transportTimeRoutes');
const navigationRoutes = require('./routes/navigationRoutes');

const PVS_IP_ADDRESS = '127.0.0.1'; // Replace with the actual IP address
const PVS_PORT = 3811; // Replace with the actual port
const PVS_CHANNEL_NUMBER = 1;
const PVS_CHANNEL_NAME = 'Vtr1';

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const controller = new ProVideoServerController(PVS_IP_ADDRESS, PVS_PORT, PVS_CHANNEL_NUMBER, PVS_CHANNEL_NAME);

// Make the controller globally available for routes
app.set('controller', controller);

app.use(express.json());
app.use('/API/PVS/playlist', playlistRoutes);
app.use('/API/PVS/timeline', timelineRoutes);
app.use('/API/PVS/transport', transportRoutes);
app.use('/API/PVS/timeline', navigationRoutes);
app.use('/API/PVS/transport/times', transportTimeRoutes);

initializeWebSocket(server, controller);

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});