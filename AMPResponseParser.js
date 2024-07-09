//AMPResponseParser.js
const { unpackRawTimecode, unpackExtendedNameFormat } = require('./utilities');
class AMPResponseParser {
    static parse(responseData, expectedData) {
        const response = {};
        // Validate checksum (simple example, you'll need to replace this with your actual checksum validation logic)

        if (responseData) {
            response.data = responseData.data;
            response.isValidChecksum =responseData.isValidChecksum;
            response.responseType = responseData.cmdType;
            response.responseCode = responseData.cmdCode;

            response.expectedResponse = expectedData.response;
            response.expectedType = expectedData.type;

            response.combinedCode =  responseData.cmdType + responseData.cmdCode;

            //console.log('RP: ' + JSON.stringify(response));
            //console.log('RP expects' + JSON.stringify(response));
        }

        //probably should use a case here to act on expected data type

        switch(response.expectedResponse){
            case 'ACK':
                if (response.data == '1001'){
                    response.responseType = 'ACK';
                    
                }
                break;
            case '7404':
                console.log('RP: 74.04 Handle timecode');
                response.data = unpackRawTimecode(response.data); //we also need a unpack messy timecode as well
                break;
            case '8216':
                console.log('RP: 82.16 extended name format')
                response.data = unpackExtendedNameFormat(response.data);
                break;
            case '8a14':
                console.log('RP: 8A.14 extended name format')
                if (response.combinedCode == '8014') {
                    //no clips to return
                } else if (response.combinedCode == '8a14') {
                    // return first clip
                    response.data = unpackExtendedNameFormat(response.data);
                }
                break;
            default:
                console.log('RP: No method for parsing data response code');
        }
            
        
        

        // // Set parsed components if the response contains extended data
        // if (response.responseType === '8216') {
        //     const nameLength = parseInt(response.data.slice(4, 8), 16);
        //     response.clipName = Buffer.from(response.data.slice(8, 8 + nameLength * 2), 'hex').toString('ascii');
        // } else if (response.responseType === '80') {
        //     // Handle specific response types
        // }

        console.log("RP sending: " + JSON.stringify(response))
        return response;
    }
}

module.exports = AMPResponseParser;