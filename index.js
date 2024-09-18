//index.js
const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const logger = require('./logger');
const ProVideoServerController = require('./ProVideoServerController');
const startInteractiveConsole = require('./Interactive/interactive');
const startWebServer = require('./REST/server');
const { updateAllTimers } = require('./ProPresenter/ProPresenterTimers');
const fs = require("fs");
const path = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const logger = require("./logger");
const ProVideoServerController = require("./ProVideoServerController");
const startInteractiveConsole = require("./Interactive/interactive");
const startWebServer = require("./REST/server");
const { updateAllTimers } = require("./ProPresenter/ProPresenterTimers");
//const { umd } = require('./TSL-UMD/tsl-umd');
//const { sendUMDMessage } = require('./TSL-UMD/tsl-umd-send'); 
const goUMD = require('./TSL-UMD/tsl-umd');
//const { sendUMDMessage } = require('./TSL-UMD/tsl-umd-send');
const goUMD = require("./TSL-UMD/tsl-umd");

const isPackaged = typeof process.pkg !== 'undefined';
const isPackaged = typeof process.pkg !== "undefined";

let argv = {};
if (!isPackaged) {
  argv = yargs(hideBin(process.argv))
    .option("logLevel", {
      alias: "l",
      description: "Set the log level for Winston logger",
      type: "string",
      default: "debug",
    })
    .help()
    .alias("help", "h").argv;
} else {
  // Default arguments for packaged application
  argv.logLevel = "info";
}

// Set the logger level based on the command-line argument or default
logger.setLevel(argv.logLevel);

logger.info(`Starting application with log level: ${argv.logLevel}`);


const getConfigFilePath = () => {
    const homeDirectory = process.env.HOME || process.env.USERPROFILE;
    const documentsPath = path.join(homeDirectory, 'Documents', 'PVSControl.json');
    const localPath = path.resolve(__dirname, 'PVSControl.json');
    
    if (fs.existsSync(documentsPath)) {
        logger.info('Found config file in documents path');
        return documentsPath;
    } else if (fs.existsSync(localPath)) {
        logger.info('Config file not found in documents path, will local in local directory instead');
        return localPath;
    } else {
        throw new Error('PVSControl.json not found in either Documents folder or local directory.');
    }
};

const configPath = getConfigFilePath();
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const {
    CONTROL: {
        PORT: WEB_PORT
        },
    PVS: {
        IP_ADDRESS: PVS_IP_ADDRESS,
        PORT: PVS_PORT,
        CHANNEL_NUMBER: PVS_CHANNEL_NUMBER,
        CHANNEL_NAME: PVS_CHANNEL_NAME,
        AUTO_QUEUE_DISABLE: PVS_AUTO_QUEUE
    },
    PRO_PRESENTER: {
        IP_ADDRESS: PRO_PRESENTER_IP,
        PORT: PRO_PRESENTER_PORT
    },
    TSL_RX: {
        PORT: TSL_PORT,
        ADDRESS: TSL_ADDRESS
    }
} = config;



const controller = new ProVideoServerController(PVS_IP_ADDRESS, PVS_PORT, PVS_CHANNEL_NUMBER, PVS_CHANNEL_NAME, PVS_AUTO_QUEUE);

goUMD(controller, TSL_PORT, TSL_ADDRESS);

// Start the interactive console
startInteractiveConsole(controller);

// Start the web server
startWebServer(controller, WEB_PORT);

//this is how we're updating the propresenter timers
 setInterval(() => {
         updateAllTimers(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, controller);
//         sendUMDMessage(controller, '127.0.0.1', TSL_PORT, controller);
 }, 1000);

