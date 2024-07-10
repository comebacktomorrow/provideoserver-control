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

    extractAdditionalAttributes(node) {
        const plnSourcePath = node.$.plnSourcePath;
        const fileName = path.basename(plnSourcePath);

        const t1Match = fileName.match(/\[t1=([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})\]/); // timer 1 in timecode
        const t2Match = fileName.match(/\[t2=([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})\]/); // timer 2 in timecode
        const trtMatch = fileName.match(/\[trt=(-?\d+(\.\d+)?)\]/); // run time override

        if (t1Match) {
            node.$.t1 = `${t1Match[1]}:${t1Match[2]}:${t1Match[3]}:${t1Match[4]}`;
        }
        if (t2Match) {
            node.$.t2 = `${t2Match[1]}:${t2Match[2]}:${t2Match[3]}:${t2Match[4]}`;
        }
        if (trtMatch) {
            const trtValue = parseFloat(trtMatch[1]);
            const duration = parseFloat(node.$.duration);
            node.$.trt = trtValue < 0 ? duration + trtValue : trtValue;
        }

        // Keep only essential attributes and format them as required
        const essentialAttributes = ['UUID', 'plnName', 'plnSourcePath', 'fps', 'duration', 'playbackBehavior', 'sizeString', 'formatString', 't1', 't2', 'trt'];
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

    getAllClips(callback) {
        console.log('Playlist: Return all clips')
       //console.log(this.playlist)
        callback(null, this.playlist);
    }

    getClipByName(name, callback) {
        console.log('Playlist: Get clip name', name);
        callback(null, this.playlist.find(node => node.plnName === name));
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