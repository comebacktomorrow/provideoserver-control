//ProVideoServerController.js
const AMPCommandFactory = require('./AMPCommandFactory');
const AMPCommandQueue = require('./AMPCommandQueue');
const PVSLibraryParser = require('./PVSLibraryParser');
const TCPClient = require('./TCPClient');
const logger = require('./logger');
const { operateTimecodes, timecodeToFrames } = require('./utilities');

class ProVideoServerController {
    constructor(ip, port, channelNumber, channelName) {
        this.tcpClient = new TCPClient(ip, port);
        this.commandQueue = new AMPCommandQueue();
        this.tcpClient.setController(this); // Pass the controller to the TCP client
        this.libraryParser = new PVSLibraryParser(channelNumber); // Initialize PVSLibraryParser with the channel number
        

        this.currentClip = { plnName: ""}; // State for current clip
        this.previousClip = null; // Previous state for clip
        this.currentTime = null; // State for current time
        this.clocks = [];
        this.previousTime = null; // Previous state for time
        this.previousTime2 = null; // Previous state for time
        this.transportState = 'STOPPED'; // Initialize transport state
        this.libraryTimestamp = 0;
        this.tallyState = -1;


        //this.currentClipObj = [];

        this.autoCueTimer = null;
        this.AUTO_CUE_TIMER = 5000;
        this.autoCueDisable = false;
        //this.AUTO_CUE_SET = false;
        //VAR AUTO_CUE_ENABLED = true;

        this.CRAT({ channel: channelName}); 
        
        
        this.pollingInterval = 1000; // Polling interval in milliseconds
        this.startPolling();


        this.libraryParser.loadPlaylist((err, playlistNodes) => {
                if (err) {
                    console.error(err);
                    return;
                }
               this.libraryTimestamp = this.libraryParser.getLibraryUpdate();

        });
    }

    //roughy works
    //still need to convert T1 \ T2 \ TRT to timecode - actually need quite a bit more work
    // adding and subtracting time calculation is way messedup -- maybe?
    // also don't know what happens when the playlist is refreshed to custom set times
    
   
    
    
    // we should return timecode, state, loaded clip id, and a playlistupdated flag on regular updates

    // we need to handle things better when they're not found
    // pay particular attention to the rest endpoints
    


     // we might need a way to handle jump states a "SEEKING STATE"  - done?
    //need set and clear trt functions
    //need to deal with playlist updates

    //jumpBack function - done
    // should have a toggle function for playback - done

    // Fixed
    //isAlmostAtEnd - and fix dodgy end timecodes // fixed - we were missing a timecode rate
    // now we just need a way to calculate playback percerntage and if we're in 0.1% of that and paused move to next clip

