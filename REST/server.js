///REST/server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const logger = require('../logger');
const initializeWebSocket = require("./websocket");
const path = require('path');
const playlistRoutes = require("./routes/playlistRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const transportRoutes = require("./routes/transportRoutes");
const transportTimeRoutes = require("./routes/transportTimeRoutes");
const navigationRoutes = require("./routes/navigationRoutes");

const startWebServer = (controller, port) => {
    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
      cors: {
        origin: '*', // Allow connections from any origin
        methods: ["GET", "POST"]
      }
    });

  // Make the controller globally available for routes
  app.set("controller", controller);

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, '../public')));

  app.use(express.json());
  app.use("/API/PVS/playlist", playlistRoutes);
  app.use("/API/PVS/timeline", timelineRoutes);
  app.use("/API/PVS/transport", transportRoutes);
  app.use("/API/PVS/timeline", navigationRoutes);
  app.use("/API/PVS/transport/times", transportTimeRoutes);

  initializeWebSocket(server, controller);

  const PORT = process.env.PORT || port;

  server.listen(PORT, () => {
    logger.info(`Web server is running on port ${port}.`);
    logger.info(`Pages are http://localhost:${port}/, http://localhost:${port}/producer/producer and http://localhost:${port}/producer/stage`);
  });
};

module.exports = startWebServer;
