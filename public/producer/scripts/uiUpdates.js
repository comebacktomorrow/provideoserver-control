import { jsonTimecodeToString, timecodeToTotalFrames, calcTimeRemainingAsString } from './utils.js';
import { fetchPlaylistData, updatePlaylistDOM, findClipByClipName, setSelectedClip } from './playlist.js';

export let selectedClipData = {};
let previousClip = {}; // is used
let currentTimecode = {}; // only used in a single update cycle -- unused
let currentLibraryTimeStamp = 0; // is used
//let playlistData = [];
let userInteracting = false;

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


export const updateTimer = (timerName, time, label = '') => {
    document.getElementById(`${timerName}`).innerText = label + time;
};



export const updateStatus = socketData => {

    console.log('got updates')
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
            }
        });
        
    }

    if (currentClip.state != previousClip.state){
        //console.log('state has changed');
        updatePlaybackState(socketData.state);    //changes the text that says playing \ paused 
    }

    if (currentClip.clipName != previousClip.clipName){
        //console.log("Clip selected has changed, update playback data");
        updatePlaybackState(socketData.state); 

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
        
        // update the range control

        currentTimecode = socketData.timecode; // update the timecode reference
    }
};