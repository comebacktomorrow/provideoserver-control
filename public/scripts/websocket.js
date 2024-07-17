import { updateStatus } from './uiUpdates.js';

export const setupWebSocket = () => {
    const socket = new WebSocket(window.location.protocol === 'https:' ? 'wss://' : 'ws://' + window.location.host);

    socket.addEventListener('open', () => console.log('WebSocket connection established.'));
    socket.addEventListener('message', event => updateStatus(JSON.parse(event.data)));
    socket.addEventListener('close', () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(setupWebSocket, 1000);
    });
    socket.addEventListener('error', error => console.error('WebSocket error:', error));
};