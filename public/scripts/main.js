import { setupWebSocket } from './websocket.js';
import { addEventListeners } from './transportControls.js';
import { fetchPlaylistData, updatePlaylistDOM } from './playlist.js';

const init = () => {
    setupWebSocket();
    addEventListeners();
    fetchPlaylistData().then(updatePlaylistDOM);
};

document.addEventListener('DOMContentLoaded', init);