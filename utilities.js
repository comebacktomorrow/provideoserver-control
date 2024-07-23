// utilities.js
const logger = require('./logger');

function calculateChecksum(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i += 2) {
        sum += parseInt(data.substr(i, 2), 16);
    }
    const checksum = (sum & 0xFF).toString(16).padStart(2, '0').toUpperCase();
    //console.log("Calculated checksum: on " + data +" as "+ checksum);
    return checksum;
}

function calculateLength(data, places = 1) {
    let length = data.length.toString();
    while (length.length < places) {
        length = '0' + length;
    }
    return length;
}

const asNameFormat = (data, bytes = 8) => {
    const dataAsHex = Buffer.from(data).toString('hex');
    const dataPad = dataAsHex.length;
    const paddedString = "2020202020202020";
    const paddedData = dataAsHex + paddedString.substring(0, paddedString.length - dataPad);
    return paddedData;
};

const asExtendedNameFormat = (data, timecode = "") => {
    const dataAsHex = Buffer.from(data).toString('hex');
    let bcValue = (dataAsHex.length / 2).toString(16).padStart(4, '0');
    logger.raw('extended name as ', bcValue)
    return bcValue + dataAsHex;
};

//wrap
const byteCountHeader = (data) => {
    const bcValue = (data.length / 2).toString(16).padStart(4, '0');
    return bcValue + data;
};

function packTimecode(timecodeObj) {
    const frames = timecodeObj.frames.toString().padStart(2, '0');
    const seconds = timecodeObj.seconds.toString().padStart(2, '0');
    const minutes = timecodeObj.minutes.toString().padStart(2, '0');
    const hours = timecodeObj.hours.toString().padStart(2, '0');

    return frames + seconds + minutes + hours;
}

function unpackRawTimecode(timecode, frameRateOR = null) {
    const possibleFrameRates = [23.976024, 24, 25, 29.97, 30, 50, 59.940060 , 60];
    let screenRefreshRate = 60;

    const hours = parseInt(timecode.slice(-2), 10);
    const minutes = parseInt(timecode.slice(-4, -2), 10);
    const seconds = parseInt(timecode.slice(-6, -4), 10);
    let frames = parseInt(timecode.slice(0,-6), 10);

    if (hours > 0) {
        screenRefreshRate = 1; // if the bug changes at the one hour mark
    }

    // Handling timecode bug: frame rate gets seemingly multiplied by refresh rate * frame rate * min + frames
    // Adjust frames if a frame rate is provided
    // Or it could just be multipled by seconds?
    if (frameRateOR) {
        //console.log('##############################FR override ' + frames);
        frames = Math.round((frames - (hours * 3600 + minutes * 60) * screenRefreshRate * frameRateOR));
    } else if (frames > 60 && !frameRateOR){
        for (const frameRate of possibleFrameRates) {
            let minFrameValue = Math.floor((minutes * screenRefreshRate * frameRate));
            if (hours > 0 ){ 
                minFrameValue = (((hours* 3600) + minutes * 60) * screenRefreshRate * frameRate);
            }
            const maxFrameValue = minFrameValue + frameRate - 1;
            //console.log("########################NO FR OR fr " + frameRate + " min " + minFrameValue + " max " + maxFrameValue + " actual " + frames);
            if (frames >= minFrameValue && frames <= maxFrameValue) {
                const trueFrameValue = frames - minFrameValue;
                
                frames = Math.round(trueFrameValue);
            } 
        }
    }
    logger.verbose('decoded frame as ' + timecode + " frame set to " + frames)

    if (frames.toString().length > 2) {
      logger.warn('UTIL: currentTimeSense - frames value is longer than two digits ' + frames);
  }

    return { timecode: { frames, seconds, minutes, hours } };
}

