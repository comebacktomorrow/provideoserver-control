import { fetchAndUpdateResponse, timecodeToTotalFrames } from './utils.js';
import { selectedClipData, toggleTimersControl }  from './uiUpdates.js';
let userInteracting = false;

export const addEventListeners = () => {
    const timeline = document.getElementById('timeline');

    // Mouse events
timeline.addEventListener('mousedown', () => userInteracting = true);
document.addEventListener('mouseup', () => {
    if (userInteracting) {
        userInteracting = false;
        //console.log(timeline.value);
        handleRangeChange(timeline.value);
    }
});
timeline.addEventListener('mousemove', () => {
    if (userInteracting) {
        //console.log(timeline.value);
        handleRangeChange(timeline.value);
        toggleTimersControl(6);
    }
});

// Touch events
timeline.addEventListener('touchstart', () => userInteracting = true);
document.addEventListener('touchend', () => {
    if (userInteracting) {
        userInteracting = false;
        //console.log(timeline.value);
        handleRangeChange(timeline.value);
        toggleTimersControl(6);
    }
});
timeline.addEventListener('touchmove', () => {
    if (userInteracting) {
        //console.log(timeline.value);
        handleRangeChange(timeline.value);
        toggleTimersControl(6);
    }
});

    //we don't use these transport control methods
    //document.getElementById('playButton').addEventListener('click', () => fetchAndUpdateResponse('/API/PVS/transport/play', 'POST'));
    //document.getElementById('pauseButton').addEventListener('click', () => fetchAndUpdateResponse('/API/PVS/transport/pause', 'POST'));
   // document.getElementById('stopButton').addEventListener('click', () => fetchAndUpdateResponse('/API/PVS/transport/stop', 'POST'));
    document.getElementById('toggleButton').addEventListener('click', () => fetchAndUpdateResponse('/API/PVS/transport/toggle', 'POST'));
    document.getElementById('requeueButton').addEventListener('click', () => fetchAndUpdateResponse('/API/PVS/timeline/recue', 'POST'));

    //queue functions
    document.getElementById('queuePrevButton').addEventListener('click', () => fetchAndUpdateResponse('/API/PVS/timeline/previous', 'POST'));
    document.getElementById('queueNextButton').addEventListener('click', () => fetchAndUpdateResponse('/API/PVS/timeline/next', 'POST'));
};

let debounceTimeout;

export const handleRangeChange = (value) => {
    if (!selectedClipData) {
        console.warn('No current clip available.');
        return;
    }

    const totalDurationFrames = timecodeToTotalFrames(selectedClipData.duration, selectedClipData.fps);
    const targetFrame = Math.floor((value / 1000) * totalDurationFrames);

    const targetTimecode = {
        hours: Math.floor(targetFrame / (3600 * selectedClipData.fps)),
        minutes: Math.floor((targetFrame % (3600 * selectedClipData.fps)) / (60 * selectedClipData.fps)),
        seconds: Math.floor((targetFrame % (60 * selectedClipData.fps)) / selectedClipData.fps),
        frames: Math.round(targetFrame % selectedClipData.fps)
    };

    console.log('target frame', JSON.stringify(targetTimecode));

    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
        fetchAndUpdateResponse('/API/PVS/transport/times/playhead', 'POST', { timecode: targetTimecode });
    }, 50); // Adjust the debounce delay as needed
};