//ProVideoServerController.js
const AMPCommandFactory = require('./AMPCommandFactory');
const AMPCommandQueue = require('./AMPCommandQueue');
const PVSLibraryParser = require('./PVSLibraryParser');
const TCPClient = require('./TCPClient');
const { operateTimecodes } = require('./utilities');

class ProVideoServerController {
    constructor(ip, port, channelNumber) {
        this.tcpClient = new TCPClient(ip, port);
        this.commandQueue = new AMPCommandQueue();
        this.tcpClient.setController(this); // Pass the controller to the TCP client
        this.libraryParser = new PVSLibraryParser(channelNumber); // Initialize PVSLibraryParser with the channel number

        //CONST AUTO_CUE_TIMER = 5;
        //VAR AUTO_CUE_ENABLED = true;


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
        return this.commandQueue.handleResponse(response);

    }
    
    async loadClipByIndex(index) {
        console.log(`CTRL: Called load clip by index ${index}`);
        return new Promise((resolve, reject) => {
            this.getClipByIndex(index, (err, clip) => {
                if (err) {
                    console.error('Error getting clip by index:', err);
                    reject(err);
                } else if (clip) {
                    console.log(`Loading clip: ${clip.plnName}`);
                    this.inPreset({ clipname: clip.plnName })
                        .then(response => {
                            console.log(`Clip loaded successfully: ${clip.plnName}`);
                            resolve(response);
                        })
                        .catch(error => {
                            console.error('Error in loadClipByIndex:', error);
                            reject(error);
                        });
                } else {
                    reject(new Error('Clip not found'));
                }
            });
        });
    }

    // possibly should be called updateLoadedClip
    getLoadedClipPlaylistData() {
        console.log("CTRL: Called get details for active clip on timeline");
        return new Promise((resolve, reject) => {
            this.IDLoadedRequest()
                .then(data => {
                    console.log('lookup', data.data.clipname); // IDLoadedRequest should return data here
                    this.getClipByName(data.data.clipname[0], (err, clip) => {
                        if (err) {
                            console.error("error", err);
                            reject(err);
                        } else {
                            console.log("gLCPD found clip:", clip);
                            this.setClipSelected(clip.index);
                            resolve(clip);
                        }
                    });
                })
                .catch(error => {
                    console.error('Error:', error);
                    reject(error);
                });
        });
    }


    pause(){
        this.currentTimeSense()
            .then(data => {
                console.log(" pausing at ", data.data.timecode)
                this.cueUpData({timecode: data.data.timecode})
                    .then(data => {
                        console.log(" set timecode to ", data.data)
                    })
                    .catch (error => { console.error('Error:', error);  })
            })
        .catch (error => {
            console.error('Error:', error);
        });
    }

    jumpTime(jumptime = {hours: 0, minutes: 0, seconds: 0, frames: 0}){
        //get current time
        //add\subtract the time to the current time
        //inPreset(new time)
        // we also want to get the current state and maintain that
        //we might need to do some logic checking to make sure we stay within the bounds

        
//this.getClipSelected().data.fps
        this.currentTimeSense()
            .then(data => {
                console.log(" jumping at ", jumptime)

                console.log("jc",jumptime.timecode, " tc",  data.data.timecode)
                let tc = operateTimecodes(jumptime.timecode, data.data.timecode, jumptime.operation )
                console.log('new timecode ', tc)
                this.cueUpData({timecode: tc})
                    .then(data => {
                        console.log(" set timecode to ", tc)
                    })
                    .catch (error => { console.error('Error:', error);  })
            })
        .catch (error => {
            console.error('Error:', error);
        });
    }

    async requeueClip() {
        console.log("CTRL: Called requeue clip");
        try {
            const originalClip = await this.getLoadedClipPlaylistData();
            console.log(`Original clip loaded:`, originalClip);
    
            if (!originalClip || !originalClip.plnName) {
                throw new Error('Original clip data is not valid');
            }
    
            console.log(`Queueing next clip after original clip: ${originalClip.plnName}`);
            await this.queueNext();
    
            console.log(`Next clip queued. Now reloading original clip: ${originalClip.plnName}`);
            await this.inPreset({ clipname: originalClip.plnName });
    
            console.log(`Original clip ${originalClip.plnName} requeued.`);
        } catch (error) {
            console.error('Error requeuing clip:', error);
        }
    }

    queueNext() {
        console.log("CTRL: Called queue next clip");
        return new Promise((resolve, reject) => {
            this.getClipSelected((err, clips) => {
                if (err) {
                    reject(err);
                } else {
                    this.loadClipByIndex(clips.index + 1)
                        .then(() => {
                            this.getLoadedClipPlaylistData();
                            resolve();
                        })
                        .catch(reject);
                }
            });
        });
    }

