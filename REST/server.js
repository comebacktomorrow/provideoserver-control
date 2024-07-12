///REST/server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const ProVideoServerController = require("../ProVideoServerController");
const initializeWebSocket = require("./websocket");
const playlistRoutes = require("./routes/playlistRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const transportRoutes = require("./routes/transportRoutes");
const transportTimeRoutes = require("./routes/transportTimeRoutes");
const navigationRoutes = require("./routes/navigationRoutes");

const startWebServer = (controller) => {
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);

  // Make the controller globally available for routes
  app.set("controller", controller);

  app.use(express.json());
  app.use("/API/PVS/playlist", playlistRoutes);
  app.use("/API/PVS/timeline", timelineRoutes);
  app.use("/API/PVS/transport", transportRoutes);
  app.use("/API/PVS/timeline", navigationRoutes);
  app.use("/API/PVS/transport/times", transportTimeRoutes);

  initializeWebSocket(server, controller);

  const PORT = process.env.PORT || 5050;

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

module.exports = startWebServer;
