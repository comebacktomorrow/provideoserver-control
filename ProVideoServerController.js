//ProVideoServerController.js
const AMPCommandFactory = require('./AMPCommandFactory');
const AMPCommandQueue = require('./AMPCommandQueue');
const PVSLibraryParser = require('./PVSLibraryParser');
const TCPClient = require('./TCPClient');

class ProVideoServerController {
    constructor(ip, port, channelNumber) {
        this.tcpClient = new TCPClient(ip, port);
        this.commandQueue = new AMPCommandQueue();
        this.tcpClient.setController(this); // Pass the controller to the TCP client
        this.libraryParser = new PVSLibraryParser(channelNumber); // Initialize PVSLibraryParser with the channel number

        this.libraryParser.loadPlaylist((err, playlistNodes) => {
                if (err) {
                    console.error(err);
                    return;
                }

        });
    }

    handleResponse(response) {
        console.log('---Controller: processing response');
        if (response.responseType) {
            switch (response.responseType) {
                case 'ACK':
                    console.log('---Acknowledgement received by controller -> passing to queue ');
                    break;
                case 'NAC':
                    console.log('---Negative Acknowledgement received by controller -> passing to queue');
                    break;
                case 'ERR':
                    console.log('---Error received by controller -> passing to queue');
                    break;
                default:
                    console.error('---Unknown response type -> passing to queue');
            }
        } else {
            // Log complex responses
            console.log('---Complex response received by controller -> passing to queue');
        }
        // Handle all responses in the command queue
        this.commandQueue.handleResponse(response);
    }

    loadClipByIndex(index) {
        let clip = index;
        this.getClipByIndex(clip, (clip, err) => {
            if (err) {
                console.error("error", err);
            } else {
                console.log("LOAD: found clip", clip.plnName);
                this.inPreset({ clipname: clip.plnName});
            }
        });
    }

    getLoadedClipPlaylistData() {
        let clip = this.IDLoadedRequest();
        console.log('lookup', clip); // IDLoadedRequest probably isn't returning anything yet
        //getClipByName(clip) // we then get get clip by name and return that
    }


    pause(){
        //get current time
        //set time to current time via inPreset
    }

    jumpTime(sec){
        //get current time
        //add\subtract the time to the current time
        //inPreset(new time)
        //play
        //we might need to do some logic checking to make sure we stay within the bounds
    }

    queueNext(){
        loadClipByIndex(getSelectedClip().index + 1);
    }


    cueUpData(data) {
        const command = AMPCommandFactory.createCommand('cueUpData', data, this.tcpClient);
        this.commandQueue.addCommand(command);
    }

    CRAT(CHANNEL_NAME) {
        const command = AMPCommandFactory.createCommand('CRAT', CHANNEL_NAME, this.tcpClient);
        let x = this.commandQueue.addCommand(command);
        console.log(x);
    }

    stop() {
        console.log("Controller calling stop")
        const command = AMPCommandFactory.createCommand('stop', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
    }

    inPreset(data) {
        console.log("Controller calling inPreset")
        const command = AMPCommandFactory.createCommand('inPreset', data, this.tcpClient);

        command.onSuccess((data) => {
            console.log('------Controller - InPreset command succeeded', data);
        });

        command.onFailure(() => {
            console.log('------Controller - InPreset command failed');
        });
        this.commandQueue.addCommand(command);
    }

    play(data) {
        console.log("Controller calling play")
        const command = AMPCommandFactory.createCommand('play', data, this.tcpClient);

        command.onSuccess(() => {
            console.log('------Controller - Play command succeeded');
        });

        command.onFailure(() => {
            console.log('------Controller - Play command failed');
        });
        this.commandQueue.addCommand(command);
    }

    IDStatusRequest(){
        const command = AMPCommandFactory.createCommand('idStatusRequest', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
    }

    IDLoadedRequest(){
        const command = AMPCommandFactory.createCommand('idLoadedRequest', {}, this.tcpClient);

        command.onSuccess(() => {
            console.log('------Controller - IDLoadedRequest command succeeded');
        });

        command.onFailure(() => {
            console.log('------Controller - IDLoadedRequest command failed');
        });
        this.commandQueue.addCommand(command);
    }

    currentTimeSense() {
        const command = AMPCommandFactory.createCommand('currentTimeSense', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
    }
 
    // playlist functions - via AMP

    listFirstRequest(){
    const command = AMPCommandFactory.createCommand('listFirst', {}, this.tcpClient);
    this.commandQueue.addCommand(command);
}

    listNextRequest(){
        const command = AMPCommandFactory.createCommand('listNext', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
    }

    // playlist functions - via XML


    //get all clip details
    getAllClips(callback) {
        return this.libraryParser.getAllClips(callback);
    }

    //get clip details by name
    getClipByName(name, callback) {
        return this.libraryParser.getClipByName(name, callback);
    }

    //get clip details by index
    getClipByIndex(index, callback) {
        return this.libraryParser.getClipByIndex(index, callback);
    }

    //set a clip as selected
    setClipSelected(index, isSelected) {
        return this.libraryParser.setClipSelected(index, true);
    }

    //set a clip as selected
   getClipSelected(callback) {
        return this.libraryParser.getClipSelected(callback);
    }


}

module.exports = ProVideoServerController;


// getDeviceType() {
//     const command = AMPCommandFactory.createCommand('deviceTypeRequest', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// forward(data = {mode: 'shuttle', speed: '74'}) {
//     console.log("Controller calling fast forward")
//     const command = AMPCommandFactory.createCommand('forward', data, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// rewind(data = {mode: 'rewind', speed: '74'}) {
//     console.log("Controller calling rewind")
//     const command = AMPCommandFactory.createCommand('rewind', data, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// setLoopMode() {
//     console.log("Controller calling eject")
//     const command = AMPCommandFactory.createCommand('setLoopMode', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }


// getDeviceID() {
//     const command = AMPCommandFactory.createCommand('deviceIdRequest', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// getDeviceName() {
//     const command = AMPCommandFactory.createCommand('deviceNameRequest', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// currentStatusSense() {
//     const command = AMPCommandFactory.createCommand('currentStatusSense', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }




// countRequest(){
//     const command = AMPCommandFactory.createCommand('count', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// IDDurationRequest(){
//     const command = AMPCommandFactory.createCommand('idDurationRequest', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// listFirstRequest(){
//     const command = AMPCommandFactory.createCommand('listFirst', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// listNextRequest(){
//     const command = AMPCommandFactory.createCommand('listNext', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// cueClip(data) {
//     const command = AMPCommandFactory.createCommand('cueClip', data, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }

// eject() {
//     console.log("Controller calling eject")
//     const command = AMPCommandFactory.createCommand('eject', {}, this.tcpClient);
//     this.commandQueue.addCommand(command);
// }