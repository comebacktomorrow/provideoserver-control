import { jsonTimecodeToString, timecodeToTotalFrames, calcTimeRemainingAsString, findSmallestRemainingTime, simpleTime } from './utils.js';
import { fetchPlaylistData, findClipByClipName } from './playlist.js';
//import { updatePlaylistDOM, setSelectedClip } from './playlistDom.js';
export let selectedClipData = {};

let intervalId = null;
let playbackState = 'Unknown State';
let isOnAir = -1;

export const updateTimer = (timerName, time, label = '') => {
    document.getElementById(`${timerName}`).innerText = label + time;
};

export const updateTimelineData = (newClipData) => {
    //not required
};

export const updateRange = (newClipData) => {
    //not required
};

export const updateTransportButtonState = state => {
    //not required
};

export const stageTimer = () => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
   
    const hideClock = urlParams.get('hidetime');
    const vidClock = urlParams.get('tally');

    let vcOverride = false
    if (vidClock == 1) {
        vcOverride = true
    }

    if (hideClock == 1) {
        const todElement = document.getElementById('playback-count');
        todElement.classList.add('hide');
    }


    const timerElement = document.getElementById('playback-duration');
    //document.getElementById('playback-status').innerText = text;
   
    if (playbackState == 'Playing' && (isOnAir || vcOverride)) {
        //console.log('show please')
        timerElement.classList.remove('hide');
    } else {
        timerElement.classList.add('hide');
        //console.log('hide please' + playbackState + isOnAir)
    }
}

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
    playbackState = text;
};

export const createUIHandlers = (specificHandlers) => {
    const {
        //updatePlaylistDOM,
        updateTransportButtonState,
        updatePlaybackState,
        updateTimelineData,
    } = specificHandlers;

    return {
        onLibraryUpdate: async (socketData) => {
            //document.getElementById('playback-title').innerText = socketData.clipName.replace(/\[[^\]]*\]/g, '').trim();  // we emulate the clean title for responseiveness 
        //currentLibraryTimeStamp = socketData.libraryTimestamp; //we update the tracking timestamp
        //console.log('Library timesamp changed. Fetching playlist update')
        fetchPlaylistData().then(() => {
            selectedClipData = findClipByClipName(socketData.clipName);
            if (selectedClipData) {
                console.log('Playlist update recieved. Updating playlist.')
                //updatePlaylistDOM //we then refresh the dom // i don't know calling this works - it requires a playlist passed in
                //setSelectedClip(selectedClipData.index);
                updateTimelineData;
            }
        });
        },
        onStateChange: (socketData) => {
            console.log('updating state');
            updatePlaybackState(socketData.state);
            updateTransportButtonState(socketData.state);
        },
        onClipChange: async (socketData) => {
            updatePlaybackState(socketData.state); 
            updateTransportButtonState(socketData.state);

        fetchPlaylistData().then(() => {
            selectedClipData = findClipByClipName(socketData.clipName);
            if (selectedClipData) {
                //console.log('Playlist update recieved. Updating playlist.')
                //updatePlaylistDOM; //we then refresh the dom
                // document.getElementById('playback-title').innerText = socketData.clipName.replace(/\[[^\]]*\]/g, '').trim();  // we emulate the clean title for responseiveness 
                // document.getElementById('playback-duration').innerText = "/" + jsonTimecodeToString(selectedClipData.duration);
                // document.getElementById('playback-behaviour').innerText = selectedClipData.playbackBehavior;
                updatePlaybackState(socketData.state);  
                //setSelectedClip(selectedClipData.index);
                updateTransportButtonState(socketData.state);

            }
        });   
        },

            // Method to start the repeating loop
            startTODClock: () => {
            intervalId = setInterval(() => {
                var d = new Date();
                d.getHours(); // => 9
                d.getMinutes(); // =>  30
                d.getSeconds(); // => 51
                const now = (d.getHours() % 12 || 12) + ":"+ d.getMinutes().toString().padStart(2, '0') + ":"+ d.getSeconds().toString().padStart(2, '0'); // => 51
                updateTimer('playback-count', now);
            }, 1000);
        },
        
        onTimecodeUpdate: (socketData) => {
            const frameRate = Math.round(selectedClipData.fps * 100)/100; //tc lib requires rounded fr

            const t1 = timecodeToTotalFrames(selectedClipData.t1) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.t1, frameRate, false);
            const t2 = timecodeToTotalFrames(selectedClipData.t2) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.t2, frameRate, false);
            const trt = timecodeToTotalFrames(selectedClipData.trt) === timecodeToTotalFrames(selectedClipData.duration) ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.trt, frameRate, false);
            const remain = calcTimeRemainingAsString(socketData.timecode, selectedClipData.duration, frameRate);
            
            updateTimer('playback-duration', simpleTime(findSmallestRemainingTime(selectedClipData, socketData.timecode, frameRate).result.toString()));
            stageTimer();
        },
        onTallyUpdate: (tallyState) => {
            if (tallyState == 0){
                //console.log("preview");
                isOnAir = false;
            } else if (tallyState == 1) {
                //console.log("program");
                isOnAir = true;
            } else {
                //console.log("clear" + tallyState);
                isOnAir = false;
            }
        }
    };
};