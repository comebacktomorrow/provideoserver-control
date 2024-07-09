// AMPCommandProto.js
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
    }

    pack() {
        console.log(this.skipCheckSum)
        const charLength = calculateLength(this.cmdType + this.cmdCode + this.data, 4);
        let dataPack = this.cmdWrap + charLength + this.cmdType + this.cmdCode + this.data;
        const checksum = calculateChecksum(this.cmdType + this.cmdCode + this.data);
        console.log("packed as " + "WRAP " + this.cmdWrap + " BC " + charLength + " TYPE " + this.cmdType + " CODE " +this.cmdCode + " DATA " + this.data )
        if (this.cmdWrap !== "CRAT" && this.skipCheckSum === false) {
            console.log("add checksum")
            dataPack += checksum;
        }
        return dataPack;
    }

    execute() {
        console.log("model - executing command")
        this.tcpClient.sendData(this.pack());
    }

    handleResponse(response) {
        if (response === this.expectedResponse) {
            this.notifySuccess(response);
        } else {
            this.notifyFailure(response);
        }
    }

    onSuccess(callback) {
        console.log('model - init success callback')
        this.onSuccessCallback = callback;
    }

    onFailure(callback) {
        console.log('model - init fail callback')
        this.onFailureCallback = callback;
    }

    notifySuccess(response) {
        console.log("-----Model. Recieved callback from queue.")
        if (this.onSuccessCallback) {
            console.log('-----Model callback - notified command success')
            this.onSuccessCallback(response);
        }
    }

    notifyFailure(response) {
        console.log('-----Model. Recieved callback from queue.')
        if (this.onFailureCallback) {
            console.log('-----Model callback - notified command fail')
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