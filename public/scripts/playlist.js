import { jsonTimecodeToString } from './utils.js';

let playlistData = [];

export const fetchPlaylistData = () => {
    // Fetch playlist data and update playlistData
    return fetch('/API/PVS/playlist')
        .then(response => response.json())
        .then(data => {
            playlistData = data; // Update playlistData with fetched data
            updatePlaylistDOM(data);
            return data; // Return data for chaining
        })
        .catch(error => {
            console.error('Error fetching playlist data:', error);
            throw error; // Propagate the error
        });
};

export const findClipByClipName = clipName => {
    const thisClip = playlistData.find(clip => clip.plnName === clipName);
    return thisClip || null; // Return clipInfo if found, otherwise null
}

export const setSelectedClip = clipIndex => {
    const playlist = document.getElementById('playlist');
    const playlistItems = playlist.getElementsByClassName('playlist-item');
    for (let plItem of playlistItems) {
        plItem.classList.remove('selected');
    }
    let selectedClip = playlist.querySelector(`#playlist-item-${clipIndex}`);
    selectedClip.classList.add('selected');
}

function loadClipByCleanName(cleanName) {
        fetch(`/API/PVS/timeline/active/clean-name/${encodeURIComponent(cleanName)}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => updateResponse(JSON.stringify(data.message)))
            .catch(error => updateResponse('Error loading clip: ' + error));
    }

export const updatePlaylistDOM = playlist => {
    playlistData = playlist;
    const playlistContainer = document.getElementById('playlist');
    playlistContainer.innerHTML = ''; // Clear existing playlist

    playlist.forEach(clip => {
        console.log('updating clip');
        const duration = jsonTimecodeToString(clip.duration);
        const behaviour = clip.playBehaviour
        let format = clip.formatString;
        const meta = clip.playbackBehavior + " " + clip.sizeString +  " @ " +  parseFloat(clip.fps).toFixed(2) + " - " + format.toUpperCase();
        const t1 = jsonTimecodeToString(clip.t1);
        const t2 = jsonTimecodeToString(clip.t2);
        const trt = jsonTimecodeToString(clip.trt);

        const playlistItemContainer = document.createElement('div'); //1
        playlistItemContainer.classList.add('playlist-item');
        playlistItemContainer.classList.add('selected'); // Added "selected" class based on your example
        playlistItemContainer.setAttribute('id', `playlist-item-${clip.index}`);
        
        const playlistItemContent = document.createElement('div'); //2
        playlistItemContent.classList.add('playlist-content');
        
        const playlistItemTitle = document.createElement('h3'); //3A
        playlistItemTitle.innerText = clip.cleanName;          
        playlistItemTitle.classList.add('playlist-item-title');
        
        const playlistItemDataContainer = document.createElement('div'); //3B
        playlistItemDataContainer.classList.add('playlist-item-data-container');
        
        const playlistItemDuration = document.createElement('div'); //4A
        playlistItemDuration.classList.add('playlist-item-data-duration');
        playlistItemDuration.textContent = duration;
        
        const playlistItemBehaviour = document.createElement('div'); //4B
        playlistItemBehaviour.classList.add('playlist-item-data-behaviour');
        playlistItemBehaviour.textContent = behaviour;
        
        const playlistItemMeta = document.createElement('div'); //4C
        playlistItemMeta.classList.add('playlist-item-data-meta');
        playlistItemMeta.textContent = meta;
        
        playlistItemDataContainer.appendChild(playlistItemDuration);
        playlistItemDataContainer.appendChild(playlistItemBehaviour);
        playlistItemDataContainer.appendChild(playlistItemMeta);
        
        const playlistItemTimersContainer = document.createElement('div'); //3C
        playlistItemTimersContainer.classList.add('playlist-item-timers-container');
        
        const playlistItemTimersTRT = document.createElement('div'); //5A
        playlistItemTimersTRT.classList.add('playlist-item-trt');
        playlistItemTimersTRT.textContent = trt;
        
        const playlistItemTimersT1 = document.createElement('div'); //5B
        playlistItemTimersT1.classList.add('playlist-item-timer');
        const t1Span = document.createElement('span');
        t1Span.textContent = 'T1';
        const t1timecode = document.createTextNode(t1);
        playlistItemTimersT1.appendChild(t1Span);
        playlistItemTimersT1.appendChild(t1timecode);
        
        const playlistItemTimersT2 = document.createElement('div'); //5C
        playlistItemTimersT2.classList.add('playlist-item-timer');
        const t2Span = document.createElement('span');
        t2Span.textContent = 'T2';
        const t2timecode = document.createTextNode(t2);
        playlistItemTimersT2.appendChild(t2Span);
        playlistItemTimersT2.appendChild(t2timecode);
        
        playlistItemTimersContainer.appendChild(playlistItemTimersTRT);
        playlistItemTimersContainer.appendChild(playlistItemTimersT1);
        playlistItemTimersContainer.appendChild(playlistItemTimersT2);
        
        const playlistGoButton = document.createElement('button'); //5C
        playlistGoButton.classList.add('button', 'playlist-go');
        playlistGoButton.textContent = 'Load';
        playlistGoButton.onclick = () => loadClipByCleanName(clip.cleanName);
        
        playlistItemContent.appendChild(playlistItemTitle);
        playlistItemContent.appendChild(playlistItemDataContainer);
        playlistItemContent.appendChild(playlistItemTimersContainer);
        
        playlistItemContainer.appendChild(playlistItemContent);
        playlistItemContainer.appendChild(playlistGoButton);
        
        playlistContainer.appendChild(playlistItemContainer);
    });
};