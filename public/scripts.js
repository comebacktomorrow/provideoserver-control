let playlistData = [];
let selectedClipDurationFrames = 0;
let currentClip = [];
let currentTimecode = []
let currentLibraryTimeStamp = '';
let userInteracting = false; //slider interaction

// Derive URL from the current page URL
const loc = window.location;
const wsStart = loc.protocol === "https:" ? "wss://" : "ws://";
const socketUrl = wsStart + loc.host; // This includes hostname and port

function updateResponse(responseText) {
    const responseDiv = document.getElementById('response');
    responseDiv.innerText = responseText;
}

function jsonTimecodeToString(timecode) {
    const pad = (number) => number.toString().padStart(2, '0');

    const hours = pad(timecode.hours);
    const minutes = pad(timecode.minutes);
    const seconds = pad(timecode.seconds);
    const frames = pad(timecode.frames);

    return `${hours}:${minutes}:${seconds}:${frames}`;
}

function timecodeToTotalFrames(timecode, fps) {
    return (timecode.hours * 3600 + timecode.minutes * 60 + timecode.seconds) * fps + timecode.frames;
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
    .then(data => {
        updateResponse(JSON.stringify(data));
    })
    .catch(error => {
        updateResponse('Error jumping to timecode: ' + error);
    });
}

let debounceTimeout;
function handleRangeChange(value) {
    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
        console.log("range " + value);
        const percentage = value / 100; // Convert range value to percentage (0-1)
        const requestBody = {
            timecode: { percentage }
        };

        fetch('/API/PVS/transport/times/playhead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            updateResponse(JSON.stringify(data));
        })
        .catch(error => {
            updateResponse('Error jumping to percentage: ' + error);
        });
    }, 50); // Debounce delay in milliseconds
}


// dealing with the slider
// Function to handle real-time updates
const timecodeRange = document.getElementById('timecodeRange');

function updateRange(value) {
    if (!userInteracting) {
        timecodeRange.value = value;
    }
}

// Event listeners to detect user interaction
timecodeRange.addEventListener('mousedown', () => {
    userInteracting = true;
});

document.addEventListener('mouseup', () => {
    if (userInteracting) {
        userInteracting = false;
        handleRangeChange(timecodeRange.value);
    }
});

timecodeRange.addEventListener('mousemove', () => {
    if (userInteracting) {
        handleRangeChange(timecodeRange.value);
    }
});
//end dealing with the slider





    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const toggleButton = document.getElementById('toggleButton');

function updateTransportButtonState(data) {
    

    // Reset all buttons to default state
    playButton.classList.remove('active');
    pauseButton.classList.remove('active');
    stopButton.classList.remove('active');
    toggleButton.classList.remove('play');
    toggleButton.classList.remove('pause');

    // Update the active button based on data.state
    if (data.state === 'PLAYING') {
        playButton.classList.add('active');
        toggleButton.innerText = '\u23F8';
        toggleButton.classList.add('pause');
    } else if (data.state === 'PAUSED') {
        pauseButton.classList.add('active');
        toggleButton.innerText = '\u25B6';  // Unicode for Play symbol (▶)
        toggleButton.classList.add('play');
    } else {
        stopButton.classList.add('active');
        toggleButton.innerText = '\u25B6';  // Unicode for Play symbol (▶)
        toggleButton.classList.add('play');
    }
}

function newCalcTimecode(time1, time2, fps){
    const frameRate = Math.round(fps * 100)/100;
    //console.log("framte rate is " + frameRate)
    const t1 = new Timecode(jsonTimecodeToString(time1),  frameRate);
    const t2 = new Timecode(jsonTimecodeToString(time2),  frameRate);


    let result = null
    let sign = '-'
    if(t1 < t2){
        //not overrun - not negative
        result = t2.subtract(t1);
        sign = ''
    } else {
        //is overrun - is negative
        result = t1.subtract(t2);
        sign = '-'
    }

    return {result: result, sign: sign}; 
}

