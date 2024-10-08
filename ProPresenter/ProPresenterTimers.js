const http = require('http');
const logger = require('../logger');
        let previousState = null;
        let previousTimecode = null;
        let previousClipName = null;
        let previousLibraryTimestamp = null;
        let forceUpdate = false;
        let connectionStatus = 'not connected'
        const SPECIFIC_TIMER_NAMES = ['PVS Time Remaining', 'PVS Timer 1', 'PVS Timer 2', 'PVS TRT']; // Replace with the 

        const TIMER_MAPPING = {
            'remaining': 'PVS Time Remaining',
            't1': 'PVS Timer 1',
            't2': 'PVS Timer 2',
            'trt': 'PVS TRT'
            // Add more mappings as needed
        };


function fetchTimers(PRO_PRESENTER_IP, PRO_PRESENTER_PORT) {
    const TIMER_URL = `http://${PRO_PRESENTER_IP}:${PRO_PRESENTER_PORT}/v1/timers?chunked=false`;

    return new Promise((resolve, reject) => {
        http.get(TIMER_URL, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        }).on("error", (err) => {
            reject(err);
        });
    });
}

// this is the code that actually updates the value .. this might not be so important any more
// data req.write(data) is the data to  be written
// the function is called from updateAllTimers.

// this should need to change a little bit. We will now only need to update timers on clip change? maybe? 
//**Does ProPresenter seperate preset time from the actual count time?**

function updateTimer(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, timer) {
    const { name } = timer.id;
    const encodedName = encodeURIComponent(name);
    const data = JSON.stringify(timer);

    const options = {
        hostname: PRO_PRESENTER_IP,
        port: PRO_PRESENTER_PORT,
        path: `/v1/timer/${encodedName}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let response = '';

            res.on('data', (chunk) => {
                response += chunk;
            });

            res.on('end', () => {
                resolve(response);
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

function resetTimer(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, timer) {
    const { name } = timer.id;
    const encodedName = encodeURIComponent(name);
    const data = '';

    const options = {
        hostname: PRO_PRESENTER_IP,
        port: PRO_PRESENTER_PORT,
        path: `/v1/timer/${encodedName}/reset`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let response = '';

            res.on('data', (chunk) => {
                response += chunk;
            });

            res.on('end', () => {
                resolve(response);
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

function updateSpecificTimer(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, name, duration, allowsOverrun) {
    return fetchTimers(PRO_PRESENTER_IP, PRO_PRESENTER_PORT).then(timers => {
        const timer = timers.find(timer => timer.id.name === name);
        if (timer) {
            const updatedTimer = {
                ...timer,
                allows_overrun: allowsOverrun,
                countdown: {
                    duration: duration,
                },
            };

            return updateTimer(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, updatedTimer)
                .then(() => logger.verbose(`Successfully updated timer: ${name}`))
                .catch((error) => logger.error(`Error updating timer ${name}:`, error));
        } else {
            logger.error(`Timer with name ${name} not found.`);
        }
    }).catch(error => {
        logger.error('Error fetching timers:', error);
    });
}

function timecodeToSeconds(time){
    return (3600 *time.hours) + (60 * time.minutes) + (time.seconds);
}


// this is what is called every second from index.js 
// we can get the preset duration via http://localhost:50050/v1/timer/2 (using id)
// the current remaining time is returned via http://localhost:50050/v1/timers/current

// in theory:
// 1) we want to check if the clip name has changed, and if so, update the time values
// 2) watch the play state .. if the play state has changed, we want it to reflect that
// 3) watch the timer value .. athough, if the timer value gets too far out of sync, we can't really do anything. Maybe just give a warning.
// ++ We'll have to think about what we do with seeking timers.


async function updateAllTimers(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, controller) {
    try {
        // Example of fetching information from the controller
        const state = controller.getTransportState();
        const timecode = controller.getCurrentTransportTime();
        const clipName = controller.getLoadedNameClip();
        const libraryTimestamp = controller.getLibraryTimestamp();
        const clocks = controller.getCurrentClocks();

        //const remainingTimeT1 = timecodeToSeconds(clocks.remaining);




        // Check if any data has changed
        const hasChanged = (
            JSON.stringify(timecode) !== JSON.stringify(previousTimecode) ||
            clipName !== previousClipName ||
            libraryTimestamp !== previousLibraryTimestamp
        );

        if (hasChanged) {
            // Logic to update all timers based on controller data
            const timers = await fetchTimers(PRO_PRESENTER_IP, PRO_PRESENTER_PORT);
            if (connectionStatus != 'Connected'){
                logger.info('Connected to ProPresenter');
                connectionStatus ='Connected';
            }
            
            timers.forEach(timer => {
                if (SPECIFIC_TIMER_NAMES.includes(timer.id.name) && timer.countdown) {
                    // Use the internal name/ID to get the remaining time from the controller
                    const internalName = Object.keys(TIMER_MAPPING).find(key => TIMER_MAPPING[key] === timer.id.name);
                    let remainingTime = timecodeToSeconds(controller.clocks[internalName]);

                    // if we're not playing, we're set to zero, or if the value is negative
                    if (state != "PLAYING" || controller.clocks[internalName].negative){
                        remainingTime = 0;
                    }

                    //if the thing we're comparing has a different value than time remaining, and is not time remaining
                    if (remainingTime == timecodeToSeconds(timecode) && internalName != 'remaining'){
                        remainingTime =0;
                    }

                    const updatedTimer = {
                        ...timer,
                        countdown: {
                            duration: remainingTime,
                        },
                    };

                    updateTimer(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, updatedTimer)
                        .then(() => logger.verbose(`Successfully updated timer: ${timer.id.name}`))
                        .catch((error) => logger.error(`Error updating timer ${timer.id.name}:`, error));

                    setTimeout(() => {
                        resetTimer(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, updatedTimer)
                        .then(() => logger.verbose(`Successfully reset timer to update time: ${timer.id.name}`))
                        .catch((error) => logger.error(`Error resetting timer ${timer.id.name}:`, error));
                        }, 900);
                   
                }
            });

            // Update previous values
            previousState = state;
            previousTimecode = timecode;
            previousClipName = clipName;
            previousLibraryTimestamp = libraryTimestamp;
        }
    } catch (error) {
        
        if (connectionStatus != 'error'){
            logger.error('Error connecting to ProPresenter timers:');
            connectionStatus ='error';
        }
            
    }
}

module.exports = {
    fetchTimers,
    updateSpecificTimer,
    updateAllTimers,
};