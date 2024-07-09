// utilities.js
function calculateChecksum(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i += 2) {
        sum += parseInt(data.substr(i, 2), 16);
    }
    const checksum = (sum & 0xFF).toString(16).padStart(2, '0').toUpperCase();
    console.log("Calculated checksum: on " + data +" as "+ checksum);
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
    console.log('extended name as ', bcValue)
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
    const possibleFrameRates = [23.976, 24, 25, 29.97, 30, 50, 60];
    const screenRefreshRate = 60;

    const hours = parseInt(timecode.slice(-2), 10);
    const minutes = parseInt(timecode.slice(-4, -2), 10);
    const seconds = parseInt(timecode.slice(-6, -4), 10);
    let frames = parseInt(timecode.slice(0,-6), 10);

    //we're now dealing with a PVP timcode bug
    // The frame rate gets seemingly multiplied by refresh rate * frame rate * min + frames
    // We can infer the frame rate frequenty - but since we can read the frame rate from the library we can pass that in
    if (frameRateOR) {
        console.log('FR override ' + frames);
        frames = Math.round((frames - (hours*60 + minutes)*screenRefreshRate*frameRateOR));
    } else if (frames > 60 && !frameRateOR){
        for (const frameRate of possibleFrameRates) {
            const minFrameValue = (minutes * screenRefreshRate * frameRate);
            const maxFrameValue = minFrameValue + frameRate - 1;

            //console.log("fr " + frameRate + " min " + minFrameValue + " max " + maxFrameValue)
    
            if (frames >= minFrameValue && frames <= maxFrameValue) {
                const trueFrameValue = frames - minFrameValue;
                // console.log({
                //     frameRate: frameRate,
                //     trueFrameValue: trueFrameValue
                // });
                frames = trueFrameValue;
            }
        }
    }

    return { frames, seconds, minutes, hours };
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
    packTimecode
};