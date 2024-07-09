const net = require('net');
const { unpackData } = require('./utilities');

class TCPClient {
    constructor(ip, port) {
        this.client = new net.Socket();
        this.client.connect(port, ip, () => {
            console.log('Connected to AMP server at', ip, ':', port);
        });

        this.client.on('data', (data) => {
            console.log('TCP: Received data:', data.toString());
            this.handleReceivedData(data);
        });

        this.client.on('close', () => {
            console.log('Connection closed');
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
        console.log('TCP: Sending data:', data);
        this.client.write(data + '\n');
    }

    handleReceivedData(data) {
        const response = unpackData(data.toString());
        console.log(`-TCP: Handle data: ${data.toString()}`);

        if (response.responseType) {
            console.log(`--Received simple response: ${response.responseType} -> passing to controller`);
            if (this.controller) {
                this.controller.handleResponse(response);
            }
        } else {
            //console.log(`Calculated checksum: on ${data.slice(8, -2)} as ${response.checksum}`);
            if (!response.isValidChecksum) {
                console.error('--Invalid checksum in response:', response);
                if (this.controller) {
                    this.controller.handleResponse(response);
                }
            } else {
                console.log('--Processing complex response-> passing to controller');
                if (this.controller) {
                    this.controller.handleResponse(response);
                }
            }
        }
    }
}

module.exports = TCPClient;