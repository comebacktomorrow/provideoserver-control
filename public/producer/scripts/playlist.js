import { jsonTimecodeToString } from './utils.js';

let playlistData = [];

export const fetchPlaylistData = () => {
    // Fetch playlist data and update playlistData
    return fetch('/API/PVS/playlist')
        .then(response => response.json())
        .then(data => {
            playlistData = data; // Update playlistData with fetched data
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
};

export const setSelectedClip = clipIndex => {
    return clipIndex; // Return the selected clip index
};

export const loadClipByCleanName = cleanName => {
    return fetch(`/API/PVS/timeline/active/clean-name/${encodeURIComponent(cleanName)}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => data.message)
        .catch(error => { throw new Error('Error loading clip: ' + error); });
};