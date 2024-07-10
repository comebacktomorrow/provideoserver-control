//PVSLibraryParser.js
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

class PVSLibraryParser {
    constructor(channelNumber) {
        this.channelNumber = channelNumber;
        this.homeDirectory = process.env.HOME || process.env.USERPROFILE;
        this.playlistFilePath = path.join(this.homeDirectory, 'Documents/ProVideoServer.pvs3');
        this.playlist = [];
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
    
                    const channels = result.PVSPlaylist.array[0].PVSChannel;
                    let playlistNodes = [];
    
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
    
                    console.log("loaded playlist")
                    resolve(playlistNodes);
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
            console.log(`Full match found: ${fullMatch}`);
            timecode.hours = parseInt(fullMatch[1], 10);
            timecode.minutes = parseInt(fullMatch[2], 10);
            timecode.seconds = parseInt(fullMatch[3], 10);
            timecode.frames = parseInt(fullMatch[4], 10);
            return timecode;
        }
    
        // Try to match the short pattern (m{1,2}.ss or -m{1,2}.ss)
        const shortMatch = fileName.match(timecodeShortPattern);
        if (shortMatch) {
            console.log(`Short match found: ${shortMatch}`);
            const isNegative = shortMatch[1].startsWith('-');
            const minutes = parseInt(shortMatch[1], 10);
            const seconds = parseInt(shortMatch[2], 10);
            
            // Calculate the total seconds
            let totalSeconds = minutes * 60 + seconds;
    
            timecode.hours = Math.floor(Math.abs(totalSeconds) / 3600);
            timecode.minutes = Math.floor((Math.abs(totalSeconds) % 3600) / 60);
            timecode.seconds = Math.abs(totalSeconds) % 60;
            timecode.frames = 0; // Assuming no frames for short pattern
            
            if (isNegative) {
                console.log("Negative fime found")
                timecode = operateTimecodes(timecode, duration, 'subtract', fps)
                // timecode.minutes *= -1;
                // timecode.seconds *= -1;
            }
    
            return timecode;
        }
    
        // If no pattern matched, return null or handle accordingly
        console.log(`No match found for ${tag}`);
        return [];
    }
    
    extractAdditionalAttributes(node) {
        const fileName = node.$.plnSourcePath;

        const duration = this.convertDurationToTimecode(node.$.duration, node.$.fps);
        node.$.duration = duration;
    
        const t1 = this.extractTimecode(fileName, 't1', duration, node.$.fps);
        const t2 = this.extractTimecode(fileName, 't2', duration, node.$.fps);
        const trtMatch = fileName.match(/\[trt=(-?\d+(\.\d+)?)\]/); // run time override
    
        console.log(`Extracted t1: ${t1}, t2: ${t2}, trtMatch: ${trtMatch}`);
    
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
            node.$.trt = [];
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
        console.log('Playlist: Return all clips');
        callback(null, this.playlist);
    }

    getClipByName(name, callback) {
        console.log('Playlist: Get clip name', name);
        callback(null, this.playlist.find(node => node.plnName === name));
    }

    getClipByCleanName(cleanName, callback) {
        console.log('Playlist: Get clip name', cleanName);
        callback(null, this.playlist.find(node => node.cleanName === cleanName));
    }

    getClipByIndex(index, callback) {
        console.log('Playlist: Get clip index', index);
        if (index === -1) {
            // Get the last clip
            callback(null, this.playlist[this.playlist.length - 1]);
        } else if (index >= this.playlist.length) {
            // Get the first clip
            console.log('get first clip');
            callback(null, this.playlist[0]);
        } else {
            // Get the clip at the specified index
            callback(null, this.playlist[index]);
        }
    }

    selectClip(index) {
        console.log("Playlist: setting active index to:", index);
        this.playlist.forEach((node, idx) => {
            node.isSelected = (idx === index);
        });
    }

    setClipTimer(name, timer, timecode, callback) {
        console.log('Playlist: Get clip name', name);
        const clip = this.playlist.find(node => node.plnName === name);
    
        // Perform additional actions
        if (clip) {
            console.log('Clip found:', clip);
            clip[timer] = timecode; // Dynamically set the property name
            console.log(`Set ${timer} to`, timecode);
        } else {
            console.log('Clip not found');
        }
    
        // If you need a callback, you can call it here
        callback(null, clip);
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