function updateStatus(data) {
    const clipInfo = getClipInfoByName(data.clipName);
    currentClip = data; //new code
    

    // if the timestamp has changed, it means we need to trigger a playlist refresh
    if (currentLibraryTimeStamp != currentClip.libraryTimestamp) {
        currentLibraryTimeStamp = currentClip.libraryTimestamp;
        console.log('status update: triggering playlist update')
        fetchPlaylistData().then(updatePlaylistDOM).then(highlightClip(clipInfo));
    }

    //document.getElementById('state').innerText = data.state;
    document.getElementById('current-timecode').innerText = jsonTimecodeToString(data.timecode);
    // we're going to put this line down further for now due to the new timecode code
    document.getElementById('current-duration').innerText = jsonTimecodeToString(clipInfo.duration);

    const cleanClipName = data.clipName.replace(/\[[^\]]*\]/g, '').trim();

    document.getElementById('clipName').innerText = cleanClipName;

    updateTransportButtonState(data);


    /////// timer stuff
    const frameRate = Math.round(clipInfo.fps * 100)/100;

    let t1 = [];
    let t2 = [];
    let trt = [];
    t1.result = new Timecode('00:00:00:00',  frameRate);
    let t1sign = '';
    t2.result = new Timecode('00:00:00:00',  frameRate);
    let t2sign = '';
    trt.result = new Timecode('00:00:00:00',  frameRate);
    let trtsign = '';
    let tduration = new Timecode(jsonTimecodeToString(clipInfo.duration), frameRate);


    let tr = newCalcTimecode(data.timecode, clipInfo.duration, clipInfo.fps); //time remaing
    
    if (timecodeToTotalFrames(clipInfo.t1, clipInfo.fps) > 1) {
        //console.log('clear t1')
        t1 = newCalcTimecode(data.timecode, clipInfo.t1, clipInfo.fps); //t1time remaing
    }

    if (timecodeToTotalFrames(clipInfo.t2, clipInfo.fps) > 1) {
        //console.log('clear t2')
        t2 = newCalcTimecode(data.timecode, clipInfo.t2, clipInfo.fps); //t2 time remaing
    }

    if (timecodeToTotalFrames(clipInfo.duration, clipInfo.fps) != timecodeToTotalFrames(clipInfo.trt, clipInfo.fps)){
        //console.log('clear trt')
        trt = newCalcTimecode(data.timecode, clipInfo.trt, clipInfo.fps); //trt time remaing
    }

    if (currentTimecode != data.timecode) {
        currentTimecode = data.timecode;

        const endtime = document.getElementById('current-duration-remain');
        const timer1 = document.getElementById('t1rtc');
        const timer2 = document.getElementById('t2rtc');

        if (trt.result < tr.result && trt.sign == '' ){
            endtime.innerText = "TRT " + trt.result.toString();
        } else {
            endtime.innerText = tr.result.toString();
        }

        //console.log(trt.result.toString());

        if (t1.result >= 0 && t1.sign != '-'){
            
            timer1.innerText = t1.result.toString();
        } else if (t1.sign == '-') {
            console.log(t1.sign)
            //timer1.innerText = ('–' + t1.result.toString());
            timer1.innerText = ('00:00:00:00');
        }

        if (t2.result >= 0 && t2.sign != '-'){
            
            timer2.innerText = t2.result.toString();
        } else if (t2.sign == '-') {
            console.log(t2.sign)
            //timer2.innerText = ('–' + t2.result.toString());
            timer2.innerText = ('00:00:00:00');
        }

        
        

        

    }

    if (clipInfo) {
        highlightClip(clipInfo);
        displayClipInfo(clipInfo);
    }

    if (selectedClipDurationFrames > 0) {
        const currentFrames = timecodeToTotalFrames(data.timecode, parseFloat(clipInfo.fps));
        const progress = Math.min(currentFrames / selectedClipDurationFrames * 100, 100);
        if (!userInteracting){
            document.getElementById('timecodeRange').value = progress;
        }
        
    }

    
}


function getClipInfoByName(clipName) {
    return playlistData.find(item => item.plnName === clipName);
}

function highlightClip(clipInfo) {
    if (!clipInfo || !clipInfo.cleanName) {
        console.error('Invalid clip info:', clipInfo);
        return;
    }

    const playlistDiv = document.getElementById('playlist');
    const items = playlistDiv.getElementsByClassName('playlist-item');
    for (let item of items) {
        item.classList.remove('selected');
        if (item.querySelector('h3').innerText === clipInfo.cleanName) {
            item.classList.add('selected');
        }
    }
}

