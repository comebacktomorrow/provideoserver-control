function setActiveClipTimerByName(timer, resetTimecode = false) {
    const index = getClipInfoByName(currentClip.clipName).index;
    const timecode = resetTimecode ? { hours: 0, minutes: 0, seconds: 0, frames: 0 } : currentTimecode;

    // Construct the request body
    const requestBody = {
        timer: timer,
        timecode: {
            hours: timecode.hours,
            minutes: timecode.minutes,
            seconds: timecode.seconds,
            frames: timecode.frames
        }
    };

    // Send the request to the server
    fetch(`/API/PVS/playlist/id/${index}/times`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .catch(error => console.log('Error setting timer: ' + error));
}

function jumpToTimerTimecode(timer) {
    const timecode = getClipInfoByName(currentClip.clipName)[timer];
    
    const requestBody = {
        timecode: {
                        hours: timecode.hours,
                        minutes: timecode.minutes,
                        seconds: timecode.seconds,
                        frames: timecode.frames
                    }
    };

    fetch('API/PVS/transport/times/playhead', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .catch(error => {
        console.log('Error jumping to timecode: ' + error);
    });
}