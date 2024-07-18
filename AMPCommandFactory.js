// AMPCommandFactory.js
const { calculateLength, packTimecode, asExtendedNameFormat, byteCountHeader } = require('./utilities');
const AMPCommandProto = require('./AMPCommandProto');
const logger = require('./logger');


class CRATCommand extends AMPCommandProto {
    constructor(data = {}, tcpClient) {
        let cmdData = '';
        logger.verbose("Calling CRAT. Connection to " + data)

        if (data && data.channel) {
            cmdData = data.channel;
        }
        super('CRAT', '2', calculateLength(data.channel, 2), tcpClient, cmdData);

        //expects ACK
    }
}

//
class StopCommand extends AMPCommandProto {
    constructor(tcpClient) {
        logger.verbose("Calling stop")
        super('CMDS', '20', '00', tcpClient);

        //expects ACK
    }
}

//PVS AKS's it, but it doesn't do anything
class EjectCommand extends AMPCommandProto {
    constructor(tcpClient) {
        logger.verbose("Calling eject")
        super('CMDS', '20', '0F', tcpClient);

        //expects ack
    }
}

// 2X.10 Play Command - 22.01 if no timecode, 24.01 if timcode -- PVS doesn't respond to timecode
// Returns ACK
class PlayCommand extends AMPCommandProto {
    constructor(data = { timecode: "00000000"}, tcpClient) {
        const cmdType = '2'; //2X - X is cmddata byte count 0 if no timecode data, 4 is includes timecode data
        const cmdCode = '01';
        let cmdData = '';

        //console.log("Play " + data)

        // Determine byte count and command data based on the presence of timecode
        let byteCount = '0';
        if (data.timecode != "00000000") {
            byteCount = '4';
            cmdData = data.timecode;
            logger.verbose("Playing from " + cmdData)
        }

        const fullCmdCode = byteCount + cmdCode;
        logger.verbose("Calling play")
        super('CMDS', cmdType, fullCmdCode, tcpClient, cmdData);

        //expects ack
    }
}

// 40.14 Position at start of media
// 4A.14 just positions anything at SOM regardless of name passed
// It just responds with ACK - which is technically incorrect. But it does give us a requeue command .. sort of.
// We use this to load up new media
class InPresetCommand extends AMPCommandProto {
    constructor(data = {clipname: false}, tcpClient) {
        logger.verbose("Calling InPreset for clip " , data)
       super('CMDS', '4A', '14', tcpClient, byteCountHeader(asExtendedNameFormat(data.clipname)), true); //works
       //super('CMDS', '40', '14', tcpClient, '00000000'); // this is the incorrect command but essentially works
       //super('CMDS', '44', '14', tcpClient, '00010100');
       //super('CMDS', '48', '14', tcpClient, '2020204335303030');
       //super('CMDS', '4E', '14', tcpClient, '00120E0005000101004632353030', false);

       //expects ack
    }

    // notifySuccess(response) {
    //     console.log('Command executed successfully:', response);
    // };
    
    // notifyFailure(error) {
    //     console.error('Command execution failed:', error);
    // };
}

// 24.31 Cue Up with Data \ Timecode
// Returns ACK
// Requires checksum to be disabled to work with PVS
// We use this to cue up timecode
class CueUpCommand extends AMPCommandProto {
    constructor(data = {timecode: false, clipname: false}, tcpClient) {
        logger.verbose("Calling Cue Up")
        const cmdType = '2'; //2X - X is cmddata byte count 0 if no timecode data, 4 is includes timecode data
        let cmdCode = '31';
        let cmdData = '';
        let byteCount = '';

        // if we have neither timecode or clip name
        if (!data.timecode && !data.clipname ){
            logger.verbose('CUE: No name or timecode')
            byteCount = 0;
            // callinga 20.31

            //if we have timecode only
        }  else if (data.timecode && !data.clipname ) {
            logger.verbose('CUE:Timecode only')
            byteCount = 4;
            cmdData = packTimecode(data.timecode);
            
            // we  have a clip name only
        } else if (!data.timecode && data.clipname) {
            logger.verbose('CUE: Name only')
            byteCount = 8;
            cmdData = data.clipname; // we need to insert a function to convvert the clip name

            //if we have both timecode and clip name
        } else if (data.timecode  && data.clipname ) {
            logger.verbose('CUE: Both name and timecode')
            byteCount = 'C';
            cmdData = packTimecode(data.timecode) + data.clipname;
        }


        const fullCmdCode = byteCount + cmdCode;
        logger.verbose("Calling fast forward type " + data.mode)
        super('CMDS', cmdType, fullCmdCode, tcpClient, cmdData, true);
    }
}

////////// PLAYLIST COMMANDS //////////////

// A0.26 ID Count Requet
// Returns 82.26 - with 2 byte data count followed by the number IDs. -- works
class IDCountRequestCommand extends AMPCommandProto {
    constructor(tcpClient) {
        super('CMDS', 'A0', '26', tcpClient);
    }
}

