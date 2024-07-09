// AMPCommandQueue.js
const AMPResponseParser = require('./AMPResponseParser');

class AMPCommandQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentCommand = null; // Add property to keep track of the current command
    }

    addCommand(command) {
        console.log('Queue - Added item to command queue');
        this.queue.push(command);
        this.processNext();
    }

    processNext() {
        if (this.isProcessing) {
            return;
        }

        if (this.queue.length === 0) {
            console.log('Queue - Command queue is empty');
            return;
        }

        this.isProcessing = true;
        this.currentCommand = this.queue.shift(); // Set the current command
        console.log('Queue - Processing command:', this.currentCommand);
        this.currentCommand.execute();
    }

    handleResponse(responseString) {
        console.log('----Queue - Handling response:', responseString);

        console.log('----Queue - Expects: ' + JSON.stringify(this.currentCommand.getExpectedResponse()));

        const response = AMPResponseParser.parse(responseString, this.currentCommand.getExpectedResponse());

        if (!this.currentCommand) {
            console.error('----Queue - No current command to handle response for');
            return;
        }

        if (response.isValidChecksum || response.responseType === 'ACK') {
            console.log('----Valid checksum or simple response in response:');

            if (response.responseType === 'ACK') {
                console.log('----Queue - Acknowledgement received. Calling back model');
                this.currentCommand.notifySuccess();
            } else if (response.responseType === 'NAC') {
                console.error('----Queue - Negative Acknowledgement received. Calling back model');
                this.currentCommand.notifyFailure();
            } else if (response.responseType === 'ERR') {
                console.error('----Queue - Error received. Calling back model');
                this.currentCommand.notifyFailure();
            } else {
                console.log('----Queue - Complex response received:', response);
                this.currentCommand.notifySuccess(response); // Assuming complex responses are successful
            }
        } else {
            console.error('----Queue - Invalid checksum in response:', response);
            this.currentCommand.notifyFailure();
        }

        this.isProcessing = false;
        this.currentCommand = null;
        this.processNext();
    }

}

module.exports = AMPCommandQueue;