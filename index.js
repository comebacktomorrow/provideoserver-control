//index.js
const ProVideoServerController = require('./ProVideoServerController');
const startInteractiveConsole = require('./Interactive/interactive');
const startWebServer = require('./REST/server');
const { updateAllTimers } = require('./ProPresenter/ProPresenterTimers');

const PVS_IP_ADDRESS = '127.0.0.1'; // Replace with the actual IP address
const PVS_PORT = 3811; // Replace with the actual port
const PVS_CHANNEL_NUMBER = 1;
const PVS_CHANNEL_NAME = 'Vtr1';

const PRO_PRESENTER_IP = 'localhost'; // Replace with the actual IP address
const PRO_PRESENTER_PORT = 50050; // Replace with the actual port

const controller = new ProVideoServerController(PVS_IP_ADDRESS, PVS_PORT, PVS_CHANNEL_NUMBER, PVS_CHANNEL_NAME);

// Start the interactive console
startInteractiveConsole(controller);

// Start the web server
startWebServer(controller);

setInterval(() => {
    updateAllTimers(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, controller);
}, 1000);