// A2.14 List first ID - note: the 00 in the data field is needed for the A2 varients for extended name format as per the doc
// Returns 8A.14 if clips are returned -- works
// Returns 80.14 if no clips are returned
class ListFirstIDCommand extends AMPCommandProto {
    constructor(tcpClient) {
        logger.verbose("Playlist: requesting first clip")
        super('CMDS', 'A2', '14', tcpClient, '00');

        this.expectedResponse = '8a14';
        this.expectedDataType = 'extendedNameFormat';
    }
}

// A1.15 List Next ID - where clips is the maximum number of clips to return in a single response (may require multiple response)
// Returns 80.14 if no more clips are to be listed
// Returns 8A.14 if single or multiple clips are listed // It seems like if you send nothing you get them all back -- works
class ListNextIDCommand extends AMPCommandProto {
    constructor(data = {clipreq: ''}, tcpClient) {
        console.log("Playlist: requesting next clip")
        let clips = '';

        if (data && data.clipreq) {
            logger.verbose('clipreq is ' + data.clipreq)
            clips = data.clipreq
        } 

        super('CMDS', 'A1', '15', tcpClient, clips);

        this.expectedResponse = '8a14';
        this.expectedDataType = 'extendedNameFormat';
    }
}

//A0.16 ID Loaded Request
//Return 82.1X (80.16 means no clip) in extended format - Works
class IDLoadedRequestCommand extends AMPCommandProto {
    constructor(tcpClient) {
        logger.verbose("Playlist: requesting current clip")

        super('CMDS', 'A0', '16', tcpClient);

        this.expectedResponse = '8216';
        this.expectedDataType = 'extendedNameFormat';

    }
}


///////// STATUS COMMANDS //////////////////

//A0.2C Device name request
// 82.2C -- returns extendedish name format - Returns 'ProVideoServer'
class DeviceNameRequestCommand extends AMPCommandProto {
    constructor(tcpClient) {
        super('CMDS', 'A0', '2C', tcpClient);
    }
}

// Current Time Sense - works in channeled CRAT mode and single channel mode
class CurrentTimeSenseCommand extends AMPCommandProto {
    constructor(tcpClient) {
        logger.verbose("Current time sense")
        super('CMDS', '61', '0C', tcpClient, '01');
        
        this.expectedResponse = '7404';
        this.expectedDataType = 'pvptimecode';
        this.checksumDisable = true;
    }

    pack() {
        //for some reason we need this code fixed as 610C01 - so we'll ditch the checksum to pull that off
        //or we could just send it as a fixed string CMDS0006610C01
        const charLength = calculateLength(this.cmdType + this.cmdCode + this.data, 4);
        let dataPack = this.cmdWrap + charLength + this.cmdType + this.cmdCode + this.data;
        //const checksum = calculateChecksum(this.cmdType + this.cmdCode + this.data);
        logger.verbose("packed as " + "WRAP " + this.cmdWrap + " BC " + charLength + " TYPE " + this.cmdType + " CODE " +this.cmdCode + " DATA " + this.data )
        //dataPack += checksum;
        return dataPack;
    }
}

class AMPCommandFactory {
    static createCommand(type, data, tcpClient) {
        switch (type) {
            case 'CRAT':
                return new CRATCommand(data, tcpClient);
            case 'cueUpData':
                return new CueUpCommand(data, tcpClient);
            case 'stop':
                return new StopCommand(tcpClient);
            case 'eject':
                return new EjectCommand(tcpClient);
            case 'play':
                return new PlayCommand(data, tcpClient);
            case 'inPreset':
                return new InPresetCommand(data, tcpClient);
            case 'currentTimeSense':
                return new CurrentTimeSenseCommand(tcpClient);
            case 'count':
                return new IDCountRequestCommand(tcpClient);
            case 'listFirst':
                return new ListFirstIDCommand(tcpClient);
            case 'listNext':
                return new ListNextIDCommand(data, tcpClient);
            case 'idLoadedRequest':
                return new IDLoadedRequestCommand(tcpClient);
            case 'deviceNameRequest':
                return new DeviceNameRequestCommand(tcpClient);
            // case 'cueClip':
            //     return new CueClipCommand(data, tcpClient);
            // case 'deviceIdRequest':
            //     return new DeviceIDRequestCommand(tcpClient);
            // case 'deviceTypeRequest':
            //     return new DeviceTypeRequestCommand(tcpClient);
            // case 'forward':
            //     return new ForwardCommand(data, tcpClient);
            // case 'rewind':
            //     return new RewindCommand(data, tcpClient);
            // case 'setLoopMode':
            //      return new SetLoopPlaybackModeCommand(tcpClient);
            // case 'idDurationRequest':
            //     return new IDDurationRequestCommand(tcpClient);
            // case 'idStatusRequest':
            //     return new IDStatusRequestCommand(data, tcpClient);
            // case 'currentStatusSense':
            //     return new CurrentStatusSenseCommand(tcpClient);
            default:
                throw new Error(`Unknown command type: ${type}`);
        }
    }
}

module.exports = AMPCommandFactory;


