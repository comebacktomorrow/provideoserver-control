let playlistData = [];
let selectedClipDurationFrames = 0;

function updateResponse(responseText) {
    const responseDiv = document.getElementById('response');
    responseDiv.innerText = responseText;
}

function timecodeToString(timecode) {
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

function handleRangeChange(value) {
    const percentage = value / 100; // Convert range value to percentage (0-1)
    const requestBody = {
        timecode: { percentage }
    };

    fetch('http://localhost:5050/API/PVS/transport/times/playhead', {
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
}

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

function updateStatus(data) {
    const clipInfo = getClipInfoByName(data.clipName);

    document.getElementById('state').innerText = data.state;
    document.getElementById('current-timecode').innerText = timecodeToString(data.timecode);
    document.getElementById('current-duration').innerText = timecodeToString(clipInfo.duration);
    document.getElementById('clipName').innerText = data.clipName;

    updateTransportButtonState(data)
    

    if (clipInfo) {
        highlightClip(clipInfo);
        displayClipInfo(clipInfo);
    }

    if (selectedClipDurationFrames > 0) {
        const currentFrames = timecodeToTotalFrames(data.timecode, parseFloat(clipInfo.fps));
        const progress = Math.min(currentFrames / selectedClipDurationFrames * 100, 100);
        document.getElementById('timecodeRange').value = progress;
    }
}

function getClipInfoByName(clipName) {
    return playlistData.find(item => item.plnName === clipName);
}

function highlightClip(clipInfo) {
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

// Initialize WebSocket connection
const socket = new WebSocket('ws://localhost:5050');

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

// Fetch and display playlist
function fetchPlaylist() {
    fetch('/API/PVS/playlist')
        .then(response => response.json())
        .then(data => {
            playlistData = data; // Store fetched playlist data
            const playlistDiv = document.getElementById('playlist');
            playlistDiv.innerHTML = ''; // Clear existing content

            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'playlist-item';
                if (item.isSelected) {
                    card.classList.add('selected');
                }

                const name = document.createElement('h3');
                name.innerText = item.cleanName;

                const playbackDuration = document.createElement('p');
                playbackDuration.innerText = `Duration: ${timecodeToString(item.duration)}`;
                
                const playbackBehavior = document.createElement('p');
                playbackBehavior.innerText = `Mode: ${item.playbackBehavior}`;

                const metaContainer = document.createElement('div');

                const fps = document.createElement('span');
                fps.setAttribute("class", "meta")
                fps.setAttribute("id", "FPS")
                fps.innerText = `${parseFloat(item.fps).toFixed(2)} FPS`;

                const formatString = document.createElement('span');
                formatString.innerText = `${item.formatString}`;
                formatString.setAttribute("class", "meta")
                formatString.setAttribute("id", "format")

                const sizeString = document.createElement('span');
                sizeString.setAttribute("class", "meta")
                sizeString.setAttribute("id", "size")
                sizeString.innerText = `${item.sizeString}`;

                const loadButton = document.createElement('button');
                loadButton.innerText = 'Load';
                loadButton.onclick = () => loadClipByCleanName(item.cleanName);

                card.appendChild(name);
                card.appendChild(playbackDuration);
                card.appendChild(playbackBehavior);
                

                metaContainer.appendChild(fps);
                metaContainer.appendChild(formatString);
                metaContainer.appendChild(sizeString);
                card.appendChild(loadButton); // Add the Load button to the card

                playlistDiv.appendChild(card);
                card.appendChild(metaContainer);
            });
        })
        .catch(error => updateResponse('Error fetching playlist: ' + error));
    }

    function loadClipByCleanName(cleanName) {
        fetch(`/API/PVS/timeline/active/clean-name/${encodeURIComponent(cleanName)}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => updateResponse(JSON.stringify(data.message)))
            .catch(error => updateResponse('Error loading clip: ' + error));
    }
        
        fetchPlaylist(); // Initial fetch of the playlist
        setInterval(fetchPlaylist, 30000); // Refresh the playlist every 30 seconds