// AMPCommandQueue.js
const AMPResponseParser = require('./AMPResponseParser');
const logger = require('./logger');

class AMPCommandQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentCommand = null; // Add property to keep track of the current command
    }

    addCommand(command) {
        logger.verbose('Queue: addCommand. Added item to command queue');
        this.queue.push(command);
        this.processNext();
    }

    processNext() {
        if (this.isProcessing) {
            return;
        }

        if (this.queue.length === 0) {
            logger.verbose('Queue: ProcessNext - Command queue is empty');
            return;
        }

        this.isProcessing = true;
        this.currentCommand = this.queue.shift(); // Set the current command
        logger.verbose('Queue: ProcessNext - Goign to next .. Execute command:', this.currentCommand);
        this.currentCommand.execute();
    }

    handleResponse(responseString) {
        logger.verbose('----Queue: Handling response:', responseString);

        logger.verbose('----Queue: handleResponsePassing to response parser: ' + JSON.stringify(this.currentCommand.getExpectedResponse()));

        const response = AMPResponseParser.parse(responseString, this.currentCommand.getExpectedResponse());

        const checksumDisable = this.currentCommand.getExpectedResponse().checksumDisable;
        if (!this.currentCommand) {
            logger.error('----Queue: handleResponse - No current command to handle response for');
            return;
        }

        if (response.isValidChecksum || response.responseType === 'ACK' || checksumDisable) {
            logger.verbose('----Queue: handleResponse - Valid checksum or simple response in response:');

            if (response.responseType === 'ACK') {
                //console.log('----Queue - Acknowledgement received. Calling back model', 'ACK');
                this.currentCommand.notifySuccess(response);
            } else if (response.responseType === 'NAC') {
                //console.error('----Queue - Negative Acknowledgement received. Calling back model');
                this.currentCommand.notifyFailure();
            } else if (response.responseType === 'ERR') {
                //console.error('----Queue - Error received. Calling back model');
                this.currentCommand.notifyFailure();
            } else {
                //console.log('----Queue - Complex response received:', response);
                this.currentCommand.notifySuccess(response); // Assuming complex responses are successful
            }
        } else {
            logger.error('----Queue - Invalid checksum in response:' + response)
            this.currentCommand.notifyFailure();
        }

        this.isProcessing = false;
        this.currentCommand = null;
        this.processNext();
        return response;
    }

}

module.exports = AMPCommandQueue;