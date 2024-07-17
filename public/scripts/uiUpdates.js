import { jsonTimecodeToString, timecodeToTotalFrames, calcTimeRemainingAsString } from './utils.js';
import { fetchPlaylistData, updatePlaylistDOM, findClipByClipName, setSelectedClip } from './playlist.js';

export let selectedClipData = {};
let previousClip = {}; // is used
let currentTimecode = {}; // only used in a single update cycle -- unused
let currentLibraryTimeStamp = 0; // is used
//let playlistData = [];
let userInteracting = false;

export const setActiveClipTimerByName = (timer, resetTimecode = false) => {
    const index = findClipByClipName(previousClip.clipName).index;
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

export const jumpToTimerTimecode = (timer) => {
    //we'll take a risk and use the previous clip .. it should be updated anyway
    const timecode =  findClipByClipName(previousClip.clipName)[timer];
    
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

export const jumpTime = time => {
    fetch(`/API/PVS/transport/jump/${time}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Q: ' + error));
}

export const jumpEnd = time => {
    fetch(`/API/PVS/transport/end/${time}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Q: ' + error));
}

export const updateTransportButtonState = state => {
    document.querySelectorAll('.transport-button').forEach(btn => btn.classList.remove('active'));
    const toggleButton = document.getElementById('toggleButton');
    toggleButton.classList.remove('play', 'pause');

    if (state === 'PLAYING') {
        toggleButton.innerText = '\u23F8';
        toggleButton.classList.add('pause');
    } else if (state === 'PAUSED') {
        toggleButton.innerText = '\u25B6';
        toggleButton.classList.add('play');
    } else {
        toggleButton.innerText = '\u25B6';
        toggleButton.classList.add('play');
    }
};

export const toggleTimersControl = (controlNumber = 0) => {
    // Get all the timer control divs
    const controls = document.querySelectorAll('[id^="timers-control-"]');
    
    // Hide all the controls
    controls.forEach(control => {
        control.style.display = "none";
    });
    
    // Get the selected control
    const selectedControl = document.getElementById(`timers-control-${controlNumber}`);
    
    // Toggle the selected control
    if (selectedControl.style.display === "none" || controlNumber != 0) {
        selectedControl.style.display = "flex";
    } else {
        selectedControl.style.display = "none";
        console.log("nothing to see");
    }

    // setInterval(() => {
        //updateAllTimers(PRO_PRESENTER_IP, PRO_PRESENTER_PORT, controller);
        //sendUMDMessage(controller, '127.0.0.1', TSL_PORT, controller);
// }, 1000);
};

export const updatePlaybackState = state => {
        const stateTextMapping = {
            'AT_START': 'Standby',
            'AT_END': 'Stopped',
            'PLAYING': 'Playing',
            'PAUSED': 'Paused',
            'CUEING': 'Seeking',
            // Add more state mappings as needed
        };
    
        const text = stateTextMapping[state] || 'Unknown State';
        document.getElementById('playback-status').innerText = text;
    };

export const updateRange = (value, duration, frameRate) => {
    if (!userInteracting) {
        const nowFrame = timecodeToTotalFrames(value, frameRate);
        const durationFrame = timecodeToTotalFrames(duration, frameRate);
        const playhead = Math.floor((nowFrame / durationFrame) * 1000);
        document.getElementById('timeline').value = playhead;
    }
};

export const updateTimer = (timerName, time, label = '') => {
    document.getElementById(`${timerName}`).innerText = label + time;
};

export const updateTimelineData = (newClipData) => {
    const clipTimerData = newClipData ;
    const event = new CustomEvent('updateTimelineData', { detail: clipTimerData });
    document.dispatchEvent(event);
};



export const updateStatus = socketData => {
    const currentClip = socketData;
    //let selectedClipData = null; // before we were re-setting clip info every update?

    if (currentLibraryTimeStamp !== socketData.libraryTimestamp) { //if the timestamps don't match,we need to fetch new playlist data
        document.getElementById('playback-title').innerText = socketData.clipName.replace(/\[[^\]]*\]/g, '').trim();  // we emulate the clean title for responseiveness 
        currentLibraryTimeStamp = socketData.libraryTimestamp; //we update the tracking timestamp
        //console.log('Library timesamp changed. Fetching playlist update')
        fetchPlaylistData().then(() => {
            selectedClipData = findClipByClipName(socketData.clipName);
            if (selectedClipData) {
                console.log('Playlist update recieved. Updating playlist.')
                updatePlaylistDOM //we then refresh the dom // i don't know calling this works - it requires a playlist passed in
                setSelectedClip(selectedClipData.index);
                updateTimelineData(selectedClipData);
            }
        });
        
    }

    if (currentClip.state != previousClip.state){
        //console.log('state has changed');
        updateTransportButtonState(socketData.state); //changes the status of toggle button
        updatePlaybackState(socketData.state);    //changes the text that says playing \ paused 
    }

    if (currentClip.clipName != previousClip.clipName){
        //console.log("Clip selected has changed, update playback data");
        updateTransportButtonState(socketData.state);
        updatePlaybackState(socketData.state); 

        fetchPlaylistData().then(() => {
            selectedClipData = findClipByClipName(socketData.clipName);
            if (selectedClipData) {
                //console.log('Playlist update recieved. Updating playlist.')
                updatePlaylistDOM; //we then refresh the dom
                document.getElementById('playback-title').innerText = socketData.clipName.replace(/\[[^\]]*\]/g, '').trim();  // we emulate the clean title for responseiveness 
                document.getElementById('playback-duration').innerText = "/" + jsonTimecodeToString(selectedClipData.duration);
                document.getElementById('playback-behaviour').innerText = selectedClipData.playbackBehavior;
                updateTransportButtonState(socketData.state);
                updatePlaybackState(socketData.state);  
                setSelectedClip(selectedClipData.index);

                updateTimelineData(selectedClipData);
            }
        });    
    }

    // if the timestamps have changed
    if (currentTimecode != socketData.timecode ) {
        const frameRate = Math.round(selectedClipData.fps * 100)/100; //tc lib requires rounded fr

        currentTimecode = socketData.timecode;
        const t1 = timecodeToTotalFrames(selectedClipData.t1) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.t1, frameRate, false);
        const t2 = timecodeToTotalFrames(selectedClipData.t2) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.t2, frameRate, false);
        const trt = timecodeToTotalFrames(selectedClipData.trt) === timecodeToTotalFrames(selectedClipData.duration) ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.trt, frameRate, false);
        const remain = calcTimeRemainingAsString(socketData.timecode, selectedClipData.duration, frameRate);
        
        
        document.getElementById('playback-count').innerText = jsonTimecodeToString(socketData.timecode);

        //update the on screen timer values
        updateTimer('playback-count', jsonTimecodeToString(socketData.timecode))
        updateTimer('playback-timer-1', t1.result.toString(), 'T1 ');
        updateTimer('playback-timer-2', t2.result.toString(), 'T2 ');
        updateTimer('playback-remaining2', trt.result.toString(), 'TRT ');
        updateTimer('playback-remaining1', remain.result.toString());
        // update the range control
        updateRange(socketData.timecode, selectedClipData.duration, frameRate); //adjust the playead

        currentTimecode = socketData.timecode; // update the timecode reference
    }


    // Update tally state
    const tallyDiv = document.getElementById('tally');
    tallyDiv.classList.toggle('preview', socketData.tallyState === 0);
    tallyDiv.classList.toggle('program', socketData.tallyState === 1);
    previousClip = socketData;
};