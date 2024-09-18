const logger = require('../logger');
const net = require('net');

let connectionState = null;

const TIMER_NAMES = [
    'remaining',
    't1',
    't2',
    'trt'
];      

function sendTCPTime(time, TCP_HOST, TCP_PORT) {
    // Create a TCP client
    const client = new net.Socket();

    // Connect to the TCP server
    client.connect(TCP_PORT, TCP_HOST, () => {
        // Send the time to the TCP server
        client.write(time.toString(), () => {
            if (connectionState !== 'connected'){
                logger.info('RAW TCP sending to ' + TCP_HOST + ":" + TCP_PORT)
            }
            connectionState = 'connected'
            logger.verbose('Data sent to TCP server:', time);
            client.end();
        });
    });

    // Handle errors
    client.on('error', (err) => {
        
        if (connectionState !== 'error'){
            logger.error('RAW TCP client error:', err);
            
        }
        connectionState = 'error';
    });

    // Handle client close
    client.on('close', () => {
        //console.log('TCP connection closed');
    });
}

// controller is model, timer is the name of the timer we lock to .. auto follows next LTP (lowest takes precedence?) and none is the same as TRT
async function updateTCPTimer(controller, timer_ip_address, timer_port, timer_select) {

    let remainingTimes = [];

    //filter out what values we don't care for based on the data loaded from the config file
    const filteredTimerNames = TIMER_NAMES.filter(timer => timer_select[timer]);
    
    filteredTimerNames.forEach(timer => {
        let remainingTime = timecodeToSeconds(controller.clocks[timer]);
        remainingTimes.push(remainingTime);
    });

    // Remove zero values
    remainingTimes = remainingTimes.filter(time => time !== 0);

    // If filtering removed all values, set remainingTimes back to the original array
    if (remainingTimes.length === 0) {
        remainingTimes = [0]; // If all values get filtered out, we still want a zero
    }
    
    //send time to socket function
    if (timer_ip_address){
        sendTCPTime(parseInt(Math.min(...remainingTimes), 10), timer_ip_address, timer_port);
    }
    
}

function timecodeToSeconds(time) {
    if (time.negative) {
        return 0;
    }
    return (3600 * time.hours) + (60 * time.minutes) + (time.seconds);
}

module.exports = {
    updateTCPTimer
};