const net = require('net');
const { unpackData } = require('./utilities');
const logger = require('./logger');

class TCPClient {
    constructor(ip, port) {
        this.client = new net.Socket();
        this.client.connect(port, ip, () => {
            logger.info('Connected to AMP server at', ip, ':', port);
        });

        this.client.on('data', (data) => {
            logger.verbose('TCP: Received data:', data.toString());
            this.handleReceivedData(data);
        });

        this.client.on('close', () => {
            logger.info('Connection closed');
        });

        this.client.on('error', (err) => {
            console.error('TCP connection error:', err);
            // Implement reconnection logic if necessary
        });
    }

    setController(controller) {
        this.controller = controller;
    }

    sendData(data) {
        logger.raw('TCP: Sending data:', data);
        this.client.write(data + '\n');
    }

    handleReceivedData(data) {
        const response = unpackData(data.toString());
        logger.raw(`-TCP: Handle data: ${data.toString()}`);

        if (response.responseType) {
            logger.raw(`--Received simple response: ${response.responseType} -> passing to controller`);
            if (this.controller) {
                this.controller.handleResponse(response);
            }
        } else {
            //console.log(`Calculated checksum: on ${data.slice(8, -2)} as ${response.checksum}`);
            if (!response.isValidChecksum) {
                logger.raw('--Invalid checksum in response:', response);
                if (this.controller) {
                    this.controller.handleResponse(response);
                }
            } else {
                logger.raw('--Processing complex response-> passing to controller');
                if (this.controller) {
                    this.controller.handleResponse(response);
                }
            }
        }
    }
}

module.exports = TCPClient;