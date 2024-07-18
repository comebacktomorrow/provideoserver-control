import { setupWebSocket } from './websocket.js';
import { fetchPlaylistData } from './playlist.js';

const init = () => {
    setupWebSocket();
    fetchPlaylistData();
};

document.addEventListener('DOMContentLoaded', init);