    async updateLoadedClipPlaylistData(force = false) {
        try {
            const data = await this.IDLoadedRequest();
            if (data.data.clipname[0] != this.currentClip.plnName || force === true){
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
                                return true;
                            }
                        });
                //this.setClipSelected(this.currentClip.index);
            }
        } catch (error) {
            logger.error('Error updating loaded clip playlist data:', error);
        }
    }

    startPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                await this.updateLoadedClipPlaylistData();
                await this.updateCurrentTimecode();
                this.updateTransportState();
                this.setLibraryTimestamp();
                //logger.info("CTRL: " + this.getLoadedNameClip() +  " is " + this.transportState + ". At " + JSON.stringify(this.getCurrentTransportTime().hours) +"h:"+ JSON.stringify(this.getCurrentTransportTime().minutes) +"m:"+  JSON.stringify(this.getCurrentTransportTime().seconds) +"s:"+ JSON.stringify(this.getCurrentTransportTime().frames) +"f");
                

                
                let tD = this.clocks.remaining;
                let t1 = this.clocks.t1; // is actually time remaining
                let t2 = this.clocks.t2;// is actually time remaining
                let trt = this.clocks.trt;// is actually time remaining

                

                let tD_string = "REMAINING: " + JSON.stringify(tD.hours) +"h:"+ JSON.stringify(tD.minutes) +"m:"+  JSON.stringify(tD.seconds) +"s:"+ JSON.stringify(tD.frames) +"f ";
                let t1_string = "T1: " + JSON.stringify(t1.hours) +"h:"+ JSON.stringify(t1.minutes) +"m:"+  JSON.stringify(t1.seconds) +"s:"+ JSON.stringify(t1.frames) +"f ";
                let t2_string = "T2: " + JSON.stringify(t2.hours) +"h:"+ JSON.stringify(t2.minutes) +"m:"+  JSON.stringify(t2.seconds) +"s:"+ JSON.stringify(t2.frames) +"f ";
                let trt_string = "TRT: " + JSON.stringify(trt.hours) +"h:"+ JSON.stringify(trt.minutes) +"m:"+  JSON.stringify(trt.seconds) +"s:"+ JSON.stringify(trt.frames) +"f ";
                //logger.info(tD_string + ' ' + t1_string + ' ' + t2_string + ' ' + trt_string);

            } catch (error) {
                logger.warn('Error during polling:', error);
            }
        }, 50); // Adjust the interval as needed
    }

    stopPolling() {
        clearInterval(this.pollInterval);
    }

    

    async updateCurrentTimecode() {
        try {
            //logger.debug("UPDATE TIMECODE!")
            const data = await this.currentTimeSense();
            this.currentTimecode = data.data.timecode;
            this.currentTime = data.data.timecode;
            this.clocks.currentTimecode = data.data.timecode;
            // this works out the time remainging on the clip
            this.clocks.t1 = operateTimecodes(data.data.timecode, this.currentClip.t1,'subtract' , this.currentClip.fps)
            this.clocks.t2 = operateTimecodes(data.data.timecode, this.currentClip.t2,'subtract' , this.currentClip.fps)
            this.clocks.trt = operateTimecodes(data.data.timecode, this.currentClip.trt,'subtract' , this.currentClip.fps)
            this.clocks.remaining = operateTimecodes(data.data.timecode, this.currentClip.duration,'subtract' , this.currentClip.fps)
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
            if (this.AUTO_CUE_TIMER !== 0 && this.autoCueTimer === null && this.tallyState != 1) {
                this.setAutoCueTimer();
              }
        } else if (this.isPlaying(this.currentTimecode) && this.transportState != 'CUEING') {
            this.transportState = 'PLAYING';
            this.clearAutoCueTimer();
        } else {
            
            let progress = ((timecodeToFrames(this.currentTimecode, framerate)/ timecodeToFrames(this.currentClip.duration, framerate)));
            //console.log("CTRL: PLAYBACK PROGRESS - ", progress)
            // this is our soft stop function - if we're within 0.1% of the end, we'll treat it as a stop
            if  ((progress) >= 0.99){
                this.transportState = 'AT_END';
                if (this.AUTO_CUE_TIMER !== 0 && this.autoCueTimer === null && this.tallyState != 1) {
                    this.setAutoCueTimer();
                  }
            } else {
                this.transportState = 'PAUSED';
                this.clearAutoCueTimer();
            }

            
        }

        //logger.debug("CTRL: " + this.getLoadedNameClip() +  " is " + this.transportState + ". At " + JSON.stringify(this.getCurrentTransportTime().hours) +"h:"+ JSON.stringify(this.getCurrentTransportTime().minutes) +"m:"+  JSON.stringify(this.getCurrentTransportTime().seconds) +"s:"+ JSON.stringify(this.getCurrentTransportTime().frames) +"f");
    }

    clearAutoCueTimer(){
        if (this.autoCueTimer) {
            clearTimeout(this.autoCueTimer);
            this.autoCueTimer = null;
        }
    }

    enableAutoCue(){
        this.autoCueDisable = false;
    }

    disableAutoCue(){
        this.autoCueDisable = true;
    }

    getAutoCueDisaled(){
        return this.autoCueDisable;
    }

    setAutoCueTimer() {
        logger.debug("CTRL: AUTOCUE - Timer has been set")
        this.autoCueTimer = setTimeout(() => {
            if (this.transportState === 'AT_END' && !this.autoCueDisable && this.tallyState != 1) { // I don't know that tallystate here does anything
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

        // Check if the second previous time is defined
        if (!this.previousTime2) {
            this.previousTime2 = now;
            return false;
        }

        // Compare each component of the timecode objects with previous timecodes
        if (
            (this.previousTime2.frames !== now.frames ||
            this.previousTime2.seconds !== now.seconds ||
            this.previousTime2.minutes !== now.minutes ||
            this.previousTime2.hours !== now.hours)) {

            this.previousTime2 = this.previousTime; // Shift previous time to previousTime2
            this.previousTime = now; // Update previous time to current time
            return true;
        } else {
            return false;
        }
    }

    getTransportState() {
        return this.transportState;
    }

    getLoadedNameClip() {
        return this.currentClip.plnName;
    }

    getCurrentClocks(){
        return this.clocks;
    }


    getCurrentTransportTime() {
        //console.log(this.clocks.currentTimecode)
        return this.clocks.currentTimecode;
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
                    logger.error('CTRL: loadClipByCleanName - Error getting clip by cleanName:'+ err);
                    reject(err);
                } else if (clip) {
                    logger.verbose(`CTRL: loadClipByCleanName found real name. Loading clip: ${clip.plnName}`);
                    this.inPreset({ clipname: clip.plnName })
                        .then(response => {
                            logger.debug(`CTRL: loadClipByCleanNameClip loaded successfully: ${clip.plnName}`);
                            resolve(response);
                        })
                        .catch(error => {
                            console.error('CTRL: loadClipByCleanName - Error in inPreset:'+  error);
                            reject(error);
                        });
                } else {
                    reject(new Error('CTRL: loadClipByCleanName - Error getting clip by cleanName:' + name));
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
                logger.debug(" CTRL: Pause - pausing at " + JSON.stringify(data.data.timecode))
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

    togglePlayback() {
        if (this.transportState == 'PLAYING'){
            this.pause();
            return 'PAUSED'
        } else {
            this.play();
            return 'PLAY'
        }
    }

    //we might need to do some logic checking to make sure we stay within the bounds
    // we probably ideally would maintain state - keep playing if playing, and nothing if not
    // we technically should be using  frame rate as well - this.getClipSelected().data.fps
    jumpToTimecode(jumptime = {hours: 0, minutes: 0, seconds: 0, frames: 0}){
        
                let ts = this.transportState;
                logger.debug("CTRL: jumpToTimecode — Jumping " + JSON.stringify(jumptime))
                this.cueUpData({timecode: jumptime})
                    .then(data => {
                        logger.debug("CTRL: jumpToTimecode - Jump Success! Set timecode to " + jumptime + "state reset to" + ts)
                        if (ts == "PLAYING"){
                            this.play();
                    }
                    })
                    .catch (error => { logger.error('jumpToTimecode: Cue Up with Data error', error);  });
    }

    //we might need to do some logic checking to make sure we stay within the bounds
    // we probably ideally would maintain state - keep playing if playing, and nothing if not
    // we technically should be using  frame rate as well - this.getClipSelected().data.fps
    jumpTime(jumptime = {hours: 0, minutes: 0, seconds: 0, frames: 0}){
        this.currentTimeSense()
            .then(data => {
                //console.log(" jumping at ", jumptime)
                let ts = this.transportState;
                logger.verbose("CTRL: jumpTime — Jumping " + JSON.stringify(jumptime.timecode) + " from timecdoe " + data.data.timecode)
                let tc = operateTimecodes(jumptime.timecode, data.data.timecode, jumptime.operation )
                logger.verbose('CTRL: jumpTime -  New timecode is  ', tc)
                this.cueUpData({timecode: tc})
                    .then(data => {
                        logger.debug("CTRL: jumpTime - Jump Success! Set timecode to " + tc + "state reset to" + ts)
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
                //let endtime = this.currentClip.duration;
                let endtime = this.currentClip.trt;
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
    // expects
    async cueUpData(data) {
        console.log(data);
        const command = AMPCommandFactory.createCommand('cueUpData', data, this.tcpClient);
        this.commandQueue.addCommand(command);
        try { 
            const response = await command.promise;
            logger.debug('------CTRL: cueUpData - command succeeded' + data + " R "+ response);
            this.transportState = 'CUEING';
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
            logger.verbose('------CTRL: IDLoadedRequest - command succeeded', response);
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
            logger.verbose('------CTRL: currentTimeSense - command succeeded', response);
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

    //get a clip as selected
   getClipSelected(callback) {
        logger.verbose("CTRL: Called get selected active clip");
        return this.libraryParser.getClipSelected(callback);
    }

    //set a clip as selected
    setClipTimerByClipName(clipname, timer, timecode, callback) {
        logger.verbose("CTRL: Called set timer for clip", clipname);
        return this.libraryParser.setClipTimerByClipName(clipname, timer.timecode, timecode, callback);
    }

    //set a clip as selected
    setClipTimerByClipIndex(index, timer, timecode, callback) {
        logger.verbose("CTRL: Called set timer for clip", index);
        return this.libraryParser.setClipTimerByClipIndex(index, timer, timecode, callback);
    }

    getLibraryTimestamp() {
        return this.libraryTimestamp;
    }

    setLibraryTimestamp() {
        const newTime = this.libraryParser.getLibraryUpdate();
        const oldTime = this.libraryTimestamp
        if (newTime!= oldTime) {
            this.libraryTimestamp = newTime
            logger.verbose("new timestamp is " + newTime);
            updateLoadedClipPlaylistData(true);
        }
    }
    setTallyState(state){
        //console.log("setting tally state to " + state)
        this.tallyState = state;
    }

    getTallyState(state){
        //console.log("setting tally state to " + state)
        return this.tallyState;
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