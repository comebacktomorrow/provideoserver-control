//PVSLibraryParser.js
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { operateTimecodes } = require('./utilities');
const logger = require('./logger');


class PVSLibraryParser {
    constructor(channelNumber) {
        this.channelNumber = channelNumber;
        this.homeDirectory = process.env.HOME || process.env.USERPROFILE;
        this.playlistFilePath = path.join(this.homeDirectory, 'Documents/ProVideoServer.pvs3');
        this.playlist = [];
        this.libraryUpdate = 0;
        
        this.setupFileWatcher();
    }

    // we set a high stability threshold because it seems like PVP writes twice
    setupFileWatcher() {
        // Initialize chokidar watcher
        this.watcher = chokidar.watch(this.playlistFilePath, {
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 3000
              },
        });

        // Add event listeners
        this.watcher.on('change', (path) => {
            logger.debug(`Library Parser: Library Update - ${path} has changed`);
            this.loadPlaylist();
        });
    

        logger.debug(`Library Parser: Watcher - Watching for changes in ${this.playlistFilePath}`);
    }


    loadPlaylist() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.playlistFilePath, 'utf-8', (err, xmlData) => {
                if (err) {
                    reject(err);
                    return;
                }
    
                xml2js.parseString(xmlData, (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Channel is currently hardcoded
                    const channels = result.PVSPlaylist.array[0].PVSChannel;
                    let playlistNodes = [];
    
                    //we need a better way to merge information
                    //mostly we care about correct indexing, and playBack behaviour
                    //it's possible we need to watch UUIDs :( 
                    if (channels) {
                        channels.forEach(channel => {
                            if (channel.$.channelNumber === this.channelNumber.toString()) {
                                if (channel.array && channel.array[0].PVSPlaylistNode) {
                                    this.playlist = channel.array[0].PVSPlaylistNode.map((node, index) => {
                                        const parsedNode = this.extractAdditionalAttributes(node);
                                        parsedNode.index = index;
                                        parsedNode.isSelected = false;
                                        return parsedNode;
                                    });
                                    playlistNodes = this.playlist;
                                }
                            }
                        });
                    }
    
                    logger.debug("Library Parser: Load Play List - loaded playlist sucessfully")
                    this.libraryUpdate = Date.now();
                });
            });
        });
    }

    extractTimecode(fileName, tag, duration, fps) {
        // Define the regex patterns
        const timecodeFullPattern = new RegExp(`${tag}=([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})`); // hhmmssff
        const timecodeShortPattern = new RegExp(`${tag}=(-?\\d{1,2})\\.([0-9]{2})`); // -m{1,2}.ss
    
        let timecode = {
            hours: 0,
            minutes: 0,
            seconds: 0,
            frames: 0
        };
    
        // Try to match the full pattern (hhmmssff)
        const fullMatch = fileName.match(timecodeFullPattern);
        if (fullMatch) {
            logger.verbose(`PVSLibraryParser: extractTimcode - Full match found: ${fullMatch}`);
            timecode.hours = parseInt(fullMatch[1], 10);
            timecode.minutes = parseInt(fullMatch[2], 10);
            timecode.seconds = parseInt(fullMatch[3], 10);
            timecode.frames = parseInt(fullMatch[4], 10);
            return timecode;
        }
    
        // Try to match the short pattern (m{1,2}.ss or -m{1,2}.ss)
        const shortMatch = fileName.match(timecodeShortPattern);
        if (shortMatch) {
            logger.verbose(`PVSLibraryParser: extractTimcode - Short match found: ${shortMatch}`);
            const isNegative = shortMatch[1].startsWith('-');
            const minutes = parseInt(shortMatch[1], 10);
            const seconds = parseInt(shortMatch[2], 10);
            
            // Calculate the total seconds
            let totalSeconds = minutes * 60 + seconds;
    
            timecode.hours = Math.floor(Math.abs(totalSeconds) / 3600);
            timecode.minutes = Math.floor((Math.abs(totalSeconds) % 3600) / 60);
            timecode.seconds = Math.abs(totalSeconds) % 60;
            timecode.frames = Math.abs(0); // Assuming no frames for short pattern
            
            if (isNegative) {
                logger.verbose("PVSLibraryParser: extractTimcode - Started with negative sign. Subtract operation")
                timecode = operateTimecodes(timecode, duration, 'subtract', fps)
                // timecode.minutes *= -1;
                // timecode.seconds *= -1;
            }
    
            return timecode;
        }
    
        // If no pattern matched, return null or handle accordingly
        logger.verbose(`PVSLibraryParser: extractTimcode - No match found for ${tag}`);
        return {
            hours: 0,
            minutes: 0,
            seconds: 0,
            frames: 0
        };
    }
    
    extractAdditionalAttributes(node) {
        const fileName = node.$.plnSourcePath;

        const duration = this.convertDurationToTimecode(node.$.duration, node.$.fps);
        node.$.duration = duration;
    
        const t1 = this.extractTimecode(fileName, 't1', duration, node.$.fps);
        const t2 = this.extractTimecode(fileName, 't2', duration, node.$.fps);
        const trtMatch = fileName.match(/\[trt=(-?\d+(\.\d+)?)\]/); // run time override
    
        logger.verbose(`PVSLibraryParser: extractAdditional Attributes - Extracted t1: ${t1}, t2: ${t2}, trtMatch: ${trtMatch}`);
    
        if (t1) {
            node.$.t1 = t1;
        }
        if (t2) {
            node.$.t2 = t2;
        }
        if (trtMatch) {
            const trtString = trtMatch[1] + trtMatch[2] + trtMatch[3] + trtMatch[4]; // Combine all groups into one string
            const trtTimecode = {
                hours: parseInt(trtString.substring(0, 2), 10),
                minutes: parseInt(trtString.substring(2, 4), 10),
                seconds: parseInt(trtString.substring(4, 6), 10),
                frames: parseInt(trtString.substring(6, 8), 10)
            };
            node.$.trt = trtTimecode;
        } else {
            //if we don't have a TRT we set it to end of clip time
            node.$.trt = {      
                hours: duration.hours,
                minutes: duration.minutes,
                seconds: duration.seconds,
                frames: duration.frames};
        }

        // Clean plnName to create cleanName
        if (node.$.plnName) {
            node.$.cleanName = node.$.plnName.replace(/\[[^\]]*\]/g, '').trim();
        }
    
        const playbackBehavior = this.parsePlaybackBehavior(node.$.playbackBehavior)
        node.$.playbackBehavior = playbackBehavior;
    
        // Keep only essential attributes and format them as required
        const essentialAttributes = ['UUID', 'plnName', 'cleanName', 'plnSourcePath', 'fps', 'duration', 'playbackBehavior', 'sizeString', 'formatString', 't1', 't2', 'trt'];
        const formattedNode = {};
        essentialAttributes.forEach(attr => {
            if (node.$[attr] !== undefined) {
                formattedNode[attr] = node.$[attr];
            }
        });
    
        formattedNode.index = node.index;
        formattedNode.isSelected = node.isSelected;
    
        return formattedNode;
    }

    convertDurationToTimecode(duration, fps) {
        // Calculate total frames
        let totalFrames = Math.round(duration * fps);
      
        // Calculate hours
        const hours = Math.floor(totalFrames / (fps * 3600));
        totalFrames -= hours * fps * 3600;
      
        // Calculate minutes
        const minutes = Math.floor(totalFrames / (fps * 60));
        totalFrames -= minutes * fps * 60;
      
        // Calculate seconds
        const seconds = Math.floor(totalFrames / fps);
        totalFrames -= seconds * fps;
      
        // Remaining frames
        const frames = Math.floor(totalFrames);
      
        // Return the timecode as an object
        return {
          hours: hours,
          minutes: minutes,
          seconds: seconds,
          frames: frames,
        };
    }

    parsePlaybackBehavior(value) {
        const playbackBehaviors = {
          0: 'STOP',
          1: 'LOOP',
          2: 'NEXT'
        };
      
        return playbackBehaviors[value] || 'UNKNOWN';
    }

    getAllClips(callback) {
        logger.verbose('PVSLibrary Parser (playlist): getAllClips - Return all clips');
        callback(null, this.playlist);
    }

    getClipByName(name, callback) {
        logger.verbose('PVSLibrary Parser (playlist): getClipByName', name);
        callback(null, this.playlist.find(node => node.plnName === name));
    }

    getClipByCleanName(cleanName, callback) {
        logger.verbose('PVSLibrary Parser (playlist): getClipByCleanName', cleanName);
        callback(null, this.playlist.find(node => node.cleanName === cleanName));
    }

    getClipByIndex(index, callback) {
        if (index === -1) {
            logger.verbose('PVSLibrary Parser (playlist): getClipByIndex. Negative Index, get last clip instead', index);
            // Get the last clip
            callback(null, this.playlist[this.playlist.length - 1]);
        } else if (index >= this.playlist.length) {
            // Get the first clip
            logger.debug('PVSLibrary Parser (playlist): getClipByIndex at end. Get first instead');
            callback(null, this.playlist[0]);
        } else {
            // Get the clip at the specified index
            logger.verbose('PVSLibrary Parser (playlist): getClipByIndex', index);
            callback(null, this.playlist[index]);
        }
    }

    selectClip(index) {
        logger.verbose("PVSLibrary Parser (playlist): selectClip as active:", index);
        this.playlist.forEach((node, idx) => {
            node.isSelected = (idx === index);
        });
    }

    setClipTimerByClipName(name, timer, timecode, callback) {
        logger.verbose('PVSLibrary Parser (playlist): setClipTimer for', name);
        const clip = this.playlist.find(node => node.plnName === name);
    
        // Perform additional actions
        if (clip) {
            logger.debug(`PVSLibrary Parser (playlist): setClipTimer for ${clip}. Set clip ${timer} to`, timecode);;
            clip[timer] = timecode; // Dynamically set the property name
        } else {
           logger.error('PVSLibrary Parser (playlist): setClipTimer could not find clip', clip);
        }
    
        // If you need a callback, you can call it here
        callback(null, clip);
    }

    setClipTimerByClipIndex(index, timer, timecode, callback) {
        logger.verbose('PVSLibrary Parser (playlist): setClipTimer for', index);
        const clip = this.playlist[index];
        console.log(JSON.stringify(clip));
        // Perform additional actions
        if (clip) {
            logger.debug(`PVSLibrary Parser (playlist): setClipTimer for ${clip.cleanName}. Set clip ${timer} to ${timecode}`);;
            clip[timer] = timecode; // Dynamically set the property name
             // If you need a callback, you can call it here
            callback(null, clip);
        } else {
           logger.error('PVSLibrary Parser (playlist): setClipTimer could not find clip', clip);
        }
    
       
        
    }

    getLibraryUpdate() {
        return this.libraryUpdate;
    }
    

    getClipSelected(callback) {
        callback(null, this.playlist.find(node => node.isSelected));
    }
}

// // Example usage
// const manager = new PlaylistManager(1); // Set channel number when creating an instance
// manager.loadPlaylist((err, playlistNodes) => {
//     if (err) {
//         console.error(err);
//         return;
//     }

//     console.log(manager.getAllClips()); // Example query to get all clips
//     console.log(manager.getClipByName('A2400')); // Example query by name
//     console.log(manager.getClipByIndex(2)); // Example query by index
//     manager.selectClip(2); // Select clip at index 2
//     console.log(manager.getSelectedClip()); // Get the currently selected clip
// });

module.exports = PVSLibraryParser;