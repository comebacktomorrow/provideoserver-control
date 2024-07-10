//ProVideoServerController.js
const AMPCommandFactory = require('./AMPCommandFactory');
const AMPCommandQueue = require('./AMPCommandQueue');
const PVSLibraryParser = require('./PVSLibraryParser');
const TCPClient = require('./TCPClient');
const logger = require('./logger');
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
        this.clocks = [];
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

    //roughy works
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
                let header = "CTRL: POLL -  ";
                logger.info(header +  this.getTransportState()  + ' of '+this.currentClip.duration )
            } catch (error) {
                logger.warn('Error during polling:', error);
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
                logger.debug("CTRL: POLL - IDLoadRequest mismatch - a different clip has been loaded")
                //this.currentClip = await this.getClipByName(data.data.clipname[0], (err, clip));
                this.getClipByName(data.data.clipname[0], (err, clip) => {
                            if (err) {
                                console.error("error", err);
                                reject(err);
                            } else {
                                //logger.debug("gLCPD updating loaded clip clip:", clip);
                                this.currentClip = clip;
                                //this.currentClipObj = data.data;
                                this.setClipSelected(clip.index);
                            }
                        });
                //this.setClipSelected(this.currentClip.index);
            }
        } catch (error) {
            logger.error('Error updating loaded clip playlist data:', error);
        }
    }

    async updateCurrentTimecode() {
        try {
            //logger.debug("UPDATE TIMECODE!")
            const data = await this.currentTimeSense();
            this.currentTimecode = data.data.timecode;
            this.currentTime = data.data.timecode;
            this.clocks.currentTimecode = data.data.timecode;
            this.clocks.t1 = operateTimecodes(data.data.timecode, this.currentClip.t1,'subtract' , this.currentClip.fps)
            this.clocks.t2 = operateTimecodes(data.data.timecode, this.currentClip.t2,'subtract' , this.currentClip.fps)
            this.clocks.trt = operateTimecodes(data.data.timecode, this.currentClip.trt,'subtract' , this.currentClip.fps)
            //console.log("CLIP *******************************************",this.currentClip);
            //console.log("TC NOW", this.currentTimecode);
            //console.log("UPDATE TIMECODE : T1 ", this.clocks.t1);
            //console.log("UPDATE TIMECODE : T2 ", this.clocks.t2);
            //console.log("UPDATE TIMECODE : T2 ", this.clocks.trt);
            //console.log("UPDATE TIMECODE : TRK ", this.clocks.t1);
        } catch (error) {
            logger.error('Error updating current timecode:', error);
        }
    }

    updateTransportState() {
        //console.log("TC NOW", this.currentTimecode);
        let framerate = + this.currentClip.fps;
        //console.log(framerate);
        let jumptime = {timecode: { frames: 2, seconds: 0, minutes: 0, hours: 0 }, operation: 'subtract'} // we use this to create a tollerance
        let jumptc = operateTimecodes(jumptime.timecode,  this.currentClip.duration, jumptime.operation, framerate )
        //console.log("END  TC", jumptc); //this is the time that we'll call end clip
        if (!this.currentClip || !this.currentTimecode) return;

        const { hours, minutes, seconds, frames } = this.currentTimecode;
        //console.log("TC *******************************************",this.currentClip); // this shouldn't be the whole object
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
            //console.log("CTRL: PLAYBACK PROGRESS - ", progress)
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
        logger.debug("CTRL: updateTransportState - Transport State: " + this.transportState)
    }

    clearAutoCueTimer(){
        if (this.autoCueTimer) {
            clearTimeout(this.autoCueTimer);
            this.autoCueTimer = null;
        }
    }

    setAutoCueTimer() {
        console.log("SET TIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERRTIMERR")
        logger.debug("CTRL: AUTOCUE - Timer has been set")
        this.autoCueTimer = setTimeout(() => {
            if (this.transportState === 'AT_END') {
                console.log("AutoCue time out - going to next");
            if (this.transportState === 'AT_END' && !this.autoCueDisable) {
                logger.debug("CTRL: AUTOCUE - AutoCue time out - queueing next clip");
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
        //logger.verbose('---Controller: processing response');
        if (response.responseType) {
            switch (response.responseType) {
                case 'ACK':
                    logger.verbose('---Acknowledgement received by controller -> passing to queue ');
                    break;
                case 'NAC':
                    logger.verbose('---Negative Acknowledgement received by controller -> passing to queue');
                    break;
                case 'ERR':
                    logger.verbose('---Error received by controller -> passing to queue');
                    break;
                default:
                    logger.error('---Unknown response type -> passing to queue');
            }
        } else {
            // Log complex responses
            logger.verbose('---Complex response received by controller -> passing to queue');
        }
        // Handle all responses in the command queue
        return this.commandQueue.handleResponse(response);

    }
    
    async loadClipByIndex(index) {
        logger.verbose(`CTRL: Called loadClipByIndex — ${index}`);
        return new Promise((resolve, reject) => {
            this.getClipByIndex(index, (err, clip) => {
                if (err) {
                    logger.error('CTRL: loadClipByIndex - Error getting clip by index:', err);
                    reject(err);
                } else if (clip) {
                    logger.verbose(`CTRL: LoadClipByIndex success - Loading Clip ${clip.plnName}`);
                    this.inPreset({ clipname: clip.plnName })
                        .then(response => {
                            logger.debug(`CTRL: OK. LoadClipByIndex — clip successfully: ${clip.plnName}`);
                            resolve(response);
                        })
                        .catch(error => {
                            logger.error('CTRL: loadClipByIndex -  Error in inPreset:', error);
                            reject(error);
                        });
                } else {
                    reject(new Error('Clip not found'));
                }
            });
        });
    }

    async loadClipByName(name) {
        logger.verbose(`CTRL: Called loadClipByName ${name}`);
        return new Promise((resolve, reject) => {
            this.getClipByName(name, (err, clip) => {
                if (err) {
                    logger.error('CTRL: loadClipByName - Error getting clip by name:', err);
                    reject(err);
                } else if (clip) {
                    logger.verbose(`CTRL: loadClipByName - Got name. Loading clip: ${clip.plnName}`);
                    this.inPreset({ clipname: clip.plnName })
                        .then(response => {
                            logger.debug(`CTRL: OK. LoadClipByName — clip successfully: ${clip.plnName}`);
                            resolve(response);
                        })
                        .catch(error => {
                           logger.error('CTRL: loadClipByName - Error in inPreset:', error);
                            reject(error);
                        });
                } else {
                    reject(new Error('Clip not found'));
                }
            });
        });
    }

    async loadClipByCleanName(name) {
        logger.verbose(`CTRL: Called loadClipByCleanName ${name}`);
        return new Promise((resolve, reject) => {
            this.getClipByCleanName(name, (err, clip) => {
                if (err) {
                    logger.error('CTRL: loadClipByCleanName - Error getting clip by cleanName:', err);
                    reject(err);
                } else if (clip) {
                    logger.verbose(`CTRL: loadClipByCleanName found real name. Loading clip: ${clip.plnName}`);
                    this.inPreset({ clipname: clip.plnName })
                        .then(response => {
                            logger.debug(`CTRL: loadClipByCleanNameClip loaded successfully: ${clip.plnName}`);
                            resolve(response);
                        })
                        .catch(error => {
                            console.error('CTRL: loadClipByCleanName - Error in inPreset:', error);
                            reject(error);
                        });
                } else {
                    reject(new Error('CTRL: loadClipByCleanName - Error getting clip by cleanName:'));
                }
            });
        });
    }

    // possibly should be called updateLoadedClip
    getLoadedClipPlaylistData() {
        logger.verbose("CTRL: getLoadedClipPlaylistData. Get details for loaded clip");
        return new Promise((resolve, reject) => {
            this.IDLoadedRequest()
                .then(data => {
                    logger.verbose('CTRL: getLoadedClipPlaylistData - Called IDLoadRequest. Returned:', data.data.clipname); // IDLoadedRequest should return data here
                    this.getClipByName(data.data.clipname[0], (err, clip) => {
                        if (err) {
                            logger.error('CTRL: getLoadedClipPlaylistData - Error getting clip by name:', err);
                            reject(err);
                        } else {
                            logger.debug("CTRL: getLoadedClipPlaylistData - Found data for clip:", clip);
                            this.setClipSelected(clip.index);
                            resolve(clip);
                        }
                    });
                })
                .catch(error => {
                    logger.error('CTRL: getLoadedClipPlaylistData - Called IDLoadRequest. Failed:', error);
                    reject(error);
                });
        });
    }


    pause(){
        this.currentTimeSense()
            .then(data => {
                logger.debug(" CTRL: Pause - pausing at ", data.data.timecode)
                this.cueUpData({timecode: data.data.timecode})
                    .then(data => {
                        logger.debug(" CTRL: Pause - CueUpWithData timecode to ", data.data);
                    })
                    .catch (error => { console.error('Error:', error);  })
            })
        .catch (error => {
            logger.error('CTRL: Pause -:', error);
        });
    }

    //we might need to do some logic checking to make sure we stay within the bounds
    // we probably ideally would maintain state - keep playing if playing, and nothing if not
    // we technically should be using  frame rate as well - this.getClipSelected().data.fps
    jumpTime(jumptime = {hours: 0, minutes: 0, seconds: 0, frames: 0}){
        this.currentTimeSense()
            .then(data => {
                //console.log(" jumping at ", jumptime)
                let ts = this.transportState;
                logger.verbose("CTRL: jumpTime — Jumping ",jumptime.timecode, " from timecdoe ",  data.data.timecode)
                let tc = operateTimecodes(jumptime.timecode, data.data.timecode, jumptime.operation )
                logger.verbose('CTRL: jumpTime -  New timecode is  ', tc)
                this.cueUpData({timecode: tc})
                    .then(data => {
                        logger.debug("CTRL: jumpTime - Jump Success! Set timecode to ", tc, ts)
                        if (ts == "PLAYING"){
                            this.play();
                    }
                    })
                    .catch (error => { logger.error('JumpTime: Cue Up with Data error', error);  })
            })
        .catch (error => {
            console.error('CTRL: jumpTime currentTimeSenseError. Error:', error);
        });
    }

    jumpBack(jumptime = {hours: 0, minutes: 0, seconds: 0, frames: 0}){
                let endtime = this.currentClip.duration;
                let tc = operateTimecodes(jumptime.timecode, endtime, 'subtract' )
                let ts = this.transportState;
                this.cueUpData({timecode: tc})
                    .then(data => {
                        logger.debug("CTRL: jumpBack - Jump Back Success! Set timecode to ", tc, ts)
                        if (ts == "PLAYING"){
                                this.play();
                        }
                    })
                    .catch (error => { console.error('JumpTime: Cue Up with Data error:', error);  })
    }

    


    async requeueClip() {
        logger.verbose("CTRL: requeueClip - called");
        try {
            const originalClip = await this.getLoadedClipPlaylistData();
            logger.verbose(`CTRL: requeueClip - Receieved getLoadedClipPlayListData:`, originalClip);
    
            if (!originalClip || !originalClip.plnName) {
                throw new Error('CTRL: requeueClip - getLoadedClipPlaylistData: Original clip data is not valid');
            }
    
            logger.verbose(`CTRL: requeueClip - Queueing next clip after original clip: ${originalClip.plnName}`);
            await this.queueNext();
    
            logger.verbose(`CTRL: requeueClip - Next clip queued called. Now reloading original clip via inPreset: ${originalClip.plnName}`);
            await this.inPreset({ clipname: originalClip.plnName });
    
            logger.debug(`CTRL: requeueClip - Original clip ${originalClip.plnName} requeued.`);
        } catch (error) {
            console.error('Error requeuing clip:', error);
        }
    }

    queueNext() {
        logger.debug("CTRL: queueNext called");
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
        logger.debug("CTRL: queuePrevious called");
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
            logger.debug('------CTRL: cueUpData - command succeeded', data, response);
            return response;
        } catch(error) {
                logger.error('------CTRL: cueUpData - command failed', error);
                throw error;
            };
    }

    async CRAT(CHANNEL_NAME) {
        const command = AMPCommandFactory.createCommand('CRAT', CHANNEL_NAME, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            logger.verbose('------CTRL: CRAT - command succeeded', CHANNEL_NAME, response);
            return response;
        } catch(error) {
                logger.error('------Controller - CRAT command failed', error);
                throw error;
            };
    }

    async stop() {
        const command = AMPCommandFactory.createCommand('stop', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            logger.debug('------CTRL: STOP - command succeeded', response);
            return response;
        } catch(error) {
                logger.error('------CTRL: STOP - command failed', error);
                throw error;
            };
    }

    //we use this to cue a clip \ make a clip active
    async inPreset(data) {
        //logger.verbose("CTRL: Calling inPreset ", data)
        const command = AMPCommandFactory.createCommand('inPreset', data, this.tcpClient);
        this.commandQueue.addCommand(command);
        
        try { 
            const response = await command.promise;
            logger.debug('------CTRL: inPreset - command succeeded', response);
            return response;
        } catch(error) {
                logger.error('------CTRL: inPreset - command failed', error);
                throw error;
            };
    }

    async play(data) {
        //logger.verbose("CTRL: Calling play")
        const command = AMPCommandFactory.createCommand('play', data, this.tcpClient);
        this.commandQueue.addCommand(command);

        try { 
            const response = await command.promise;
            logger.debug('------CTRL: Play - Command succeeded', response);
            return response;
        } catch(error) {
                logger.error('------CTRL: Play - play command failed', error);
                throw error;
            };
    }

    // we use this to see what is on the timeline
    async IDLoadedRequest(){
        const command = AMPCommandFactory.createCommand('idLoadedRequest', {}, this.tcpClient);
        this.commandQueue.addCommand(command);

        try { 
            const response = await command.promise;
            logger.debug('------CTRL: IDLoadedRequest - command succeeded', response);
            return response;
        } catch(error) {
                logger.error('------CTRL: IDLoadedRequest -  command failed', error);
                throw error;
            };
    }

    // we use this to see what the current time is 
    async currentTimeSense() {
        const command = AMPCommandFactory.createCommand('currentTimeSense', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            logger.debug('------CTRL: currentTimeSense - command succeeded', response);
            return response;
        } catch(error) {
                logger.error('------CTRL: currentTimeSense - command failed', error);
                throw error;
            };
    }
 
    // playlist functions - via AMP - legacy
    async listFirstRequest(){
    const command = AMPCommandFactory.createCommand('listFirst', {}, this.tcpClient);
    this.commandQueue.addCommand(command);
    try { 
        const response = await command.promise;
        logger.debug('------CTRL: listFirstRequest - command succeeded', response);
        return response;
    } catch(error) {
            logger.error('------CTRL: listFirstRequest - command failed', error);
            throw error;
        };
}

    async listNextRequest(){
        const command = AMPCommandFactory.createCommand('listNext', {}, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            logger.debug('------CTRL: listNextRequest - command succeeded', response);
            return response;
        } catch(error) {
                logger.error('------CTRL: listNextRequest - command failed', error);
                throw error;
            };
    }

    // playlist functions - via XML


    //get all clip details
    getAllClips(callback) {
        logger.verbose("CTRL: Called get ALL clip (details)");
        return this.libraryParser.getAllClips(callback);
    }

    //get clip details by name
    getClipByName(name, callback) {
        logger.verbose("CTRL: Called get clip (details) by name", name);
        return this.libraryParser.getClipByName(name, callback);
    }

    //get clip details by name
    getClipByCleanName(name, callback) {
        logger.verbose("CTRL: Called get clip (details) by clean name", name);
        return this.libraryParser.getClipByCleanName(name, callback);
    }

    //get clip details by index
    getClipByIndex(index, callback) {
        logger.verbose("CTRL: Called get clip (details) by index", index);
        return this.libraryParser.getClipByIndex(index, callback);
    }

    //set a clip as selected
    setClipSelected(index) {
        logger.verbose("CTRL: Called set selected active clip by index", index);
        return this.libraryParser.selectClip(index);
    }

    //set a clip as selected
   getClipSelected(callback) {
        logger.verbose("CTRL: Called get selected active clip");
        return this.libraryParser.getClipSelected(callback);
    }

    //set a clip as selected
    setClipTimer(clipname, timer, timecode, callback) {
        logger.verbose("CTRL: Called set timer for clip", clipname);
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