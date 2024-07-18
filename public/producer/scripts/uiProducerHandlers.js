import { jsonTimecodeToString, timecodeToTotalFrames, calcTimeRemainingAsString } from './utils.js';
import { fetchPlaylistData, updatePlaylistDOM, findClipByClipName, setSelectedClip } from './playlist.js';
export let selectedClipData = {};

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

export const createUIHandlers = (specificHandlers) => {
    const {
        updatePlaylistDOM,
        updateTransportButtonState,
        updatePlaybackState,
        updateTimelineData,
    } = specificHandlers;

    return {
        onLibraryUpdate: async (socketData) => {
            document.getElementById('playback-title').innerText = socketData.clipName.replace(/\[[^\]]*\]/g, '').trim();  // we emulate the clean title for responseiveness 
        //currentLibraryTimeStamp = socketData.libraryTimestamp; //we update the tracking timestamp
        //console.log('Library timesamp changed. Fetching playlist update')
        fetchPlaylistData().then(() => {
            selectedClipData = findClipByClipName(socketData.clipName);
            if (selectedClipData) {
                console.log('Playlist update recieved. Updating playlist.')
                updatePlaylistDOM //we then refresh the dom // i don't know calling this works - it requires a playlist passed in
                setSelectedClip(selectedClipData.index);
                updateTimelineData;
            }
        });
        },
        onStateChange: (socketData) => {
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
                updatePlaylistDOM; //we then refresh the dom
                document.getElementById('playback-title').innerText = socketData.clipName.replace(/\[[^\]]*\]/g, '').trim();  // we emulate the clean title for responseiveness 
                document.getElementById('playback-duration').innerText = "/" + jsonTimecodeToString(selectedClipData.duration);
                document.getElementById('playback-behaviour').innerText = selectedClipData.playbackBehavior;
                updatePlaybackState(socketData.state);  
                setSelectedClip(selectedClipData.index);
                updateTransportButtonState(socketData.state);

            }
        });   
        },
        onTimecodeUpdate: (socketData) => {
            const frameRate = Math.round(selectedClipData.fps * 100)/100; //tc lib requires rounded fr

            const t1 = timecodeToTotalFrames(selectedClipData.t1) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.t1, frameRate, false);
            const t2 = timecodeToTotalFrames(selectedClipData.t2) === 0 ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.t2, frameRate, false);
            const trt = timecodeToTotalFrames(selectedClipData.trt) === timecodeToTotalFrames(selectedClipData.duration) ? '00:00:00:00' : calcTimeRemainingAsString(socketData.timecode, selectedClipData.trt, frameRate, false);
            const remain = calcTimeRemainingAsString(socketData.timecode, selectedClipData.duration, frameRate);
            
            document.getElementById('playback-count').innerText = jsonTimecodeToString(socketData.timecode);
    
            console.log(remain + " " + trt)
            //update the on screen timer values
            updateTimer('playback-count', jsonTimecodeToString(socketData.timecode))
            updateTimer('playback-timer-left', t1.result.toString(), 'T1 ');
            updateTimer('playback-timer-right', t2.result.toString(), 'T2 ');
    
            if (trt.result.toString() == remain.result.toString()){
                // if they're the same, we only want 1 to have value (remain)
                updateTimer('playback-remaining1', remain.result.toString());
                updateTimer('playback-remaining2', '');
            } else {
                // if they're not, put trt at the top
                updateTimer('playback-remaining1', trt.result.toString(), 'TRT ');
                updateTimer('playback-remaining2', remain.result.toString());
            }
        },
        onTallyUpdate: (tallyState) => {
            //do nothing
        }
    };
};