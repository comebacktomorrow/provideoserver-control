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

function updateStatus(data) {
    document.getElementById('state').innerText = data.state;
    document.getElementById('timecode').innerText = timecodeToString(data.timecode);
    document.getElementById('clipName').innerText = data.clipName;

    const clipInfo = getClipInfoByName(data.clipName);
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
    document.getElementById('clip-duration').innerText = `Duration: ${timecodeToString(clipInfo.duration)}`;
    document.getElementById('clip-playbackBehavior').innerText = `Mode: ${clipInfo.playbackBehavior}`;
    document.getElementById('clip-fps').innerText = `FPS: ${parseFloat(clipInfo.fps).toFixed(2)}`;
    document.getElementById('clip-formatString').innerText = `Format: ${clipInfo.formatString}`;
    document.getElementById('clip-sizeString').innerText = `Size: ${clipInfo.sizeString}`;
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
        
        fetchPlaylist(); // Initial fetch of the playlist
        setInterval(fetchPlaylist, 30000); // Refresh the playlist every 30 seconds