// //A0.21 Device ID request
// // 82.21
// // Currently returns NAC
// class DeviceIDRequestCommand extends AMPCommandProto {
//     constructor(tcpClient) {
//         super('CMDS', 'A0', '21', tcpClient);
//     }
// }

// //A0.11 Device Type request
// // 12.11
// // Currently returns  f33f with no realy checksum (unless it's 3f). Meaningless but doesn't really matter
// class DeviceTypeRequestCommand extends AMPCommandProto {
//     constructor(tcpClient) {
//         super('CMDS', '00', '11', tcpClient);
//     }
// }

// //Seemingly doesn't pass anything useful unforuantely
// class CurrentStatusSenseCommand extends AMPCommandProto {
//     constructor(tcpClient) {
//         super('CMDS', '61', '20', tcpClient, '62');
//     }
// }


// //AX.18 ID Status Request x=8 is name format x=A is extended format
// //Returns a single byte with status
// //Seemingly responds with NAC
// class IDStatusRequestCommand extends AMPCommandProto {
//     constructor(data = {clipname: ''}, tcpClient) {
//         console.log("Playlist: requesting next clip")
//         let clipname = data.clipname || '000800054132343030';

//         if (data.clipname) {
//             console.log('clipname is ' + data.clipname)
//         } 

//         super('CMDS', 'A8', '18', tcpClient, clipname);
//     }
// }

// //A2.17 ID Duration Request: BC of bytes to floow + clip name in extended format
// // Returns 84.17 \ 80.17 if no clip found -- returns 4 byte cimede
// // Doesn't seem to work. Always returns an empty timecode
// class IDDurationRequestCommand extends AMPCommandProto {
//     constructor(tcpClient) {
//         console.log("Playlist: requesting current clip")

//         super('CMDS', 'A4', '17', tcpClient, '000900054132343030');
//     }
// }

// // PVS only supports the fast forward command... but probably best not to use
// class ForwardCommand extends AMPCommandProto {
//     constructor(data = {mode: 'fast', speed: '74'}, tcpClient){
//         const cmdType = '2'; //2X - X is cmddata byte count 0 if no timecode data, 4 is includes timecode data
//         let cmdCode = '10';
//         let cmdData = '';
//         let byteCount = '';

//         switch (data.mode) {
//             case 'fast':
//                 console.log('Factory: fast forward');
//                 byteCount = 0;
//                 cmdCode = '10';
//                 break;
//             case 'jog':
//                 console.log('Factory: jog forward')
//                 byteCount = 1;
//                 cmdCode = '11';
//                 cmdData = data.speed;
//                 break;
//             case 'variable':
//                 console.log('Factory: variable forward')
//                 byteCount = 1;
//                 cmdCode = '12';
//                 cmdData = data.speed;
//                 break;
//             case 'shuttle':
//                 console.log('Factory: shuttle')
//                 byteCount = 1
//                 cmdCode = '13';
//                 cmdData = data.speed;
//                 break;

//         }


//         const fullCmdCode = byteCount + cmdCode;
//         console.log("Calling fast forward type " + data.mode)
//         super('CMDS', cmdType, fullCmdCode, tcpClient, cmdData);
//     }

// }

// //PVS only support 'rewind' .. but not properly .. best not to use
// class RewindCommand extends AMPCommandProto {
//     constructor(data = {mode: 'rewind', speed: '74'}, tcpClient){
//         const cmdType = '2'; //2X - X is cmddata byte count 0 if no timecode data, 4 is includes timecode data
//         let cmdCode = '20';
//         let cmdData = '';
//         let byteCount = '';

//         switch (data.mode) {
//             case 'rewind':
//                 console.log('Factory: fast forward');
//                 byteCount = 0;
//                 cmdCode = '10';
//                 break;
//             case 'jog':
//                 console.log('Factory: jog forward')
//                 byteCount = 1;
//                 cmdCode = '11';
//                 cmdData = data.speed;
//                 break;
//             case 'variable':
//                 console.log('Factory: variable forward')
//                 byteCount = 1;
//                 cmdCode = '12';
//                 cmdData = data.speed;
//                 break;
//             case 'shuttle':
//                 console.log('Factory: shuttle')
//                 byteCount = 1
//                 cmdCode = '13';
//                 cmdData = data.speed;
//                 break;

//         }

//         const fullCmdCode = byteCount + cmdCode;
//         console.log("Calling fast forward type " + data.mode)
//         super('CMDS', cmdType, fullCmdCode, tcpClient, cmdData);
//     }   
// }


// //41.42 Set Loop Playback Mode
// // Returns ACK, but doesn't do anything
// class SetLoopPlaybackModeCommand extends AMPCommandProto {
//     constructor(tcpClient) {
//         console.log("Calling eject")
//         super('CMDS', '41', '42', tcpClient, '01');
//     }
// }

// class CueClipCommand extends AMPCommandProto {
//     constructor(data, tcpClient) {
//         super('CRAT', '2', calculateLength(data.channel, 2), tcpClient, data.channel);
//     }
// }