//Note we assume TC1 is the modifying timecode and TC2 is the track timecode
function operateTimecodes(tc1, tc2, operation, frameRate = 0) {
    let frames = 0,
      seconds,
      minutes,
      hours,
      negative = false;
  
    if (operation === 'add') {
      frames = tc1.frames + tc2.frames;
      seconds = tc1.seconds + tc2.seconds;
      minutes = tc1.minutes + tc2.minutes;
      hours = tc1.hours + tc2.hours;
  
      if (frameRate > 0) {
        seconds += Math.floor(frames / frameRate);
        frames = frames % frameRate;
      }
  
      minutes += Math.floor(seconds / 60);
      seconds = seconds % 60;
  
      hours += Math.floor(minutes / 60);
      minutes = minutes % 60;
    } else if (operation === 'subtract') {
      // Ensure tc1 is the smaller timecode and tc2 is the larger timecode
      if (compareTimecodes(tc1, tc2) > 0) {
        const temp = tc1;
        tc1 = tc2;
        tc2 = temp;
        negative = true; // Mark as negative since we swapped tc1 and tc2
      }
  
      frames = tc2.frames - tc1.frames;
      seconds = tc2.seconds - tc1.seconds;
      minutes = tc2.minutes - tc1.minutes;
      hours = tc2.hours - tc1.hours;
  
      if (frameRate > 0 && frames < 0) {
        frames = ((frames % frameRate) + frameRate) % frameRate;
        seconds -= 1;
      }

      frames = Math.abs(frames);
  
      if (seconds < 0) {
        seconds += 60;
        minutes -= 1;
      }
  
      if (minutes < 0) {
        minutes += 60;
        hours -= 1;
      }
  
      if (hours < 0) {
        hours = 0; // Reset hours to 0 if negative (optional)
        negative = true; // Mark as negative
      }
    } else {
      throw new Error("Invalid operation. Use 'add' or 'subtract'.");
    }
  
    return {
      hours: hours,
      minutes: minutes,
      seconds: seconds,
      frames: frames,
      negative: negative,
    };
  }
  
  // Function to compare two timecodes
  function compareTimecodes(tc1, tc2) {
    if (tc1.hours !== tc2.hours) return tc1.hours - tc2.hours;
    if (tc1.minutes !== tc2.minutes) return tc1.minutes - tc2.minutes;
    if (tc1.seconds !== tc2.seconds) return tc1.seconds - tc2.seconds;
    return tc1.frames - tc2.frames;
  }

function timecodeToFrames(timecode, frameRate) {
    const { hours, minutes, seconds, frames } = timecode;
    const totalFrames = (
      (hours * 3600 + minutes * 60 + seconds) * frameRate + frames
    );
    return totalFrames;
  }

  function framesToTimecode(totalFrames, frameRate) {
    const frames = totalFrames % frameRate;
    const totalSeconds = Math.floor(totalFrames / frameRate);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
  
    return { hours, minutes, seconds, frames };
  }

  function secondsToTimecode(sec) {
    let seconds = Math.abs(sec);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
  
    return {
      hours: hours,
      minutes: minutes,
      seconds: secs,
      frames: 0, // Set frames to zero as specified
    };
  }

function unpackExtendedNameFormat(data) {
    let offset = 0;
    const fileNames = [];
  
    // Extract the total byte count (assuming 4 characters, representing 2 bytes in hex)
    const totalByteCount = parseInt(data.slice(offset, offset + 4), 16);
    offset += 4;
  
    while (offset < totalByteCount + 4) {
      // Extract the name byte count (assuming 4 characters, representing 2 bytes in hex)
      const nameByteCount = parseInt(data.slice(offset, offset + 4), 16);
      offset += 4;
      const nameHex = data.slice(offset, offset + nameByteCount * 2); // Hex string
      const fileName = Buffer.from(nameHex, 'hex').toString('ascii');
      offset += nameByteCount * 2;
      fileNames.push(fileName);
    }
  
    return fileNames;
  }


const asHex = (data) => {
    return Buffer.from(data).toString('hex');
};

function packData(CMD_WRAP, CMD_TYPE, CMD_CODE, DATA = '') {
    let charLength = CMD_TYPE + CMD_CODE + DATA;
    charLength = calculateLength(charLength, 4);
    let dataPack = CMD_WRAP + charLength + CMD_TYPE + CMD_CODE + DATA;
    const checksum = calculateChecksum(CMD_TYPE + CMD_CODE + DATA);
    dataPack += checksum;
    return dataPack;
}

function unpackData(data) {
    // Define known response types
    const RESPONSE_TYPES = {
        '1001': 'ACK',
        '1112': 'NAC'
    };

    const CMD_WRAP = data.slice(0, 4);
    //const LENGTH = data.slice(4, 8);
    const CMD_TYPE = data.slice(0, 2);
    const CMD_CODE = data.slice(2, 4);
    const DATA = data.slice(4, -2);
    const CHECKSUM = data.slice(-2);

    // Determine if the response is a simple ACK/NAC/ERR
    if (CMD_WRAP in RESPONSE_TYPES) {
        return {
            responseType: RESPONSE_TYPES[CMD_WRAP],
            data: CMD_WRAP
        };
    }

    const isValidChecksum = calculateChecksum(data.slice(0, -2)) === CHECKSUM.toUpperCase();

    return {
        cmdWrap: CMD_WRAP,
        cmdType: CMD_TYPE,
        cmdCode: CMD_CODE,
        data: DATA,
        checksum: CHECKSUM,
        isValidChecksum: isValidChecksum
    };
}

function splitDataIntoPackets(data) {
    // Implement logic to split data into packets based on protocol
    return [data]; // Placeholder
}

module.exports = {
    calculateChecksum,
    calculateLength,
    asNameFormat,
    asExtendedNameFormat,
    asHex,
    byteCountHeader,
    packData,
    unpackData,
    splitDataIntoPackets,
    unpackExtendedNameFormat,
    unpackRawTimecode,
    packTimecode,
    operateTimecodes,
    timecodeToFrames,
    framesToTimecode,
    secondsToTimecode
};