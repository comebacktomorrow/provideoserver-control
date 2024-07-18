import { jsonTimecodeToString } from './utils.js';

export const updatePlaylistDOM = playlist => {
    const playlistContainer = document.getElementById('playlist');
    playlistContainer.innerHTML = ''; // Clear existing playlist

    playlist.forEach(clip => {
        //not implimented
    });
};

export const setSelectedClip = clipIndex => {
    const playlist = document.getElementById('playlist');
    const playlistItems = playlist.getElementsByClassName('playlist-item');
    for (let plItem of playlistItems) {
        plItem.classList.remove('selected');
    }
    let selectedClip = playlist.querySelector(`#playlist-item-${clipIndex}`);
    if (selectedClip) {
        selectedClip.classList.add('selected');
    }
};