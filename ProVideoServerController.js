//ProVideoServerController.js
const AMPCommandFactory = require('./AMPCommandFactory');
const AMPCommandQueue = require('./AMPCommandQueue');
const PVSLibraryParser = require('./PVSLibraryParser');
const TCPClient = require('./TCPClient');
const { operateTimecodes, timecodeToFrames } = require('./utilities');

class ProVideoServerController {
    constructor(ip, port, channelNumber) {
        this.tcpClient = new TCPClient(ip, port);
        this.commandQueue = new AMPCommandQueue();
        this.tcpClient.setController(this); // Pass the controller to the TCP client
        this.libraryParser = new PVSLibraryParser(channelNumber); // Initialize PVSLibraryParser with the channel number


        this.currentClip = { plnName: ""}; // State for current clip
        this.previousClip = null; // Previous state for clip
        this.currentTime = null; // State for current time
        this.previousTime = null; // Previous state for time
        this.transportState = 'STOPPED'; // Initialize transport state

        //this.currentClipObj = [];

        this.autoCueTimer = null;
        this.AUTO_CUE_TIMER = 5000;
        //this.AUTO_CUE_SET = false;
        //VAR AUTO_CUE_ENABLED = true;
        
        
        this.pollingInterval = 1000; // Polling interval in milliseconds
        this.startPolling();


        this.libraryParser.loadPlaylist((err, playlistNodes) => {
                if (err) {
                    console.error(err);
                    return;
                }

        });
    }

    //still need to convert T1 \ T2 \ TRT to timecode - actually need quite a bit more work
    //need set and clear trt functions
    
    
    
    //need to deal with playlist updates

    //jumpBack function - done

    // Fixed
    //isAlmostAtEnd - and fix dodgy end timecodes // fixed - we were missing a timecode rate
    // now we just need a way to calculate playback percerntage and if we're in 0.1% of that and paused move to next clip

    startPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                await this.updateLoadedClipPlaylistData();
                await this.updateCurrentTimecode();
                this.updateTransportState();
            } catch (error) {
                console.error('Error during polling:', error);
            }
        }, 1000); // Adjust the interval as needed
    }

    stopPolling() {
        clearInterval(this.pollInterval);
    }

    async updateLoadedClipPlaylistData() {
        try {
            const data = await this.IDLoadedRequest();
            if (data.data.clipname[0] != this.currentClip.plnName){
                console.log("******************************************POLL: Clip name changed")
                //this.currentClip = await this.getClipByName(data.data.clipname[0], (err, clip));
                this.getClipByName(data.data.clipname[0], (err, clip) => {
                            if (err) {
                                console.error("error", err);
                                reject(err);
                            } else {
                                console.log("gLCPD updating loaded clip clip:", clip);
                                this.currentClip = clip;
                                //this.currentClipObj = data.data;
                                this.setClipSelected(clip.index);
                            }
                        });
                //this.setClipSelected(this.currentClip.index);
            }
        } catch (error) {
            console.error('Error updating loaded clip playlist data:', error);
        }
    }

    async updateCurrentTimecode() {
        try {
            const data = await this.currentTimeSense();
            this.currentTimecode = data.data.timecode;
            this.currentTime = data.data.timecode;
        } catch (error) {
            console.error('Error updating current timecode:', error);
        }
    }

    updateTransportState() {
        console.log("TC *******************************************",this.currentTimecode);
        let framerate = + this.currentClip.fps;
        console.log(framerate);
        let jumptime = {timecode: { frames: 2, seconds: 0, minutes: 0, hours: 0 }, operation: 'subtract'}
        let jumptc = operateTimecodes(jumptime.timecode,  this.currentClip.duration, jumptime.operation, framerate )
        console.log("END  *******************************************",jumptc);
        if (!this.currentClip || !this.currentTimecode) return;

        const { hours, minutes, seconds, frames } = this.currentTimecode;
        console.log("TC *******************************************",this.currentClip);
        if (hours === 0 && minutes === 0 && seconds === 0 && (frames === 0 || frames === 1)) {
            this.transportState = 'AT_START';
            this.clearAutoCueTimer();
        } else if ( //we need to redo the duration
            hours === jumptc.hours &&
            minutes === jumptc.minutes &&
            seconds === jumptc.seconds &&
            (frames === jumptc.frames )
        ) {
            this.transportState = 'AT_END';
            if (this.AUTO_CUE_TIMER !== 0 && this.autoCueTimer === null) {
                this.setAutoCueTimer();
              }
        } else if (this.isPlaying(this.currentTimecode)) {
            this.transportState = 'PLAYING';
            this.clearAutoCueTimer();
        } else {
            
            let progress = ((timecodeToFrames(this.currentTimecode, framerate)/ timecodeToFrames(this.currentClip.duration, framerate)));
            console.log("PROGRESS", progress)
            // this is our soft stop function - if we're within 0.1% of the end, we'll treat it as a stop
            if  ((progress) >= 0.99){
                this.transportState = 'AT_END';
                if (this.AUTO_CUE_TIMER !== 0 && this.autoCueTimer === null) {
                    this.setAutoCueTimer();
                  }
            } else {
                this.transportState = 'PAUSED';
                this.clearAutoCueTimer();
            }

            
        }
        console.log("TRANSPOT:", this.transportState)
    }

    clearAutoCueTimer(){
        if (this.autoCueTimer) {
            clearTimeout(this.autoCueTimer);
            this.autoCueTimer = null;
        }
    }

    setAutoCueTimer() {
        console.log("SET TIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERR")
        this.autoCueTimer = setTimeout(() => {
            if (this.transportState === 'AT_END') {
                console.log("AutoCue time out - going to next");
                this.queueNext();
                clearTimeout(this.autoCueTimer);
            }
        }, this.AUTO_CUE_TIMER);
    }

    isPlaying(now) {
        // Check if previous time is defined
        if (!this.previousTime) {
            this.previousTime = now;
            return false;
        }
    
        // Compare each component of the timecode objects
        if (this.previousTime.frames !== now.frames ||
            this.previousTime.seconds !== now.seconds ||
            this.previousTime.minutes !== now.minutes ||
            this.previousTime.hours !== now.hours) {
    
            this.previousTime = now;
            return true;
        } else {
            return false;
        }
    }

    getTransportState() {
        return this.transportState;
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

    async loadClipByName(name) {
        console.log(`CTRL: Called load clip by index ${name}`);
        return new Promise((resolve, reject) => {
            this.getClipByName(name, (err, clip) => {
                if (err) {
                    console.error('Error getting clip by name:', err);
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

    async loadClipByCleanName(name) {
        console.log(`CTRL: Called load clip by index ${name}`);
        return new Promise((resolve, reject) => {
            this.getClipByCleanName(name, (err, clip) => {
                if (err) {
                    console.error('Error getting clip by name:', err);
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

    //we might need to do some logic checking to make sure we stay within the bounds
    // we probably ideally would maintain state - keep playing if playing, and nothing if not
    // we technically should be using  frame rate as well - this.getClipSelected().data.fps
    jumpTime(jumptime = {hours: 0, minutes: 0, seconds: 0, frames: 0}){
        this.currentTimeSense()
            .then(data => {
                console.log(" jumping at ", jumptime)

                console.log("jc",jumptime.timecode, " tc",  data.data.timecode)
                let tc = operateTimecodes(jumptime.timecode, data.data.timecode, jumptime.operation )
                console.log('new timecode ', tc)
                this.cueUpData({timecode: tc})
                    .then(data => {
                        console.log(" set timecode to ", tc)
                        if (ts == "PLAYING"){
                            this.play();
                    }
                    })
                    .catch (error => { console.error('Error:', error);  })
            })
        .catch (error => {
            console.error('Error:', error);
        });
    }

    jumpBack(jumptime = {hours: 0, minutes: 0, seconds: 0, frames: 0}){
                let endtime = this.currentClip.duration;
                let tc = operateTimecodes(jumptime.timecode, endtime, 'subtract' )
                let ts = this.transportState;
                this.cueUpData({timecode: tc})
                    .then(data => {
                        console.log("JUMPING BACK TO TIMECODE ", tc, ts)
                        if (ts == "PLAYING"){
                                this.play();
                        }
                    })
                    .catch (error => { console.error('Error:', error);  })
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

    //get clip details by name
    getClipByCleanName(name, callback) {
        console.log("CTRL: Called get clip (details) by clean name", name);
        return this.libraryParser.getClipByCleanName(name, callback);
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

    //set a clip as selected
    setClipTimer(clipname, timer, timecode, callback) {
        console.log("CTRL: Called set timer for clip", clipname);
        return this.libraryParser.setClipTimer(clipname, timer.timecode, timecode, callback);
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