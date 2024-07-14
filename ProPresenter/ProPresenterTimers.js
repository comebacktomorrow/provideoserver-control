const http = require('http');
        let previousState = null;
        let previousTimecode = null;
        let previousClipName = null;
        let previousLibraryTimestamp = null;
        let forceUpdate = false;
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

function updateTimer(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, timer) {
    const { name } = timer.id;
    const encodedName = encodeURIComponent(name);
    const data = JSON.stringify(timer);

    console.log("Sending data : " + data)

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
                .then(() => console.log(`Successfully updated timer: ${name}`))
                .catch((error) => console.error(`Error updating timer ${name}:`, error));
        } else {
            console.error(`Timer with name ${name} not found.`);
        }
    }).catch(error => {
        console.error('Error fetching timers:', error);
    });
}

function timecodeToSeconds(time){
    return (3600 *time.hours) + (60 * time.minutes) + (time.seconds);
}


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

            timers.forEach(timer => {
                if (SPECIFIC_TIMER_NAMES.includes(timer.id.name) && timer.countdown) {
                    // Use the internal name/ID to get the remaining time from the controller
                    const internalName = Object.keys(TIMER_MAPPING).find(key => TIMER_MAPPING[key] === timer.id.name);
                    let remainingTime = timecodeToSeconds(controller.clocks[internalName]);

                    // if we're not playing, we're set to zero, or if the value is negative
                    if (state != "PLAYING" || controller.clocks[internalName].negative){
                        remainingTime = 0;
                    }

                    console.log();

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
                        .then(() => console.log(`Successfully updated timer: ${timer.id.name}`))
                        .catch((error) => console.error(`Error updating timer ${timer.id.name}:`, error));
                }
            });

            // Update previous values
            previousState = state;
            previousTimecode = timecode;
            previousClipName = clipName;
            previousLibraryTimestamp = libraryTimestamp;
        }
    } catch (error) {
        console.error('Error updating all timers:', error);
    }
}

module.exports = {
    fetchTimers,
    updateSpecificTimer,
    updateAllTimers,
};