    queuePrevious() {
        console.log("CTRL: Called queue next clip");
        return new Promise((resolve, reject) => {
            this.getClipSelected((err, clips) => {
                if (err) {
                    reject(err);
                } else {
                    this.loadClipByIndex(clips.index - 1)
                        .then(() => {
                            this.getLoadedClipPlaylistData();
                            resolve();
                        })
                        .catch(reject);
                }
            });
        });
    }


    // we use this to cue up timecode
    async cueUpData(data) {
        const command = AMPCommandFactory.createCommand('cueUpData', data, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            console.log('------Controller - cueUpData command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - cueUpData command failed', error);
                throw error;
            };
    }

    async CRAT(CHANNEL_NAME) {
        const command = AMPCommandFactory.createCommand('CRAT', CHANNEL_NAME, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            console.log('------Controller - CRAT command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - CRAT command failed', error);
                throw error;
            };
    }

    async stop() {
        console.log("Controller calling stop")
        const command = AMPCommandFactory.createCommand('stop', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            console.log('------Controller - play command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - play command failed', error);
                throw error;
            };
    }

    //we use this to cue a clip \ make a clip active
    async inPreset(data) {
        console.log("Controller calling inPreset", data)
        const command = AMPCommandFactory.createCommand('inPreset', data, this.tcpClient);
        this.commandQueue.addCommand(command);
        
        try { 
            const response = await command.promise;
            console.log('------Controller - inPreset command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - inPreset command failed', error);
                throw error;
            };
    }

    async play(data) {
        console.log("Controller calling play")
        const command = AMPCommandFactory.createCommand('play', data, this.tcpClient);
        this.commandQueue.addCommand(command);

        try { 
            const response = await command.promise;
            console.log('------Controller - play command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - play command failed', error);
                throw error;
            };
    }

    // we use this to see what is on the timeline
    async IDLoadedRequest(){
        const command = AMPCommandFactory.createCommand('idLoadedRequest', {}, this.tcpClient);
        this.commandQueue.addCommand(command);

        try { 
            const response = await command.promise;
            console.log('------Controller - IDLoadedRequest command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - IDLoadedRequest command failed', error);
                throw error;
            };
        //console.log('********************************', r)
    }

    // we use this to see what the current time is 
    async currentTimeSense() {
        const command = AMPCommandFactory.createCommand('currentTimeSense', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            console.log('------Controller - currentTimeSense command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - currentTimeSense command failed', error);
                throw error;
            };
    }
 
    // playlist functions - via AMP - legacy
    async listFirstRequest(){
    const command = AMPCommandFactory.createCommand('listFirst', {}, this.tcpClient);
    this.commandQueue.addCommand(command);
    try { 
        const response = await command.promise;
        console.log('------Controller - listFirstRequest command succeeded', response);
        return response;
    } catch(error) {
            console.log('------Controller - listFirstRequest command failed', error);
            throw error;
        };
}

    async listNextRequest(){
        const command = AMPCommandFactory.createCommand('listNext', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            console.log('------Controller - listNextRequest command succeeded', response);
            return response;
        } catch(error) {
                console.log('------Controller - listNextRequest command failed', error);
                throw error;
            };
    }

    // playlist functions - via XML


    //get all clip details
    getAllClips(callback) {
        console.log("CTRL: Called get ALL clip (details)");
        return this.libraryParser.getAllClips(callback);
    }

    //get clip details by name
    getClipByName(name, callback) {
        console.log("CTRL: Called get clip (details) by name", name);
        return this.libraryParser.getClipByName(name, callback);
    }

    //get clip details by index
    getClipByIndex(index, callback) {
        console.log("CTRL: Called get clip (details) by index", index);
        return this.libraryParser.getClipByIndex(index, callback);
    }

    //set a clip as selected
    setClipSelected(index) {
        console.log("CTRL: Called set selected active clip by index", index);
        return this.libraryParser.selectClip(index);
    }

    //set a clip as selected
   getClipSelected(callback) {
        console.log("CTRL: Called get selected active clip");
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

    // // we use this to see what is loaded on the transport
    // async IDStatusRequest(){
    //     const command = AMPCommandFactory.createCommand('idStatusRequest', {}, this.tcpClient);
    //     this.commandQueue.addCommand(command);

    //     try { 
    //         const response = await command.promise;
    //         console.log('------Controller - IDStatusRequest command succeeded', response);
    //         return response;
    //     } catch(error) {
    //             console.log('------Controller - IDStatusRequest command failed', error);
    //             throw error;
    //         };
    // }