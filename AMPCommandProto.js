// AMPCommandProto.js
const logger = require('./logger');
const { calculateChecksum, calculateLength } = require('./utilities');
class AMPCommandProto {
    constructor(cmdWrap, cmdType, cmdCode, tcpClient, data = '', skipchecksum = false) {
        this.cmdWrap = cmdWrap;
        this.cmdType = cmdType;
        this.cmdCode = cmdCode;
        this.tcpClient = tcpClient;
        this.data = data;
        this.onSuccessCallback = null;
        this.onFailureCallback = null;
        this.expectedResponse = 'ACK';
        this.expectedDataType = 'ack';
        this.skipCheckSum = skipchecksum;

        this.onSuccess(this.notifySuccess);
        this.onFailure(this.notifyFailure);

        this.promise = new Promise((resolve, reject) => {
            this.onSuccess(resolve);
            this.onFailure(reject);
        })
    }

    pack() {
        //console.log(this.skipCheckSum)
        const charLength = calculateLength(this.cmdType + this.cmdCode + this.data, 4);
        let dataPack = this.cmdWrap + charLength + this.cmdType + this.cmdCode + this.data;
        const checksum = calculateChecksum(this.cmdType + this.cmdCode + this.data);
        logger.verbose("packed as " + "WRAP " + this.cmdWrap + " BC " + charLength + " TYPE " + this.cmdType + " CODE " +this.cmdCode + " DATA " + this.data )
        if (this.cmdWrap !== "CRAT" && this.skipCheckSum === false) {
            //console.log("add checksum")
            dataPack += checksum;
        }
        return dataPack;
    }

    execute() {
        logger.verbose("model - executing command")
        this.tcpClient.sendData(this.pack());
    }

    // handleResponse(response) {
    //     console.log("Model handling response:", response);
    //     if (response === this.expectedResponse) {
    //         this.notifySuccess(response);
    //     } else {
    //         this.notifyFailure(response);
    //     }
    // }

    onSuccess(callback) {
        logger.verbose('model - init success callback')
        this.onSuccessCallback = callback;
    }

    onFailure(callback) {
        logger.verbose('model - init fail callback')
        this.onFailureCallback = callback;
    }

    notifySuccess(response) {
        logger.verbose("-----Model. Recieved success response.", response)
        if (this.onSuccessCallback) {
            logger.verbose('-----Model callback - notified command success. Giving control back to queue')
            this.onSuccessCallback(response);
        }
    }

    notifyFailure(response) {
        logger.verbose('-----Model. Recieved failure response.', response)
        if (this.onFailureCallback) {
            logger.verbose('-----Model callback - notified command fail. Giving control back to queue')
            this.onFailureCallback(response);
        }
    }

    getExpectedResponse() {
        return {
            response:  this.expectedResponse,
            type: this.expectedDataType
        };
    }
}

module.exports = AMPCommandProto;