function displayClipInfo(clipInfo) {
    selectedClipDurationFrames = timecodeToTotalFrames(clipInfo.duration, parseFloat(clipInfo.fps));
    // Update clip info display logic here if needed
}

function play() {
    fetch('/API/PVS/transport/play', { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Play: ' + error));
}

function pause() {
    fetch('/API/PVS/transport/pause', { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Pause: ' + error));
}

function stop() {
    fetch('/API/PVS/transport/stop', { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Stop: ' + error));
}

function toggle() {
    fetch('/API/PVS/transport/toggle', { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error toggle: ' + error));
}

function queueNext() {
    fetch('/API/PVS/timeline/next', { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Q+: ' + error));
}

function queuePrevious() {
    fetch('/API/PVS/timeline/previous', { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Q-: ' + error));
}

function requeue() {
    fetch('/API/PVS/timeline/recue', { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Q: ' + error));
}

function jump(time) {
    fetch(`/API/PVS/transport/jump/${time}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Q: ' + error));
}

function jumpEnd(time) {
    fetch(`/API/PVS/transport/end/${time}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => updateResponse(JSON.stringify(data.message)))
        .catch(error => updateResponse('Error Q: ' + error));
}

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
    .then(data => updateResponse(JSON.stringify(data)))
    .catch(error => updateResponse('Error setting timer: ' + error));
}


// Initialize WebSocket connection
const socket = new WebSocket(`ws://${window.location.host}`);

socket.onopen = function() {
    console.log('WebSocket connection opened');
};

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    updateStatus(data);
};

socket.onerror = function(error) {
    console.error('WebSocket error:', error);
};

socket.onclose = function() {
    console.log('WebSocket connection closed');
};

// Function to fetch playlist data
function fetchPlaylistData() {
    return fetch('/API/PVS/playlist')
        .then(response => response.json())
        .catch(error => {
            updateResponse('Error fetching playlist: ' + error);
            return [];
        });
}

// Function to update playlist DOM
function updatePlaylistDOM(data) {
    playlistData = data;
    const playlistDiv = document.getElementById('playlist');
    playlistDiv.innerHTML = ''; // Clear existing content

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'playlist-item';
        if (item.isSelected) {
            card.classList.add('selected');
        }

        // const head = document.createElement('div');
        // head.setAttribute('class', 'head');

        const name = document.createElement('h3');
        name.innerText = item.cleanName;

        const playbackBehavior = document.createElement('div');
        playbackBehavior.setAttribute('class', 'behaviour');
        playbackBehavior.innerText = `${item.playbackBehavior}`; // STOP, LOOP, NEXT

        const playbackDuration = document.createElement('p');
        playbackDuration.innerText = `Duration: ${jsonTimecodeToString(item.duration)}`;

        const metaContainer = document.createElement('div');

        const fps = document.createElement('span');
        fps.setAttribute('class', 'meta');
        fps.setAttribute('id', 'FPS');
        fps.innerText = `${parseFloat(item.fps).toFixed(2)} FPS`;

        const formatString = document.createElement('span');
        formatString.innerText = `${item.formatString}`;
        formatString.setAttribute('class', 'meta');
        formatString.setAttribute('id', 'format');

        const sizeString = document.createElement('span');
        sizeString.setAttribute('class', 'meta');
        sizeString.setAttribute('id', 'size');
        sizeString.innerText = `${item.sizeString}`;

        const loadButton = document.createElement('button');
        loadButton.innerText = 'Load';
        loadButton.onclick = () => loadClipByCleanName(item.cleanName);

        card.appendChild(playbackBehavior);
        //card.appendChild(head);
        card.appendChild(name);
        card.appendChild(playbackDuration);
        metaContainer.appendChild(fps);
        metaContainer.appendChild(formatString);
        metaContainer.appendChild(sizeString);
        card.appendChild(loadButton);
        playlistDiv.appendChild(card);
        card.appendChild(metaContainer);
    });
}

    function loadClipByCleanName(cleanName) {
        fetch(`/API/PVS/timeline/active/clean-name/${encodeURIComponent(cleanName)}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => updateResponse(JSON.stringify(data.message)))
            .catch(error => updateResponse('Error loading clip: ' + error));
    }
        
    fetchPlaylistData().then(updatePlaylistDOM); // Initial fetch of the playlist
        //setInterval(fetchPlaylist, 5000); // Refresh the playlist every 30 seconds




